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
