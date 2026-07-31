import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const loginWithPin = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ pin: z.string().min(4).max(10) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getGateSession } = await import("@/lib/session.server");
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("id, name, role, is_active")
      .eq("pin", data.pin)
      .eq("is_active", true)
      .maybeSingle();
    if (!staff) return { ok: false as const, error: "PIN tidak dikenali" };
    const session = await getGateSession();
    await session.update({
      staffId: staff.id,
      name: staff.name,
      role: staff.role as "admin" | "kasir",
    });
    return { ok: true as const, staff: { id: staff.id, name: staff.name, role: staff.role as "admin" | "kasir" } };
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
  };
});

/** Display Pesanan: unlock a device with the admin-managed display PIN. */
export const unlockDisplay = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ pin: z.string().min(4).max(10) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getGateSession } = await import("@/lib/session.server");
    const { data: settings } = await supabaseAdmin
      .from("store_settings")
      .select("display_pin")
      .limit(1)
      .maybeSingle();
    if (!settings || settings.display_pin !== data.pin) {
      return { ok: false as const, error: "PIN display salah" };
    }
    const session = await getGateSession();
    await session.update({ displayUnlocked: true });
    return { ok: true as const };
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
