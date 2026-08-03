/** Server-only helpers for POS server functions (never imported by components). */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getGateSession } from "@/lib/session.server";

export type Role = "admin" | "kasir";
type Db = SupabaseClient<Database>;

export async function requireStaff() {
  const session = await getGateSession();
  if (!session.data.staffId || !session.data.role) throw new Error("Belum login");
  return { id: session.data.staffId, name: session.data.name ?? "", role: session.data.role as Role };
}

export async function requireAdmin() {
  const staff = await requireStaff();
  if (staff.role !== "admin") throw new Error("Akses ditolak: hanya Admin");
  return staff;
}

export async function admin(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

/** Current date in Asia/Jakarta (UTC+7) as YYYY-MM-DD. */
export function today(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

/** Product images live in a private bucket; hand out short-lived signed URLs. */
export async function signImages<T extends { image_url: string | null }>(db: Db, rows: T[]): Promise<T[]> {
  const paths = rows
    .map((r) => r.image_url)
    .filter((p): p is string => typeof p === "string" && p.length > 0 && !p.startsWith("http"));
  if (paths.length === 0) return rows;
  const { data } = await db.storage.from("product-images").createSignedUrls(paths, 60 * 60 * 6);
  const map = new Map<string, string>();
  for (const item of data ?? []) if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  return rows.map((r) =>
    r.image_url && map.has(r.image_url) ? { ...r, image_url: map.get(r.image_url)! } : r,
  );
}

export async function buildReceipt(transactionId: string) {
  const db = await admin();
  const [{ data: txn }, { data: items }, { data: queue }, { data: settings }] = await Promise.all([
    db.from("transactions").select("*").eq("id", transactionId).single(),
    db.from("transaction_items").select("*").eq("transaction_id", transactionId),
    db.from("queues").select("queue_number").eq("transaction_id", transactionId).maybeSingle(),
    db
      .from("store_settings")
      .select("store_name, address, phone, receipt_footer, receipt_paper, logo_url")
      .limit(1)
      .maybeSingle(),
  ]);
  if (!txn) throw new Error("Transaksi tidak ditemukan");
  return {
    transaction_id: txn.id,
    transaction_number: txn.transaction_number,
    queue_number: queue?.queue_number ?? 0,
    cashier_name: txn.cashier_name,
    customer_name: txn.customer_name,
    order_type: txn.order_type,
    created_at: txn.created_at,
    subtotal: Number(txn.subtotal),
    discount: Number(txn.discount),
    grand_total: Number(txn.grand_total),
    amount_paid: Number(txn.amount_paid),
    change_amount: Number(txn.change_amount),
    payment_method: txn.payment_method,
    notes: txn.notes,
    items: (items ?? []).map((it) => ({
      name: it.product_name_snapshot,
      quantity: it.quantity,
      price: Number(it.product_price_snapshot),
      subtotal: Number(it.subtotal),
      notes: it.notes,
    })),
    store: settings ?? null,
  };
}

export type Receipt = Awaited<ReturnType<typeof buildReceipt>>;

export async function fetchPaidTransactions(from: string, to: string) {
  const db = await admin();
  const { data } = await db
    .from("transactions")
    .select(
      "id, created_at, cashier_id, cashier_name, payment_method, subtotal, discount, grand_total, refund_amount, transaction_items(product_name_snapshot, quantity, subtotal, product_id)",
    )
    .eq("transaction_status", "completed")
    .eq("payment_status", "paid")
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at");
  return data ?? [];
}
