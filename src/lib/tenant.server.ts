import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getSuperAdminDashboardMetrics = createServerFn({ method: "GET" }).handler(async () => {
  const { requireSuperAdmin, admin } = await import("@/lib/pos.server");
  await requireSuperAdmin();
  const db = await admin();

  const [{ data: tenants }, { data: devices }, { data: txns }, { data: members }, { data: logs }] = await Promise.all([
    db.from("tenants").select("id, name, slug, status, valid_until, plan_id, created_at").order("created_at", { ascending: false }),
    db.from("devices").select("id, tenant_id, device_type, is_active, last_seen_at"),
    db.from("transactions").select("id, grand_total, created_at, payment_status").eq("payment_status", "paid"),
    db.from("tenant_members").select("id, tenant_id, role, is_active"),
    db.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(20),
  ]);

  const activeTenants = (tenants ?? []).filter((t) => t.status === "active").length;
  const suspendedTenants = (tenants ?? []).filter((t) => t.status === "suspended").length;
  const activeDevices = (devices ?? []).filter((d) => d.is_active).length;
  const totalRevenue = (txns ?? []).reduce((acc, t) => acc + Number(t.grand_total || 0), 0);
  
  const todayStr = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const todayTxns = (txns ?? []).filter((t) => t.created_at && t.created_at.startsWith(todayStr)).length;

  return {
    totalTenants: tenants?.length ?? 0,
    activeTenants,
    suspendedTenants,
    activeDevices,
    totalTransactions: txns?.length ?? 0,
    totalRevenue,
    todayTransactions: todayTxns,
    tenants: tenants ?? [],
    recentLogs: logs ?? [],
    cashierCount: (members ?? []).filter((m) => m.role === "cashier").length,
    adminCount: (members ?? []).filter((m) => m.role === "tenant_admin").length,
  };
});

export const createTenantAccount = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        name: z.string().min(2),
        slug: z.string().min(2),
        owner_name: z.string().min(2),
        owner_email: z.string().email().optional().nullable(),
        owner_whatsapp: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        province: z.string().optional().nullable(),
        plan_id: z.string().optional().nullable(),
        duration_days: z.number().default(30),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { requireSuperAdmin, admin } = await import("@/lib/pos.server");
    await requireSuperAdmin();
    const db = await admin();

    const slugClean = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const validUntil = new Date(Date.now() + (data.duration_days || 30) * 86400_000).toISOString();

    const { data: tenant, error } = await db
      .from("tenants")
      .insert({
        name: data.name.trim(),
        slug: slugClean,
        owner_name: data.owner_name.trim(),
        owner_email: data.owner_email ? data.owner_email.trim() : null,
        owner_whatsapp: data.owner_whatsapp ? data.owner_whatsapp.trim() : null,
        address: data.address ? data.address.trim() : null,
        city: data.city ? data.city.trim() : null,
        province: data.province ? data.province.trim() : null,
        status: "active",
        valid_until: validUntil,
        plan_id: null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Create default tenant admin PIN (e.g. random 6-digit)
    const adminPin = String(Math.floor(100000 + Math.random() * 900000));
    const cashierPin = String(Math.floor(100000 + Math.random() * 900000));
    const customerPin = String(Math.floor(100000 + Math.random() * 900000));
    const queuePin = String(Math.floor(100000 + Math.random() * 900000));

    await Promise.all([
      db.from("tenant_members").insert([
        { tenant_id: tenant.id, name: `Manager ${data.name}`, role: "tenant_admin", pin_hash: adminPin, encrypted_pin: adminPin, is_active: true },
        { tenant_id: tenant.id, name: `Kasir 1 (${data.name})`, role: "cashier", pin_hash: cashierPin, encrypted_pin: cashierPin, is_active: true },
      ]),
      db.from("devices").insert([
        { tenant_id: tenant.id, device_type: "customer_display", name: "Customer Display", access_pin_hash: customerPin, encrypted_pin: customerPin, is_active: true },
        { tenant_id: tenant.id, device_type: "queue_display", name: "Queue Display TV", access_pin_hash: queuePin, encrypted_pin: queuePin, is_active: true },
      ]),
      db.from("store_settings").insert({
        tenant_id: tenant.id,
        store_name: data.name,
        address: data.address || "Jl. Utama No. 1",
        phone: data.owner_whatsapp || "",
      }),
      db.from("activity_logs").insert({
        tenant_id: tenant.id,
        actor_type: "super_admin",
        actor_id: "super_admin",
        action: "create_tenant",
        target_type: "tenant",
        target_id: tenant.id,
        metadata: { tenant_name: data.name, slug: slugClean },
      }),
    ]);

    return {
      ok: true as const,
      tenant,
      pins: {
        adminPin,
        cashierPin,
        customerPin,
        queuePin,
      },
    };
  });

export const getTenantDetailsSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ tenant_id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { requireSuperAdmin, admin } = await import("@/lib/pos.server");
    await requireSuperAdmin();
    const db = await admin();

    const [{ data: tenant }, { data: members }, { data: devices }, { data: prods }, { data: txns }, { data: logs }] = await Promise.all([
      db.from("tenants").select("*").eq("id", data.tenant_id).single(),
      db.from("tenant_members").select("*").eq("tenant_id", data.tenant_id).order("created_at"),
      db.from("devices").select("*").eq("tenant_id", data.tenant_id).order("created_at"),
      db.from("products").select("id, name, selling_price, stock, is_available, is_active").eq("tenant_id", data.tenant_id).order("name"),
      db.from("transactions").select("id, transaction_number, cashier_name, grand_total, created_at").eq("tenant_id", data.tenant_id).order("created_at", { ascending: false }).limit(50),
      db.from("activity_logs").select("*").eq("tenant_id", data.tenant_id).order("created_at", { ascending: false }).limit(30),
    ]);

    return {
      tenant,
      members: members ?? [],
      devices: devices ?? [],
      products: prods ?? [],
      transactions: txns ?? [],
      logs: logs ?? [],
    };
  });

export const updateTenantStatus = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ tenant_id: z.string().uuid(), status: z.enum(["active", "suspended", "expired", "trial"]) }).parse(data))
  .handler(async ({ data }) => {
    const { requireSuperAdmin, admin } = await import("@/lib/pos.server");
    await requireSuperAdmin();
    const db = await admin();

    const { error } = await db.from("tenants").update({ status: data.status, updated_at: new Date().toISOString() }).eq("id", data.tenant_id);
    if (error) throw new Error(error.message);

    await db.from("activity_logs").insert({
      tenant_id: data.tenant_id,
      actor_type: "super_admin",
      actor_id: "super_admin",
      action: `update_tenant_status_${data.status}`,
      target_type: "tenant",
      target_id: data.tenant_id,
    });

    return { ok: true as const };
  });

export const resetAccessPin = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ type: z.enum(["member", "device"]), id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { requireSuperAdmin, admin } = await import("@/lib/pos.server");
    await requireSuperAdmin();
    const db = await admin();

    const newPin = String(Math.floor(100000 + Math.random() * 900000));

    if (data.type === "member") {
      const { data: m, error } = await db.from("tenant_members").update({ pin_hash: newPin, encrypted_pin: newPin, updated_at: new Date().toISOString() }).eq("id", data.id).select("tenant_id, name").single();
      if (error) throw new Error(error.message);

      await db.from("activity_logs").insert({
        tenant_id: m.tenant_id,
        actor_type: "super_admin",
        actor_id: "super_admin",
        action: "reset_member_pin",
        target_type: "tenant_member",
        target_id: data.id,
        metadata: { member_name: m.name, new_pin: newPin },
      });
    } else {
      const { data: d, error } = await db.from("devices").update({ access_pin_hash: newPin, encrypted_pin: newPin, updated_at: new Date().toISOString() }).eq("id", data.id).select("tenant_id, name").single();
      if (error) throw new Error(error.message);

      await db.from("activity_logs").insert({
        tenant_id: d.tenant_id,
        actor_type: "super_admin",
        actor_id: "super_admin",
        action: "reset_device_pin",
        target_type: "device",
        target_id: data.id,
        metadata: { device_name: d.name, new_pin: newPin },
      });
    }

    return { ok: true as const, newPin };
  });
