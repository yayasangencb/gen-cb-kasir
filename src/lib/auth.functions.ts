import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const loginWithPin = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ pin: z.string().min(3).max(10) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getGateSession } = await import("@/lib/session.server");
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("id, name, role, is_active")
      .eq("pin", data.pin)
      .eq("is_active", true)
      .maybeSingle();
    if (!staff) return { ok: false as const, error: "PIN salah" };
    const session = await getGateSession();
    await session.update({
      staffId: staff.id,
      name: staff.name,
      role: staff.role as "admin" | "kasir" | "dapur",
    });
    return { ok: true as const, staff: { id: staff.id, name: staff.name, role: staff.role } };
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
  if (!session.data.staffId) return null;
  return {
    id: session.data.staffId,
    name: session.data.name!,
    role: session.data.role!,
  };
});
