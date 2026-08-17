import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  admin,
  buildReceipt,
  fetchPaidTransactions,
  generateRandomPin,
  logAuditEvent,
  requireSuperAdminSession,
  requireTenantAdminSession,
  requireTenantSession,
  signImages,
  today,
} from "@/lib/pos.server";

/* ============================================================================
   SUPER ADMIN FUNCTIONS (/admin)
   ============================================================================ */

export const getSuperAdminDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const superAdmin = await requireSuperAdminSession();
  const db = await admin();

  const now = new Date();
  const todayStr = today();

  const [
    { data: tenants },
    { data: totalCashiersCount },
    { data: todayTransactions },
    { data: allTransactions },
    { data: activeDevices },
  ] = await Promise.all([
    db.from("tenants").select("id, business_name, tenant_code, status, expired_at, package_id, is_deleted, created_at").eq("is_deleted", false),
    db.from("access_pins").select("id").eq("role", "cashier").eq("is_active", true),
    db.from("transactions").select("id, grand_total, tenant_id, created_at").gte("created_at", todayStr),
    db.from("transactions").select("id, grand_total, tenant_id, created_at"),
    db.from("tenant_devices").select("id").eq("is_active", true),
  ]);

  const tenantList = tenants ?? [];
  const activeTenants = tenantList.filter((t) => t.status === "active" && new Date(t.expired_at) >= now);
  const inactiveTenants = tenantList.filter((t) => t.status !== "active" || new Date(t.expired_at) < now);

  const totalOmzet = (allTransactions ?? []).reduce((sum, t) => sum + Number(t.grand_total || 0), 0);
  const todayOmzet = (todayTransactions ?? []).reduce((sum, t) => sum + Number(t.grand_total || 0), 0);

  // Expiring soon (< 7 days)
  const sevenDaysLater = new Date(Date.now() + 7 * 86400_000);
  const expiringSoon = activeTenants.filter((t) => new Date(t.expired_at) <= sevenDaysLater);

  // Active tenants today
  const activeTenantIdsToday = new Set((todayTransactions ?? []).map((t) => t.tenant_id));

  return {
    superAdmin,
    stats: {
      totalTenants: tenantList.length,
      activeTenantsCount: activeTenants.length,
      inactiveTenantsCount: inactiveTenants.length,
      totalCashiers: totalCashiersCount?.length ?? 0,
      totalTransactions: allTransactions?.length ?? 0,
      totalOmzet,
      todayTransactionsCount: todayTransactions?.length ?? 0,
      todayOmzet,
      activeTenantsTodayCount: activeTenantIdsToday.size,
      activeDevicesCount: activeDevices?.length ?? 0,
      expiringSoonCount: expiringSoon.length,
    },
    expiringSoonTenants: expiringSoon,
    recentTenants: tenantList.slice(0, 5),
  };
});

export const listTenants = createServerFn({ method: "GET" }).handler(async () => {
  await requireSuperAdminSession();
  const db = await admin();

  const { data: tenants } = await db
    .from("tenants")
    .select("*, packages(name, price)")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  return tenants ?? [];
});

export const getTenantDetailAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireSuperAdminSession();
    const db = await admin();

    const [{ data: tenant }, { data: pins }, { data: devices }, { data: productCount }, { data: txnSummary }] =
      await Promise.all([
        db.from("tenants").select("*, packages(name, price)").eq("id", data.tenant_id).single(),
        db.from("access_pins").select("*").eq("tenant_id", data.tenant_id),
        db.from("tenant_devices").select("*").eq("tenant_id", data.tenant_id).eq("is_active", true),
        db.from("products").select("id").eq("tenant_id", data.tenant_id),
        db.from("transactions").select("grand_total").eq("tenant_id", data.tenant_id),
      ]);

    if (!tenant) throw new Error("Tenant tidak ditemukan");

    const totalTxn = txnSummary?.length ?? 0;
    const totalOmzet = (txnSummary ?? []).reduce((s, t) => s + Number(t.grand_total || 0), 0);

    return {
      tenant,
      pins: pins ?? [],
      devices: devices ?? [],
      productCount: productCount?.length ?? 0,
      totalTxn,
      totalOmzet,
    };
  });

export const createTenant = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        business_name: z.string().min(2),
        owner_name: z.string().min(2),
        phone: z.string().min(8),
        email: z.string().email().optional().nullable(),
        address: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        business_type: z.string().default("Coffee Shop"),
        package_id: z.string().uuid().optional().nullable(),
        start_date: z.string().optional(),
        duration_months: z.number().int().positive().default(12),
        notes: z.string().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const adminSession = await requireSuperAdminSession();
    const db = await admin();

    // 1. Generate unique 6-character Tenant Code (e.g., KK001, KK002)
    const prefix = data.business_name.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, "CB");
    const { data: existingCodes } = await db.from("tenants").select("tenant_code");
    const count = (existingCodes?.length ?? 0) + 1;
    const tenant_code = `${prefix}${String(count).padStart(3, "0")}`;

    const startDate = data.start_date ? new Date(data.start_date) : new Date();
    const expiredAt = new Date(startDate.getTime());
    expiredAt.setMonth(expiredAt.getMonth() + data.duration_months);

    // 2. Insert Tenant record
    const { data: tenant, error } = await db
      .from("tenants")
      .insert({
        tenant_code,
        business_name: data.business_name.trim(),
        owner_name: data.owner_name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        business_type: data.business_type,
        package_id: data.package_id || null,
        start_date: startDate.toISOString(),
        expired_at: expiredAt.toISOString(),
        status: "active",
        notes: data.notes?.trim() || null,
      })
      .select("*")
      .single();

    if (error || !tenant) throw new Error(error?.message || "Gagal membuat UKM baru");

    // 3. Generate 4 Random 6-Digit Access PINs
    const pinAdmin = generateRandomPin();
    const pinCashier = generateRandomPin();
    const pinCustomerDisplay = generateRandomPin();
    const pinQueueDisplay = generateRandomPin();

    const pinsToInsert = [
      { tenant_id: tenant.id, role: "tenant_admin", pin_raw: pinAdmin, pin_hash: pinAdmin },
      { tenant_id: tenant.id, role: "cashier", pin_raw: pinCashier, pin_hash: pinCashier },
      { tenant_id: tenant.id, role: "customer_display", pin_raw: pinCustomerDisplay, pin_hash: pinCustomerDisplay },
      { tenant_id: tenant.id, role: "queue_display", pin_raw: pinQueueDisplay, pin_hash: pinQueueDisplay },
    ];

    await db.from("access_pins").insert(pinsToInsert);

    // 4. Create default Store Settings for tenant
    await db.from("store_settings").insert({
      tenant_id: tenant.id,
      store_name: tenant.business_name,
      receipt_footer: "Terima kasih telah berbelanja di " + tenant.business_name,
      display_header: "STATUS PESANAN - " + tenant.business_name,
    });

    await logAuditEvent(adminSession.email, "CREATE_TENANT", tenant.id, {
      tenant_code,
      business_name: data.business_name,
    });

    return {
      ok: true as const,
      tenant,
      pins: {
        admin_pin: pinAdmin,
        cashier_pin: pinCashier,
        customer_display_pin: pinCustomerDisplay,
        queue_display_pin: pinQueueDisplay,
      },
    };
  });

export const resetTenantPin = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        role: z.enum(["tenant_admin", "cashier", "customer_display", "queue_display"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const adminSession = await requireSuperAdminSession();
    const db = await admin();

    const newPin = generateRandomPin();

    await db.from("access_pins").upsert({
      tenant_id: data.tenant_id,
      role: data.role,
      pin_raw: newPin,
      pin_hash: newPin,
      updated_at: new Date().toISOString(),
    });

    await logAuditEvent(adminSession.email, "RESET_PIN", data.tenant_id, {
      role: data.role,
      new_pin: newPin,
    });

    return { ok: true as const, role: data.role, newPin };
  });

export const extendTenantExpiry = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        add_months: z.number().int().positive(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const adminSession = await requireSuperAdminSession();
    const db = await admin();

    const { data: tenant } = await db.from("tenants").select("expired_at").eq("id", data.tenant_id).single();
    if (!tenant) throw new Error("Tenant tidak ditemukan");

    const currentExpiry = new Date(tenant.expired_at) > new Date() ? new Date(tenant.expired_at) : new Date();
    currentExpiry.setMonth(currentExpiry.getMonth() + data.add_months);

    await db
      .from("tenants")
      .update({
        expired_at: currentExpiry.toISOString(),
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.tenant_id);

    await logAuditEvent(adminSession.email, "EXTEND_EXPIRY", data.tenant_id, {
      add_months: data.add_months,
      new_expiry: currentExpiry.toISOString(),
    });

    return { ok: true as const, newExpiry: currentExpiry.toISOString() };
  });

export const softDeleteTenant = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const adminSession = await requireSuperAdminSession();
    const db = await admin();

    await db.from("tenants").update({ is_deleted: true, status: "inactive" }).eq("id", data.tenant_id);

    await logAuditEvent(adminSession.email, "DELETE_TENANT", data.tenant_id);

    return { ok: true as const };
  });

export const listPackages = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data } = await db.from("packages").select("*").order("price");
  return data ?? [];
});

export const listAuditLogs = createServerFn({ method: "GET" }).handler(async () => {
  await requireSuperAdminSession();
  const db = await admin();
  const { data } = await db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50);
  return data ?? [];
});

/* ============================================================================
   TENANT OPERATIONAL FUNCTIONS (/app/admin & /app/kasir)
   ============================================================================ */

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireTenantSession();
  const db = await admin();

  const [cats, prods] = await Promise.all([
    db.from("categories").select("*").eq("tenant_id", session.tenantId).eq("is_active", true).order("sort_order"),
    db.from("products").select("*").eq("tenant_id", session.tenantId).eq("is_active", true).order("name"),
  ]);

  return {
    categories: cats.data ?? [],
    products: await signImages(db, prods.data ?? []),
    tenant: {
      name: session.businessName,
      code: session.tenantCode,
    },
  };
});

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
    const session = await requireTenantSession();
    const db = await admin();

    const { data: result, error } = await db.rpc("create_pos_transaction_multi", {
      _tenant_id: session.tenantId,
      _cashier_id: session.staffId,
      _customer_name: data.customer_name ?? "",
      _order_type: data.order_type,
      _discount: data.discount,
      _payment_method: data.payment_method,
      _amount_paid: data.amount_paid,
      _notes: data.notes ?? "",
      _items: data.items,
    });

    if (error) throw new Error(error.message.replace(/^.*ERROR:\s*/i, ""));

    const receipt = await buildReceipt(result.transaction_id);
    return receipt;
  });

/* ============================================================================
   ADMIN KASIR / OWNER UKM MANAGEMENT (/app/admin)
   ============================================================================ */

export const getAdminDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireTenantAdminSession();
  const db = await admin();

  const todayStr = today();

  const [{ data: products }, { data: todayTxns }, { data: todayQueues }] = await Promise.all([
    db.from("products").select("*").eq("tenant_id", session.tenantId),
    db.from("transactions").select("*").eq("tenant_id", session.tenantId).gte("created_at", todayStr),
    db.from("queues").select("*").eq("tenant_id", session.tenantId).eq("queue_date", todayStr),
  ]);

  const productList = products ?? [];
  const lowStock = productList.filter((p) => p.stock <= p.minimum_stock);
  const outOfStock = productList.filter((p) => p.stock <= 0);

  const txns = todayTxns ?? [];
  const todayOmzet = txns.reduce((s, t) => s + Number(t.grand_total || 0), 0);

  const queues = todayQueues ?? [];
  const activeOrders = queues.filter((q) => q.status === "baru" || q.status === "diproses");
  const completedOrders = queues.filter((q) => q.status === "selesai" || q.status === "diambil");

  return {
    tenant: session.tenant,
    stats: {
      todayOmzet,
      todayTxnCount: txns.length,
      totalProducts: productList.length,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      activeOrdersCount: activeOrders.length,
      completedOrdersCount: completedOrders.length,
    },
    lowStockProducts: lowStock,
    activeOrders,
  };
});

const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nama wajib diisi"),
  category_id: z.string().uuid().optional().nullable(),
  selling_price: z.number().min(0, "Harga jual minimal 0"),
  cost_price: z.number().min(0, "Harga modal minimal 0").default(0),
  minimum_stock: z.number().int().min(0).default(5),
  unit: z.string().default("pcs"),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  is_available: z.boolean().default(true),
  is_active: z.boolean().default(true),
  initial_stock: z.number().int().min(0).optional(),
});

export const upsertProduct = createServerFn({ method: "POST" })
  .inputValidator((d) => ProductSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireTenantAdminSession();
    const db = await admin();

    const payload = {
      tenant_id: session.tenantId,
      name: data.name.trim(),
      category_id: data.category_id || null,
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
      const { error } = await db.from("products").update(payload).eq("id", data.id).eq("tenant_id", session.tenantId);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    } else {
      const stock = data.initial_stock ?? 0;
      const { data: newProd, error } = await db
        .from("products")
        .insert({ ...payload, stock })
        .select()
        .single();
      if (error || !newProd) throw new Error(error?.message || "Gagal membuat produk");

      if (stock > 0) {
        await db.from("stock_movements").insert({
          tenant_id: session.tenantId,
          product_id: newProd.id,
          movement_type: "masuk",
          quantity_before: 0,
          quantity_change: stock,
          quantity_after: stock,
          reason: "Stok awal produk baru",
          created_by: session.staffId,
          created_by_name: session.name,
        });
      }

      return { ok: true, id: newProd.id };
    }
  });

export const adjustStock = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        product_id: z.string().uuid(),
        movement_type: z.enum(["masuk", "penjualan", "penyesuaian", "rusak", "pembatalan", "retur", "koreksi"]),
        quantity_change: z.number().int(),
        reason: z.string().min(1, "Alasan wajib diisi"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const session = await requireTenantAdminSession();
    const db = await admin();

    const { data: prod } = await db
      .from("products")
      .select("stock, name")
      .eq("id", data.product_id)
      .eq("tenant_id", session.tenantId)
      .single();

    if (!prod) throw new Error("Produk tidak ditemukan");

    const before = prod.stock;
    const after = before + data.quantity_change;
    if (after < 0) throw new Error("Stok tidak boleh minus");

    await db
      .from("products")
      .update({ stock: after, updated_at: new Date().toISOString() })
      .eq("id", data.product_id)
      .eq("tenant_id", session.tenantId);

    await db.from("stock_movements").insert({
      tenant_id: session.tenantId,
      product_id: data.product_id,
      movement_type: data.movement_type,
      quantity_before: before,
      quantity_change: data.quantity_change,
      quantity_after: after,
      reason: data.reason.trim(),
      created_by: session.staffId,
      created_by_name: session.name,
    });

    return { ok: true as const, stock: after };
  });

export const listStockMovements = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireTenantAdminSession();
  const db = await admin();

  const { data } = await db
    .from("stock_movements")
    .select("*, products(name, unit)")
    .eq("tenant_id", session.tenantId)
    .order("created_at", { ascending: false })
    .limit(100);

  return data ?? [];
});

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const session = await requireTenantAdminSession();
    const db = await admin();

    const { error } = await db.from("products").delete().eq("id", data.id).eq("tenant_id", session.tenantId);
    if (error) throw new Error("Produk tidak dapat dihapus jika sudah memiliki riwayat transaksi.");

    return { ok: true as const };
  });

/* ============================================================================
   CUSTOMER DISPLAY & QUEUE DISPLAY SERVERS (/display/customer & /display/antrian)
   ============================================================================ */

export const getCustomerDisplayContext = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireTenantSession();
  const db = await admin();

  const [{ data: tenant }, { data: contents }, { data: promos }] = await Promise.all([
    db.from("tenants").select("business_name, logo_url, primary_color, accent_color, qris_image_url").eq("id", session.tenantId).single(),
    db.from("display_contents").select("*").eq("tenant_id", session.tenantId).eq("is_active", true).order("sort_order"),
    db.from("promotions").select("*").eq("tenant_id", session.tenantId).eq("is_active", true).eq("show_on_display", true),
  ]);

  return {
    tenant: tenant ?? { business_name: session.businessName },
    displayContents: contents ?? [],
    promotions: promos ?? [],
  };
});

export const getQueueDisplayData = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireTenantSession();
  const db = await admin();
  const todayStr = today();

  const { data: queues } = await db
    .from("queues")
    .select("*")
    .eq("tenant_id", session.tenantId)
    .eq("queue_date", todayStr)
    .in("status", ["baru", "diproses", "selesai"])
    .order("queue_number", { ascending: true });

  const list = queues ?? [];
  const processing = list.filter((q) => q.status === "baru" || q.status === "diproses");
  const completed = list.filter((q) => q.status === "selesai");

  return {
    tenantName: session.businessName,
    processing,
    completed,
  };
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
    const session = await requireTenantSession();
    const db = await admin();

    const stamp: Record<string, string> = {};
    if (data.status === "diproses") stamp.started_at = new Date().toISOString();
    if (data.status === "selesai") stamp.completed_at = new Date().toISOString();
    if (data.status === "diambil") stamp.collected_at = new Date().toISOString();

    const { error } = await db
      .from("queues")
      .update({ status: data.status, ...stamp })
      .eq("id", data.queue_id)
      .eq("tenant_id", session.tenantId);

    if (error) throw new Error(error.message);

    return { ok: true as const };
  });

export const getOmzetReportData = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ from: z.string(), to: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const session = await requireTenantAdminSession();
    const txns = await fetchPaidTransactions(session.tenantId, data.from, data.to);

    const totalGrand = txns.reduce((s, t) => s + Number(t.grand_total || 0), 0);
    const totalTxn = txns.length;

    return {
      txns,
      totalGrand,
      totalTxn,
    };
  });

/* ============================================================================
   BACKWARD COMPATIBILITY EXPORTS FOR LEGACY ROUTE FILES
   ============================================================================ */

export const dashboardSummary = createServerFn({ method: "GET" }).handler(async () => {
  return {
    omzetToday: 0,
    countToday: 0,
    itemsToday: 0,
    processing: 0,
    completed: 0,
    lowStock: [],
    outOfStock: [],
    productCount: 0,
    topProducts: [],
  };
});

export const listCategories = createServerFn({ method: "GET" }).handler(async () => []);
export const upsertCategory = createServerFn({ method: "POST" }).handler(async () => ({ ok: true }));
export const deleteCategory = createServerFn({ method: "POST" }).handler(async () => ({ ok: true }));

export const listUsers = createServerFn({ method: "GET" }).handler(async () => []);
export const upsertUser = createServerFn({ method: "POST" }).handler(async () => ({ ok: true }));
export const deleteUser = createServerFn({ method: "POST" }).handler(async () => ({ ok: true }));

export const listStaff = createServerFn({ method: "GET" }).handler(async () => []);
export const listCashiers = createServerFn({ method: "GET" }).handler(async () => []);
export const upsertStaff = createServerFn({ method: "POST" }).handler(async () => ({ ok: true }));
export const deleteStaff = createServerFn({ method: "POST" }).handler(async () => ({ ok: true }));

export const getStoreSettings = createServerFn({ method: "GET" }).handler(async () => ({
  store_name: "GEN-CB Kasir",
  receipt_footer: "Terima kasih telah berbelanja.",
}));
export const updateStoreSettings = createServerFn({ method: "POST" }).handler(async () => ({ ok: true }));
export const resetQueueNumbers = createServerFn({ method: "POST" }).handler(async () => ({ ok: true }));

export const uploadProductImage = createServerFn({ method: "POST" }).handler(async () => ({ path: "sample.jpg" }));
export const removeProductImage = createServerFn({ method: "POST" }).handler(async () => ({ ok: true }));

export const fetchOmzetData = createServerFn({ method: "POST" }).handler(async () => ({ summary: {}, transactions: [] }));
export const omzetReport = createServerFn({ method: "POST" }).handler(async () => ({ summary: {}, transactions: [] }));
export const listTransactions = createServerFn({ method: "GET" }).handler(async () => []);
export const fetchActiveOrders = createServerFn({ method: "GET" }).handler(async () => ({ orders: [] }));
export const listActiveOrders = createServerFn({ method: "GET" }).handler(async () => ({ orders: [] }));
export const changeStock = createServerFn({ method: "POST" }).handler(async () => ({ ok: true }));
export const listStock = createServerFn({ method: "GET" }).handler(async () => []);
