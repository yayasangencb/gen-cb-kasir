import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** 1. SUPER ADMIN LOGIN (/admin/login) */
export const loginSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { getGateSession } = await import("@/lib/session.server");
    const session = await getGateSession();

    // Verify Super Admin Credentials
    if (data.email.trim().toLowerCase() !== "yayasangencb@gmail.com" || data.password !== "Generasicerdasberaksi_") {
      return { ok: false as const, error: "Email atau password Super Admin salah." };
    }

    await session.update({
      isSuperAdmin: true,
      name: "Super Admin GEN-CB",
    });

    return { ok: true as const, redirect: "/admin" };
  });

/** 2. TENANT PIN LOGIN (/login) - With Anti-Bruteforce Rate Limiting (3 attempts -> 5 min lock) */
export const loginTenantWithPin = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        tenant_code: z.string().min(2).max(20),
        pin: z.string().min(4).max(10),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getGateSession } = await import("@/lib/session.server");

    const code = data.tenant_code.trim().toUpperCase();
    const pin = data.pin.trim();

    // 1. Check Anti-Bruteforce Lockout status in pin_login_attempts
    const { data: attempt } = await supabaseAdmin
      .from("pin_login_attempts")
      .select("attempts, locked_until")
      .eq("tenant_code", code)
      .maybeSingle();

    const now = new Date();
    if (attempt?.locked_until && new Date(attempt.locked_until) > now) {
      const remainingSeconds = Math.ceil((new Date(attempt.locked_until).getTime() - now.getTime()) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      return {
        ok: false as const,
        error: `Terlalu banyak percobaan PIN salah (3x). Akses dikunci untuk Kode ${code}. Silakan tunggu ${remainingMinutes} menit lagi.`,
      };
    }

    // 2. Fetch Tenant profile
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, tenant_code, business_name, status, expired_at, is_deleted")
      .eq("tenant_code", code)
      .eq("is_deleted", false)
      .maybeSingle();

    if (!tenant) {
      return { ok: false as const, error: `Kode Tenant "${code}" tidak ditemukan.` };
    }

    // Check expiration or inactive status
    if (tenant.status !== "active" || new Date(tenant.expired_at) < now) {
      return {
        ok: false as const,
        error: "Masa aktif langganan UKM Anda telah berakhir. Silakan hubungi Super Admin GEN-CB untuk memperpanjang.",
      };
    }

    // 3. Verify PIN in access_pins
    const { data: pinRecord } = await supabaseAdmin
      .from("access_pins")
      .select("id, role, pin_raw, is_active")
      .eq("tenant_id", tenant.id)
      .eq("pin_raw", pin)
      .eq("is_active", true)
      .maybeSingle();

    if (!pinRecord) {
      // Increment attempt counter & set 5-minute lockout on 3rd failure
      const currentAttempts = (attempt?.attempts || 0) + 1;
      let lockedUntil = null;
      if (currentAttempts >= 3) {
        lockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      }

      await supabaseAdmin.from("pin_login_attempts").upsert({
        tenant_code: code,
        attempts: currentAttempts >= 3 ? 0 : currentAttempts,
        locked_until: lockedUntil,
        last_attempt_at: now.toISOString(),
      });

      if (currentAttempts >= 3) {
        return {
          ok: false as const,
          error: "PIN salah 3 kali berturut-turut. Akses PIN dikunci selama 5 menit demi keamanan.",
        };
      }

      return {
        ok: false as const,
        error: `PIN salah. Sisa kesempatan mencoba: ${3 - currentAttempts} kali.`,
      };
    }

    // 4. Successful Login! Reset attempt counter
    await supabaseAdmin.from("pin_login_attempts").upsert({
      tenant_code: code,
      attempts: 0,
      locked_until: null,
      last_attempt_at: now.toISOString(),
    });

    // 5. Update Server Session
    const session = await getGateSession();
    await session.update({
      tenantId: tenant.id,
      tenantCode: tenant.tenant_code,
      businessName: tenant.business_name,
      tenantRole: pinRecord.role as any,
      staffId: tenant.id,
      name: tenant.business_name,
    });

    // 6. Map role to redirect target URL
    let targetUrl = "/app/kasir";
    if (pinRecord.role === "tenant_admin") targetUrl = "/app/admin";
    if (pinRecord.role === "cashier") targetUrl = "/app/kasir";
    if (pinRecord.role === "customer_display") targetUrl = "/display/customer";
    if (pinRecord.role === "queue_display") targetUrl = "/display/antrian";

    return {
      ok: true as const,
      role: pinRecord.role,
      redirect: targetUrl,
      tenant: {
        id: tenant.id,
        code: tenant.tenant_code,
        name: tenant.business_name,
      },
    };
  });

/** 3. GET CURRENT SUPER ADMIN SESSION */
export const getCurrentSuperAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const { getGateSession } = await import("@/lib/session.server");
  const session = await getGateSession();
  if (!session.data.isSuperAdmin) return null;
  return {
    isSuperAdmin: true,
    name: session.data.name || "Super Admin GEN-CB",
  };
});

/** 4. GET CURRENT TENANT SESSION */
export const getCurrentTenantSession = createServerFn({ method: "GET" }).handler(async () => {
  const { getGateSession } = await import("@/lib/session.server");
  const session = await getGateSession();

  if (!session.data.tenantId || !session.data.tenantRole) {
    return null;
  }

  return {
    tenantId: session.data.tenantId,
    tenantCode: session.data.tenantCode ?? "",
    businessName: session.data.businessName ?? "UKM",
    tenantRole: session.data.tenantRole,
    staffId: session.data.staffId ?? session.data.tenantId,
    name: session.data.name ?? "Pengguna Kasir",
  };
});

/** 5. BACKWARD-COMPATIBLE STAFF SESSION GETTER FOR LEGACY ROUTES */
export const getCurrentStaff = createServerFn({ method: "GET" }).handler(async () => {
  const { getGateSession } = await import("@/lib/session.server");
  const session = await getGateSession();

  if (session.data.isSuperAdmin) {
    return { id: "superadmin", name: "Super Admin GEN-CB", role: "admin" as const };
  }

  if (!session.data.tenantId || !session.data.tenantRole) return null;

  return {
    id: session.data.staffId ?? session.data.tenantId,
    name: session.data.name ?? "Pengguna Kasir",
    role: session.data.tenantRole === "tenant_admin" ? ("admin" as const) : ("kasir" as const),
  };
});

/** 6. LEGACY PIN LOGIN WRAPPER */
export const loginWithPin = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ pin: z.string().min(4).max(10) }).parse(data))
  .handler(async ({ data }) => {
    // Attempt login with default demo tenant code or return error
    return { ok: false as const, error: "Gunakan Kode Tenant dan PIN pada halaman /login" };
  });

export const unlockDisplay = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ pin: z.string().min(4).max(10) }).parse(data))
  .handler(async () => ({ ok: true as const }));

export const getDisplayContext = createServerFn({ method: "GET" }).handler(async () => {
  return { unlocked: true as const, settings: null };
});

/** 7. LOGOUT SESSION */
export const logoutSession = createServerFn({ method: "POST" }).handler(async () => {
  const { getGateSession } = await import("@/lib/session.server");
  const session = await getGateSession();
  await session.clear();
  return { ok: true as const };
});

export const logout = logoutSession;
