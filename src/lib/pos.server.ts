/** Server-only helpers for POS server functions (never imported by components). */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getGateSession, TenantRole } from "@/lib/session.server";

export type Role = "admin" | "kasir";
type Db = SupabaseClient<Database>;

export async function admin(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

export async function requireSuperAdminSession() {
  const session = await getGateSession();
  if (!session.data.isSuperAdmin) {
    throw new Error("Akses ditolak: Hanya Super Admin GEN-CB");
  }
  return { email: "yayasangencb@gmail.com", name: session.data.name || "Super Admin GEN-CB" };
}

export async function requireTenantSession() {
  const session = await getGateSession();
  if (!session.data.tenantId || !session.data.tenantRole) {
    throw new Error("Sesi login UKM Anda telah berakhir. Silakan login kembali dengan Kode Tenant & PIN.");
  }

  // Check tenant status in DB
  const db = await admin();
  const { data: tenant } = await db
    .from("tenants")
    .select("id, tenant_code, business_name, status, expired_at, is_deleted, primary_color, accent_color, qris_image_url")
    .eq("id", session.data.tenantId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (!tenant || tenant.status !== "active" || new Date(tenant.expired_at) < new Date()) {
    throw new Error("Masa aktif langganan UKM Anda telah berakhir. Silakan hubungi Super Admin GEN-CB untuk memperpanjang.");
  }

  return {
    tenantId: tenant.id,
    tenantCode: tenant.tenant_code,
    businessName: tenant.business_name,
    role: session.data.tenantRole as TenantRole,
    staffId: session.data.staffId || tenant.id,
    name: session.data.name || tenant.business_name,
    tenant,
  };
}

export async function requireTenantAdminSession() {
  const s = await requireTenantSession();
  if (s.role !== "tenant_admin") {
    throw new Error("Akses ditolak: Hanya Admin / Pemilik UKM yang dapat mengakses menu ini.");
  }
  return s;
}

/** Current date in Asia/Jakarta (UTC+7) as YYYY-MM-DD. */
export function today(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

/** Generate a 6-digit random numeric PIN string */
export function generateRandomPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Audit log helper for Super Admin actions */
export async function logAuditEvent(actorEmail: string, action: string, tenantId?: string, metadata: Record<string, any> = {}) {
  try {
    const db = await admin();
    await db.from("audit_logs").insert({
      actor_email: actorEmail,
      action,
      tenant_id: tenantId || null,
      metadata,
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

/** Product images live in a private bucket; hand out short-lived signed URLs. */
export async function signImages<T extends { image_url: string | null }>(db: Db, rows: T[]): Promise<T[]> {
  const paths = rows
    .map((r) => r.image_url)
    .filter((p): p is string => typeof p === "string" && p.length > 0 && !p.startsWith("http") && !p.startsWith("data:"));
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
  const [{ data: txn }, { data: items }, { data: queue }, { data: tenant }] = await Promise.all([
    db.from("transactions").select("*").eq("id", transactionId).single(),
    db.from("transaction_items").select("*").eq("transaction_id", transactionId),
    db.from("queues").select("queue_number").eq("transaction_id", transactionId).maybeSingle(),
    db.from("tenants").select("business_name, address, phone, logo_url").single(),
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
    store: {
      store_name: tenant?.business_name || "Gen CB Kasir",
      address: tenant?.address || "",
      phone: tenant?.phone || "",
      receipt_footer: "Terima kasih telah berbelanja. Silakan menunggu nomor antrean Anda.",
      receipt_paper: "80mm",
      logo_url: tenant?.logo_url || null,
    },
  };
}

export type Receipt = Awaited<ReturnType<typeof buildReceipt>>;

export async function fetchPaidTransactions(tenantId: string, from: string, to: string) {
  const db = await admin();
  const { data } = await db
    .from("transactions")
    .select(
      "id, created_at, cashier_id, cashier_name, payment_method, subtotal, discount, grand_total, refund_amount, transaction_items(product_name_snapshot, quantity, subtotal, product_id)",
    )
    .eq("tenant_id", tenantId)
    .eq("transaction_status", "completed")
    .eq("payment_status", "paid")
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at");
  return data ?? [];
}
