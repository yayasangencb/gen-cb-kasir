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
  const staff = await requireStaff();
  const db = await admin();
  const [cats, prods] = await Promise.all([
    db.from("categories").select("*").eq("tenant_id", staff.tenantId).eq("is_active", true).order("sort_order"),
    db.from("products").select("*").eq("tenant_id", staff.tenantId).eq("is_active", true).order("name"),
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
    const { data: result, error } = await db.rpc("create_pos_transaction_tenant", {
      _tenant_id: staff.tenantId,
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
  const staff = await requireStaff();
  const db = await admin();
  const { data } = await db
    .from("queues")
    .select(
      "id, queue_number, status, customer_name, created_at, started_at, completed_at, transaction_id, transactions(transaction_number, grand_total, order_type, payment_method, notes, cashier_name, transaction_items(product_name_snapshot, quantity, notes))",
    )
    .eq("tenant_id", staff.tenantId)
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
    const staff = await requireStaff();
    const db = await admin();
    const stamp: Record<string, string> = {};
    if (data.status === "diproses") stamp.started_at = new Date().toISOString();
    if (data.status === "selesai") stamp.completed_at = new Date().toISOString();
    if (data.status === "diambil") stamp.collected_at = new Date().toISOString();

    const { error } = await db
      .from("queues")
      .update({ status: data.status, ...stamp })
      .eq("id", data.queue_id)
      .eq("tenant_id", staff.tenantId);

    if (error) throw new Error(error.message);

    if (data.status === "dibatalkan") {
      const { data: q } = await db.from("queues").select("transaction_id").eq("id", data.queue_id).maybeSingle();
      if (q) {
        await db
          .from("transactions")
          .update({ transaction_status: "cancelled", payment_status: "refunded" })
          .eq("id", q.transaction_id)
          .eq("tenant_id", staff.tenantId);
      }
    }
    return { ok: true };
  });

export const resetQueueNumbers = createServerFn({ method: "POST" }).handler(async () => {
  const staff = await requireAdmin();
  const db = await admin();
  await db.from("queues").delete().eq("tenant_id", staff.tenantId).eq("queue_date", today());
  return { ok: true };
});

/* ----------------------------- TRANSACTIONS ---------------------------- */

export const listTransactions = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ from: z.string().optional(), to: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const staff = await requireAdmin();
    const db = await admin();
    let q = db
      .from("transactions")
      .select("*, transaction_items(*), queues(queue_number, status)")
      .eq("tenant_id", staff.tenantId)
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
    .eq("tenant_id", staff.tenantId)
    .eq("cashier_id", staff.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
});

/* ------------------------------- PRODUCTS ------------------------------ */

const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  category_id: z.string().uuid().nullable(),
  selling_price: z.number().min(0),
  cost_price: z.number().min(0).default(0),
  minimum_stock: z.number().int().min(0).default(5),
  unit: z.string().min(1).max(50).default("pcs"),
  sku: z.string().max(100).nullable().optional(),
  barcode: z.string().max(100).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  image_url: z.string().nullable().optional(),
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
      tenant_id: staff.tenantId,
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
      const { error } = await db.from("products").update(payload).eq("id", data.id).eq("tenant_id", staff.tenantId);
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
    const staff = await requireAdmin();
    const db = await admin();
    const { error } = await db.from("products").delete().eq("id", data.id).eq("tenant_id", staff.tenantId);
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
    const staff = await requireAdmin();
    const db = await admin();
    const bytes = Buffer.from(data.file_base64, "base64");
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Ukuran foto melebihi 5 MB");
    const ext = data.content_type === "image/png" ? "png" : data.content_type === "image/webp" ? "webp" : "jpg";
    const path = `${staff.tenantId}/${crypto.randomUUID()}.${ext}`;
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
  const staff = await requireStaff();
  const db = await admin();
  const { data } = await db.from("categories").select("*").eq("tenant_id", staff.tenantId).order("sort_order");
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
    const staff = await requireAdmin();
    const db = await admin();
    const payload = { tenant_id: staff.tenantId, name: data.name.trim(), sort_order: data.sort_order, is_active: data.is_active };
    const { error } = data.id
      ? await db.from("categories").update(payload).eq("id", data.id).eq("tenant_id", staff.tenantId)
      : await db.from("categories").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const staff = await requireAdmin();
    const db = await admin();
    const { count } = await db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", staff.tenantId)
      .eq("category_id", data.id);
    if ((count ?? 0) > 0) throw new Error("Kategori masih dipakai produk. Pindahkan produk terlebih dahulu.");
    const { error } = await db.from("categories").delete().eq("id", data.id).eq("tenant_id", staff.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------- STAFF / USERS ------------------------ */

export const listCashiers = createServerFn({ method: "GET" }).handler(async () => {
  const staff = await requireAdmin();
  const db = await admin();
  const { data } = await db
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", staff.tenantId)
    .order("name");
  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    pin: m.encrypted_pin || m.pin_hash || "••••",
    role: m.role === "tenant_admin" ? ("admin" as const) : ("kasir" as const),
    is_active: m.is_active,
  }));
});

export const upsertStaff = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        pin: z.string().min(4).max(8),
        role: z.enum(["admin", "kasir"]),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const staff = await requireAdmin();
    const db = await admin();
    const roleMap = data.role === "admin" ? "tenant_admin" : "cashier";
    const payload = {
      tenant_id: staff.tenantId,
      name: data.name.trim(),
      pin_hash: data.pin,
      encrypted_pin: data.pin,
      role: roleMap,
      is_active: data.is_active,
    };
    const { error } = data.id
      ? await db.from("tenant_members").update(payload).eq("id", data.id).eq("tenant_id", staff.tenantId)
      : await db.from("tenant_members").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const staff = await requireAdmin();
    const db = await admin();
    const { error } = await db
      .from("tenant_members")
      .update({ is_active: false })
      .eq("id", data.id)
      .eq("tenant_id", staff.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------- STOCK -------------------------------- */

export const listStock = createServerFn({ method: "GET" }).handler(async () => {
  const staff = await requireAdmin();
  const db = await admin();
  const { data } = await db.from("products").select("*").eq("tenant_id", staff.tenantId).order("name");
  return data ?? [];
});

export const postStockAdjustment = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        product_id: z.string().uuid(),
        movement_type: z.enum(["masuk", "penyesuaian", "rusak", "koreksi"]),
        quantity: z.number().int(),
        reason: z.string().max(300).optional(),
        cost_price: z.number().min(0).optional(),
        supplier: z.string().max(100).optional(),
        absolute: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const staff = await requireAdmin();
    const db = await admin();
    const { data: res, error } = await db.rpc("adjust_stock", {
      _product_id: data.product_id,
      _movement_type: data.movement_type,
      _quantity: data.quantity,
      _reason: data.reason ?? "",
      _staff_id: staff.id,
      _cost_price: data.cost_price,
      _supplier: data.supplier,
      _absolute: data.absolute,
    });
    if (error) throw new Error(error.message);
    return res;
  });

export const listStockMovements = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ product_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const staff = await requireAdmin();
    const db = await admin();
    let q = db
      .from("stock_movements")
      .select("*, products(name, unit)")
      .eq("tenant_id", staff.tenantId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.product_id) q = q.eq("product_id", data.product_id);
    const { data: rows } = await q;
    return rows ?? [];
  });

/* ------------------------------- REVENUE ------------------------------- */

export const fetchRevenueReport = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ from: z.string(), to: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const staff = await requireAdmin();
    const txns = await fetchPaidTransactions(data.from, data.to, staff.tenantId);
    let grossRevenue = 0;
    let netRevenue = 0;
    let totalDiscount = 0;

    const methodStats: Record<string, { count: number; total: number }> = {};
    const productStats: Record<string, { id: string; name: string; qty: number; total: number }> = {};

    for (const t of txns) {
      const g = Number(t.grand_total);
      const sub = Number(t.subtotal);
      const disc = Number(t.discount);

      grossRevenue += sub;
      netRevenue += g;
      totalDiscount += disc;

      const m = t.payment_method || "tunai";
      if (!methodStats[m]) methodStats[m] = { count: 0, total: 0 };
      methodStats[m].count += 1;
      methodStats[m].total += g;

      const items = (t as any).transaction_items ?? [];
      for (const it of items) {
        const pid = it.product_id || it.product_name_snapshot;
        if (!productStats[pid]) {
          productStats[pid] = { id: pid, name: it.product_name_snapshot, qty: 0, total: 0 };
        }
        productStats[pid].qty += Number(it.quantity);
        productStats[pid].total += Number(it.subtotal);
      }
    }

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return {
      transactionCount: txns.length,
      grossRevenue,
      netRevenue,
      totalDiscount,
      methodStats,
      topProducts,
      transactions: txns,
    };
  });

/* ------------------------------ DASHBOARD ------------------------------ */

export const fetchDashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  const staff = await requireAdmin();
  const db = await admin();
  const todayStr = today();

  const [{ data: txnsToday }, { data: lowStock }, { data: activeQueues }] = await Promise.all([
    db
      .from("transactions")
      .select("grand_total")
      .eq("tenant_id", staff.tenantId)
      .eq("payment_status", "paid")
      .gte("created_at", todayStr),
    db
      .from("products")
      .select("id, name, stock, minimum_stock, unit")
      .eq("tenant_id", staff.tenantId)
      .eq("is_active", true),
    db
      .from("queues")
      .select("id")
      .eq("tenant_id", staff.tenantId)
      .eq("queue_date", todayStr)
      .in("status", ["baru", "diproses"]),
  ]);

  const omzetHariIni = (txnsToday ?? []).reduce((acc, t) => acc + Number(t.grand_total), 0);
  const transaksiHariIni = txnsToday?.length ?? 0;
  const stokMenipis = (lowStock ?? []).filter((p) => p.stock <= p.minimum_stock);

  return {
    omzetHariIni,
    transaksiHariIni,
    stokMenipisCount: stokMenipis.length,
    stokMenipisList: stokMenipis,
    activeQueuesCount: activeQueues?.length ?? 0,
  };
});

/* ---------------------------- STORE SETTINGS --------------------------- */

export const getStoreSettings = createServerFn({ method: "GET" }).handler(async () => {
  const staff = await requireStaff();
  const db = await admin();
  const { data } = await db.from("store_settings").select("*").eq("tenant_id", staff.tenantId).limit(1).maybeSingle();
  return data ?? null;
});

export const updateStoreSettings = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        store_name: z.string().min(1).max(100),
        address: z.string().max(300).nullable().optional(),
        phone: z.string().max(50).nullable().optional(),
        receipt_footer: z.string().max(300),
        display_header: z.string().max(100),
        display_footer: z.string().max(300),
        queue_reset_mode: z.enum(["harian", "manual"]).default("harian"),
        display_pin: z.string().min(4).max(10).default("9999"),
        sound_enabled: z.boolean().default(true),
        sound_volume: z.number().min(0).max(1).default(1),
        completed_display_duration: z.number().int().min(10).default(300),
        max_display_items: z.number().int().min(1).max(30).default(10),
        show_customer_name: z.boolean().default(true),
        show_clock: z.boolean().default(true),
        receipt_paper: z.enum(["58mm", "80mm"]).default("80mm"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const staff = await requireAdmin();
    const db = await admin();
    const { data: existing } = await db.from("store_settings").select("id").eq("tenant_id", staff.tenantId).limit(1).maybeSingle();
    const payload = { ...data, tenant_id: staff.tenantId };
    const { error } = existing
      ? await db.from("store_settings").update(payload).eq("id", existing.id)
      : await db.from("store_settings").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------ EXPORT ALIASES FOR BACKWARD COMPAT ----------------- */
export const dashboardSummary = fetchDashboardStats;
export const changeStock = postStockAdjustment;
export const omzetReport = fetchRevenueReport;
