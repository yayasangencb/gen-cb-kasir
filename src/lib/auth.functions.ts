import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const loginWithPin = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ pin: z.string().min(3).max(10) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getGateSession } = await import("@/lib/session.server");
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("id, name, role, is_active, outlet_id, outlets(id, name)")
      .eq("pin", data.pin)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) return { ok: false as const, error: "PIN tidak dikenali" };

    if (staff.role === "super_admin") {
      return { ok: false as const, error: "Super Admin wajib login dengan Email & Password" };
    }

    const outletData = Array.isArray(staff.outlets) ? staff.outlets[0] : staff.outlets;
    const outletName = outletData?.name ?? null;

    const session = await getGateSession();
    await session.update({
      staffId: staff.id,
      name: staff.name,
      role: staff.role as "admin" | "kasir",
      outletId: staff.outlet_id,
      outletName,
    });

    return {
      ok: true as const,
      staff: {
        id: staff.id,
        name: staff.name,
        role: staff.role as "admin" | "kasir",
        outletId: staff.outlet_id,
        outletName,
      },
    };
  });

export const loginWithEmailPassword = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ email: z.string().email(), password: z.string().min(4) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getGateSession } = await import("@/lib/session.server");
    
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("id, name, role, email, password_hash, is_active")
      .eq("email", data.email.toLowerCase().trim())
      .eq("role", "super_admin")
      .eq("is_active", true)
      .maybeSingle();

    if (!staff || staff.password_hash !== data.password) {
      return { ok: false as const, error: "Email atau Password Super Admin salah" };
    }

    const session = await getGateSession();
    await session.update({
      staffId: staff.id,
      name: staff.name,
      role: "super_admin",
      outletId: null,
      outletName: "Super Admin Center",
    });

    return {
      ok: true as const,
      staff: {
        id: staff.id,
        name: staff.name,
        role: "super_admin" as const,
        outletId: null,
        outletName: "Super Admin Center",
      },
    };
  });

export const loginSuperAdmin = loginWithEmailPassword;

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { getGateSession } = await import("@/lib/session.server");
  const session = await getGateSession();
  await session.clear();
  return { ok: true as const };
});

export const getCurrentStaff = createServerFn({ method: "GET" }).handler(async () => {
  const { getGateSession } = await import("@/lib/session.server");
  const session = await getGateSession();
  if (!session.data.staffId || !session.data.role) return null;
  return {
    id: session.data.staffId,
    name: session.data.name ?? "",
    role: session.data.role,
    outletId: session.data.outletId ?? null,
    outletName: session.data.outletName ?? null,
  };
});

/** Public: display config + whether this device is unlocked. */
export const getDisplayContext = createServerFn({ method: "GET" }).handler(async () => {
  const { getGateSession } = await import("@/lib/session.server");
  const session = await getGateSession();
  const unlocked = Boolean(session.data.displayUnlocked || session.data.staffId);
  if (!unlocked) return { unlocked: false as const };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("store_settings")
    .select(
      "store_name, logo_url, display_header, display_footer, sound_enabled, sound_volume, completed_display_duration, max_display_items, show_customer_name, show_clock",
    )
    .limit(1)
    .maybeSingle();
  return { unlocked: true as const, settings: data ?? null };
});

export const updateActiveCashierName = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ name: z.string().min(1).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const { getGateSession } = await import("@/lib/session.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const session = await getGateSession();
    if (!session.data.staffId) throw new Error("Belum login");

    const newName = data.name.trim();

    // 1. Update active session
    await session.update({
      name: newName,
    });

    // 2. Update staff database record so create_pos_transaction RPC uses updated cashier name
    await supabaseAdmin.from("staff").update({ name: newName }).eq("id", session.data.staffId);

    return { ok: true as const, name: newName };
  });

