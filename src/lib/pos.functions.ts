import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  admin,
  buildReceipt,
  fetchPaidTransactions,
  requireAdmin,
  requireStaff,
  signImages,
  today,
} from "@/lib/pos.server";

/* ------------------------------- CATALOG ------------------------------- */

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const db = await admin();
  const [cats, prods] = await Promise.all([
    db.from("categories").select("*").eq("is_active", true).order("sort_order"),
    db.from("products").select("*").eq("is_active", true).order("name"),
  ]);
  return { categories: cats.data ?? [], products: await signImages(db, prods.data ?? []) };
});

/* ------------------------------ CHECKOUT ------------------------------- */

const CheckoutSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive(),
        notes: z.string().max(200).optional().nullable(),
      }),
    )
    .min(1),
  customer_name: z.string().max(80).optional().nullable(),
  order_type: z.enum(["dine_in", "take_away"]).default("dine_in"),
  discount: z.number().min(0).default(0),
  payment_method: z.enum(["tunai", "qris", "transfer", "ewallet", "lainnya"]),
  amount_paid: z.number().min(0),
  notes: z.string().max(300).optional().nullable(),
});

export const checkout = createServerFn({ method: "POST" })
  .inputValidator((d) => CheckoutSchema.parse(d))
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const db = await admin();
    const { data: result, error } = await db.rpc("create_pos_transaction", {
      _cashier_id: staff.id,
      _customer_name: data.customer_name ?? "",
      _order_type: data.order_type,
      _discount: data.discount,
      _payment_method: data.payment_method,
      _amount_paid: data.amount_paid,
      _notes: data.notes ?? "",
      _items: data.items,
    });
    if (error) throw new Error(error.message.replace(/^.*ERROR:\s*/i, ""));
    const out = result as unknown as { transaction_id: string; queue_number: number };
    const receipt = await buildReceipt(out.transaction_id);
    return receipt;
  });

export const getReceipt = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ transaction_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireStaff();
    return buildReceipt(data.transaction_id);
  });

/* --------------------------- ACTIVE ORDERS ---------------------------- */

export const listActiveOrders = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const db = await admin();
  const { data } = await db
    .from("queues")
    .select(
      "id, queue_number, status, customer_name, created_at, started_at, completed_at, transaction_id, transactions(transaction_number, grand_total, order_type, payment_method, notes, cashier_name, transaction_items(product_name_snapshot, quantity, notes))",
    )
    .eq("queue_date", today())
    .in("status", ["baru", "diproses", "selesai"])
    .order("queue_number");
  return data ?? [];
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        queue_id: z.string().uuid(),
        status: z.enum(["diproses", "selesai", "diambil", "dibatalkan"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireStaff();
    const db = await admin();
    const stamp: Record<string, string> = {};
    if (data.status === "diproses") stamp.started_at = new Date().toISOString();
    if (data.status === "selesai") stamp.completed_at = new Date().toISOString();
    if (data.status === "diambil") stamp.collected_at = new Date().toISOString();
    const { error } = await db.from("queues").update({ status: data.status, ...stamp }).eq("id", data.queue_id);
    if (error) throw new Error(error.message);
    if (data.status === "dibatalkan") {
      const { data: q } = await db.from("queues").select("transaction_id").eq("id", data.queue_id).maybeSingle();
      if (q) {
        await db
          .from("transactions")
          .update({ transaction_status: "cancelled", payment_status: "refunded" })
          .eq("id", q.transaction_id);
      }
    }
    return { ok: true };
  });

/* ----------------------------- TRANSACTIONS ---------------------------- */

export const listTransactions = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ from: z.string().optional(), to: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    let q = db
      .from("transactions")
      .select("*, transaction_items(*), queues(queue_number, status)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows } = await q;
    return rows ?? [];
  });

/** Kasir: only their own transactions from the current day. */
export const listMyRecentTransactions = createServerFn({ method: "GET" }).handler(async () => {
  const staff = await requireStaff();
  const db = await admin();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data } = await db
    .from("transactions")
    .select("id, transaction_number, grand_total, payment_method, created_at, customer_name, queues(queue_number, status)")
    .eq("cashier_id", staff.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
});

/* ------------------------------- PRODUCTS ------------------------------ */

const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  category_id: z.string().uuid().nullable(),
  selling_price: z.number().min(0),
  cost_price: z.number().min(0).default(0),
  minimum_stock: z.number().int().min(0).default(5),
  unit: z.string().min(1).max(20).default("pcs"),
  sku: z.string().max(50).nullable().optional(),
  barcode: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  image_url: z.string().max(300).nullable().optional(),
  is_available: z.boolean().default(true),
  is_active: z.boolean().default(true),
  initial_stock: z.number().int().min(0).optional(),
});

export const upsertProduct = createServerFn({ method: "POST" })
  .inputValidator((d) => ProductSchema.parse(d))
  .handler(async ({ data }) => {
    const staff = await requireAdmin();
    const db = await admin();
    const payload = {
      name: data.name.trim(),
      category_id: data.category_id,
      selling_price: data.selling_price,
      cost_price: data.cost_price,
      minimum_stock: data.minimum_stock,
      unit: data.unit,
      sku: data.sku || null,
      barcode: data.barcode || null,
      description: data.description || null,
      image_url: data.image_url ?? null,
      is_available: data.is_available,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await db.from("products").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: created, error } = await db.from("products").insert({ ...payload, stock: 0 }).select("id").single();
    if (error || !created) throw new Error(error?.message || "Gagal menyimpan produk");
    if (data.initial_stock && data.initial_stock > 0) {
      await db.rpc("adjust_stock", {
        _product_id: created.id,
        _movement_type: "masuk",
        _quantity: data.initial_stock,
        _reason: "Stok awal produk baru",
        _staff_id: staff.id,
        _cost_price: data.cost_price || undefined,
        _supplier: undefined,
        _absolute: false,
      });
    }
    return { ok: true, id: created.id };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw new Error("Produk sudah pernah terjual sehingga tidak dapat dihapus. Nonaktifkan produk saja.");
    return { ok: true };
  });

export const uploadProductImage = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        file_base64: z.string().min(10),
        content_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const bytes = Buffer.from(data.file_base64, "base64");
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Ukuran foto melebihi 5 MB");
    const ext = data.content_type === "image/png" ? "png" : data.content_type === "image/webp" ? "webp" : "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from("product-images").upload(path, bytes, {
      contentType: data.content_type,
      upsert: true,
    });
    if (error) throw new Error(error.message);
    return { path };
  });

export const removeProductImage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ path: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    await db.storage.from("product-images").remove([data.path]);
    return { ok: true };
  });

/* ------------------------------ CATEGORIES ----------------------------- */

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const db = await admin();
  const { data } = await db.from("categories").select("*").order("sort_order");
  return data ?? [];
});

export const upsertCategory = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(60),
        sort_order: z.number().int().min(0).default(0),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const payload = { name: data.name.trim(), sort_order: data.sort_order, is_active: data.is_active };
    const { error } = data.id
      ? await db.from("categories").update(payload).eq("id", data.id)
      : await db.from("categories").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const { count } = await db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", data.id);
    if ((count ?? 0) > 0) throw new Error("Kategori masih dipakai produk. Pindahkan produk terlebih dahulu.");
    const { error } = await db.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- STOCK ------------------------------- */

export const listStock = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = await admin();
  const [prods, cats] = await Promise.all([
    db.from("products").select("*").order("name"),
    db.from("categories").select("id, name").order("sort_order"),
  ]);
  return { products: await signImages(db, prods.data ?? []), categories: cats.data ?? [] };
});

export const changeStock = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        product_id: z.string().uuid(),
        mode: z.enum(["masuk", "keluar", "sesuaikan"]),
        quantity: z.number().int().min(0),
        reason: z.string().max(200).optional().nullable(),
        movement_type: z.enum(["masuk", "penyesuaian", "rusak", "koreksi", "retur"]).optional(),
        cost_price: z.number().min(0).optional().nullable(),
        supplier: z.string().max(120).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const staff = await requireAdmin();
    const db = await admin();
    const type =
      data.mode === "masuk" ? "masuk" : data.mode === "sesuaikan" ? "penyesuaian" : (data.movement_type ?? "rusak");
    const qty = data.mode === "keluar" ? -Math.abs(data.quantity) : data.quantity;
    const { data: result, error } = await db.rpc("adjust_stock", {
      _product_id: data.product_id,
      _movement_type: type,
      _quantity: qty,
      _reason: data.reason ?? "",
      _staff_id: staff.id,
      _cost_price: data.cost_price ?? undefined,
      _supplier: data.supplier ?? undefined,
      _absolute: data.mode === "sesuaikan",
    });
    if (error) throw new Error(error.message.replace(/^.*ERROR:\s*/i, ""));
    return result as unknown as { stock_before: number; stock_change: number; stock_after: number };
  });

export const listStockMovements = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ product_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    let q = db
      .from("stock_movements")
      .select("*, products(name, unit)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.product_id) q = q.eq("product_id", data.product_id);
    const { data: rows } = await q;
    return rows ?? [];
  });

/* --------------------------------- OMZET ------------------------------- */

const RangeSchema = z.object({
  from: z.string(),
  to: z.string(),
  cashier_id: z.string().uuid().optional().nullable(),
  payment_method: z.string().optional().nullable(),
});

export const omzetReport = createServerFn({ method: "GET" })
  .inputValidator((d) => RangeSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const spanMs = new Date(data.to).getTime() - new Date(data.from).getTime();
    const prevFrom = new Date(new Date(data.from).getTime() - spanMs - 1).toISOString();
    const prevTo = new Date(new Date(data.from).getTime() - 1).toISOString();

    const filter = (rows: Awaited<ReturnType<typeof fetchPaidTransactions>>) =>
      rows.filter(
        (t) =>
          (!data.cashier_id || t.cashier_id === data.cashier_id) &&
          (!data.payment_method || t.payment_method === data.payment_method),
      );

    const [currentRaw, previousRaw] = await Promise.all([
      fetchPaidTransactions(data.from, data.to),
      fetchPaidTransactions(prevFrom, prevTo),
    ]);
    const current = filter(currentRaw);
    const previous = filter(previousRaw);

    const sum = (rows: typeof current) => rows.reduce((s, t) => s + Number(t.grand_total) - Number(t.refund_amount), 0);
    const net = sum(current);
    const prevNet = sum(previous);
    const gross = current.reduce((s, t) => s + Number(t.subtotal), 0);
    const discount = current.reduce((s, t) => s + Number(t.discount), 0);
    const refund = current.reduce((s, t) => s + Number(t.refund_amount), 0);
    const itemsSold = current.reduce(
      (s, t) => s + (t.transaction_items ?? []).reduce((n, it) => n + it.quantity, 0),
      0,
    );

    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const t of current) {
      for (const it of t.transaction_items ?? []) {
        const key = it.product_name_snapshot;
        const prev = productMap.get(key) ?? { name: key, quantity: 0, revenue: 0 };
        prev.quantity += it.quantity;
        prev.revenue += Number(it.subtotal);
        productMap.set(key, prev);
      }
    }
    const methodMap = new Map<string, { method: string; count: number; amount: number }>();
    for (const t of current) {
      const prev = methodMap.get(t.payment_method) ?? { method: t.payment_method, count: 0, amount: 0 };
      prev.count += 1;
      prev.amount += Number(t.grand_total) - Number(t.refund_amount);
      methodMap.set(t.payment_method, prev);
    }

    const dayMap = new Map<string, { date: string; count: number; items: number; gross: number; discount: number; refund: number; net: number; cash: number; noncash: number }>();
    for (const t of current) {
      const key = new Date(new Date(t.created_at).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
      const row =
        dayMap.get(key) ?? { date: key, count: 0, items: 0, gross: 0, discount: 0, refund: 0, net: 0, cash: 0, noncash: 0 };
      row.count += 1;
      row.items += (t.transaction_items ?? []).reduce((n, it) => n + it.quantity, 0);
      row.gross += Number(t.subtotal);
      row.discount += Number(t.discount);
      row.refund += Number(t.refund_amount);
      const value = Number(t.grand_total) - Number(t.refund_amount);
      row.net += value;
      if (t.payment_method === "tunai") row.cash += value;
      else row.noncash += value;
      dayMap.set(key, row);
    }

    const hourMap = new Map<number, number>();
    for (const t of current) {
      const h = new Date(new Date(t.created_at).getTime() + 7 * 3600_000).getUTCHours();
      hourMap.set(h, (hourMap.get(h) ?? 0) + Number(t.grand_total) - Number(t.refund_amount));
    }

    return {
      net,
      gross,
      discount,
      refund,
      count: current.length,
      itemsSold,
      average: current.length ? net / current.length : 0,
      previousNet: prevNet,
      topProducts: [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8),
      methods: [...methodMap.values()].sort((a, b) => b.amount - a.amount),
      daily: [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
      hourly: Array.from({ length: 24 }, (_, h) => ({ hour: h, net: hourMap.get(h) ?? 0 })),
    };
  });

export const listCashiers = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = await admin();
  const { data } = await db.from("staff").select("id, name, role, is_active, created_at").order("name");
  return data ?? [];
});

/* ------------------------------- DASHBOARD ----------------------------- */

export const dashboardSummary = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = await admin();
  const startToday = new Date(`${today()}T00:00:00+07:00`).toISOString();
  const since7 = new Date(new Date(startToday).getTime() - 6 * 86400_000).toISOString();

  const [{ data: txns }, { data: products }, { data: queues }] = await Promise.all([
    db
      .from("transactions")
      .select("id, created_at, grand_total, refund_amount, transaction_items(quantity, product_name_snapshot)")
      .eq("transaction_status", "completed")
      .eq("payment_status", "paid")
      .gte("created_at", since7),
    db.from("products").select("id, name, stock, minimum_stock, is_active").eq("is_active", true),
    db.from("queues").select("status").eq("queue_date", today()),
  ]);

  const all = txns ?? [];
  const todayTxns = all.filter((t) => t.created_at >= startToday);
  const value = (t: (typeof all)[number]) => Number(t.grand_total) - Number(t.refund_amount);

  const productMap = new Map<string, number>();
  for (const t of todayTxns)
    for (const it of t.transaction_items ?? [])
      productMap.set(it.product_name_snapshot, (productMap.get(it.product_name_snapshot) ?? 0) + it.quantity);

  const dayMap = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(new Date(startToday).getTime() - i * 86400_000);
    dayMap.set(new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10), 0);
  }
  for (const t of all) {
    const key = new Date(new Date(t.created_at).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + value(t));
  }

  const prods = products ?? [];
  return {
    omzetToday: todayTxns.reduce((s, t) => s + value(t), 0),
    countToday: todayTxns.length,
    itemsToday: todayTxns.reduce((s, t) => s + (t.transaction_items ?? []).reduce((n, it) => n + it.quantity, 0), 0),
    processing: (queues ?? []).filter((q) => q.status === "diproses").length,
    completed: (queues ?? []).filter((q) => q.status === "selesai").length,
    lowStock: prods.filter((p) => p.stock > 0 && p.stock <= p.minimum_stock).map((p) => ({ id: p.id, name: p.name, stock: p.stock })),
    outOfStock: prods.filter((p) => p.stock <= 0).map((p) => ({ id: p.id, name: p.name })),
    productCount: prods.length,
    topProducts: [...productMap.entries()].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5),
    chart: [...dayMap.entries()].map(([date, net]) => ({ date, net })),
  };
});

/* ------------------------------- SETTINGS ------------------------------ */

export const getStoreSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const db = await admin();
  const { data } = await db.from("store_settings").select("*").limit(1).maybeSingle();
  return data;
});

export const updateStoreSettings = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        store_name: z.string().min(1).max(80),
        address: z.string().max(200).nullable().optional(),
        phone: z.string().max(40).nullable().optional(),
        receipt_footer: z.string().max(300),
        receipt_paper: z.enum(["58mm", "80mm"]),
        display_header: z.string().max(80),
        display_footer: z.string().max(200),
        display_pin: z.string().min(4).max(10),
        queue_reset_mode: z.enum(["harian", "manual"]),
        sound_enabled: z.boolean(),
        sound_volume: z.number().min(0).max(1),
        completed_display_duration: z.number().int().min(10).max(3600),
        max_display_items: z.number().int().min(3).max(20),
        show_customer_name: z.boolean(),
        show_clock: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const { data: existing } = await db.from("store_settings").select("id").limit(1).maybeSingle();
    if (!existing) throw new Error("Pengaturan tidak ditemukan");
    const { error } = await db.from("store_settings").update(data).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetQueueNumbers = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdmin();
  const db = await admin();
  const { error } = await db
    .from("queues")
    .update({ status: "diambil", collected_at: new Date().toISOString() })
    .eq("queue_date", today())
    .in("status", ["baru", "diproses", "selesai"]);
  if (error) throw new Error(error.message);
  return { ok: true };
});

/* --------------------------------- STAFF ------------------------------- */

export const upsertStaff = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(80),
        pin: z.string().regex(/^\d{4,8}$/, "PIN harus 4-8 angka"),
        role: z.enum(["admin", "kasir"]),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const { data: clash } = await db.from("staff").select("id").eq("pin", data.pin).maybeSingle();
    if (clash && clash.id !== data.id) throw new Error("PIN sudah dipakai pengguna lain");
    const payload = { name: data.name.trim(), pin: data.pin, role: data.role, is_active: data.is_active };
    const { error } = data.id
      ? await db.from("staff").update(payload).eq("id", data.id)
      : await db.from("staff").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireAdmin();
    if (me.id === data.id) throw new Error("Tidak dapat menghapus akun yang sedang dipakai");
    const db = await admin();
    const { error } = await db.from("staff").update({ is_active: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
