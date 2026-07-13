import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function requireStaff() {
  const { getGateSession } = await import("@/lib/session.server");
  const session = await getGateSession();
  if (!session.data.staffId) throw new Error("Belum login");
  return {
    id: session.data.staffId!,
    name: session.data.name!,
    role: session.data.role!,
  };
}

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [catsRes, prodsRes] = await Promise.all([
    supabaseAdmin.from("categories").select("*").order("sort_order"),
    supabaseAdmin.from("products").select("*").eq("is_active", true).order("name"),
  ]);
  return {
    categories: catsRes.data ?? [],
    products: prodsRes.data ?? [],
  };
});

const CartItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  price: z.number(),
  qty: z.number().int().positive(),
  note: z.string().optional().nullable(),
});

const CheckoutSchema = z.object({
  items: z.array(CartItemSchema).min(1),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  paid: z.number().min(0),
  payment_method: z.enum(["tunai", "qris", "transfer", "ewallet", "debit", "lainnya"]),
  note: z.string().optional().nullable(),
});

export const checkout = createServerFn({ method: "POST" })
  .inputValidator((d) => CheckoutSchema.parse(d))
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const subtotal = data.items.reduce((s, it) => s + it.price * it.qty, 0);
    const total = Math.max(0, subtotal - data.discount + data.tax);
    if (data.paid < total) throw new Error("Uang diterima kurang dari total");
    const change = data.paid - total;

    // Compute queue_no for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await supabaseAdmin
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString());
    const queueNo = (count ?? 0) + 1;
    const invoiceNo = `INV-${startOfDay.getFullYear()}${String(startOfDay.getMonth() + 1).padStart(2, "0")}${String(startOfDay.getDate()).padStart(2, "0")}-${String(queueNo).padStart(4, "0")}`;

    const { data: txn, error: txnErr } = await supabaseAdmin
      .from("transactions")
      .insert({
        invoice_no: invoiceNo,
        queue_no: queueNo,
        cashier_id: staff.id,
        cashier_name: staff.name,
        subtotal,
        discount: data.discount,
        tax: data.tax,
        total,
        paid: data.paid,
        change_amount: change,
        payment_method: data.payment_method,
        note: data.note ?? null,
        order_status: "menunggu",
      })
      .select()
      .single();
    if (txnErr || !txn) throw new Error(txnErr?.message || "Gagal membuat transaksi");

    const items = data.items.map((it) => ({
      transaction_id: txn.id,
      product_id: it.product_id,
      product_name: it.product_name,
      price: it.price,
      qty: it.qty,
      subtotal: it.price * it.qty,
      note: it.note ?? null,
    }));
    const { error: itemsErr } = await supabaseAdmin.from("transaction_items").insert(items);
    if (itemsErr) throw new Error(itemsErr.message);

    // Decrement stock (best effort, non-atomic)
    for (const it of data.items) {
      const { data: prod } = await supabaseAdmin
        .from("products")
        .select("stock")
        .eq("id", it.product_id)
        .maybeSingle();
      if (prod) {
        await supabaseAdmin
          .from("products")
          .update({ stock: Math.max(0, prod.stock - it.qty) })
          .eq("id", it.product_id);
      }
    }

    return { transaction: txn, items };
  });

export const listTransactions = createServerFn({ method: "GET" }).handler(async () => {
  await requireStaff();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("transactions")
    .select("*, transaction_items(*)")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
});

const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  category_id: z.string().uuid().nullable(),
  is_active: z.boolean().default(true),
  image_url: z.string().url().nullable().optional(),
});

export const upsertProduct = createServerFn({ method: "POST" })
  .inputValidator((d) => ProductSchema.parse(d))
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    if (staff.role !== "admin") throw new Error("Hanya admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("products")
        .update({
          name: data.name,
          price: data.price,
          stock: data.stock,
          category_id: data.category_id,
          is_active: data.is_active,
          image_url: data.image_url ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await supabaseAdmin.from("products").insert({
      name: data.name,
      price: data.price,
      stock: data.stock,
      category_id: data.category_id,
      is_active: data.is_active,
      image_url: data.image_url ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    if (staff.role !== "admin") throw new Error("Hanya admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
