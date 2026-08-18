import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listOutlets = createServerFn({ method: "GET" }).handler(async () => {
  const { getGateSession } = await import("@/lib/session.server");
  const session = await getGateSession();
  if (session.data.role !== "super_admin") {
    throw new Error("Akses ditolak: Hanya Super Admin");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: outlets, error } = await supabaseAdmin
    .from("outlets")
    .select(`
      id,
      name,
      code,
      address,
      phone,
      is_active,
      created_at,
      staff (
        id,
        name,
        pin,
        role,
        is_active
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return outlets ?? [];
});

export const listAllUsers = createServerFn({ method: "GET" }).handler(async () => {
  const { getGateSession } = await import("@/lib/session.server");
  const session = await getGateSession();
  if (session.data.role !== "super_admin") {
    throw new Error("Akses ditolak: Hanya Super Admin");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: users, error } = await supabaseAdmin
    .from("staff")
    .select(`
      id,
      name,
      pin,
      role,
      email,
      is_active,
      created_at,
      outlet_id,
      outlets(id, name, code)
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return users ?? [];
});

export const createOutlet = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        name: z.string().min(2, "Nama outlet minimal 2 karakter"),
        code: z.string().min(2, "Kode outlet minimal 2 karakter"),
        adminPin: z.string().min(3, "PIN Admin minimal 3 digit"),
        kasirPin: z.string().min(3, "PIN Kasir minimal 3 digit"),
        address: z.string().optional(),
        phone: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { getGateSession } = await import("@/lib/session.server");
    const session = await getGateSession();
    if (session.data.role !== "super_admin") {
      throw new Error("Akses ditolak: Hanya Super Admin");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check PIN uniqueness
    const { data: existingPins } = await supabaseAdmin
      .from("staff")
      .select("pin")
      .in("pin", [data.adminPin, data.kasirPin]);

    if (existingPins && existingPins.length > 0) {
      throw new Error("PIN Admin atau Kasir sudah digunakan di toko lain. Harap pilih PIN unik.");
    }

    if (data.adminPin === data.kasirPin) {
      throw new Error("PIN Admin dan PIN Kasir untuk outlet ini tidak boleh sama.");
    }

    // Insert Outlet
    const { data: outlet, error: outletErr } = await supabaseAdmin
      .from("outlets")
      .insert({
        name: data.name.trim(),
        code: data.code.toUpperCase().trim(),
        address: data.address?.trim() ?? null,
        phone: data.phone?.trim() ?? null,
      })
      .select()
      .single();

    if (outletErr) throw new Error(outletErr.message);

    // Create Admin Kasir & Kasir PINs
    const staffToInsert = [
      {
        name: `Admin ${outlet.name}`,
        pin: data.adminPin,
        role: "admin",
        outlet_id: outlet.id,
      },
      {
        name: `Kasir ${outlet.name}`,
        pin: data.kasirPin,
        role: "kasir",
        outlet_id: outlet.id,
      },
    ];

    const { error: staffErr } = await supabaseAdmin.from("staff").insert(staffToInsert);
    if (staffErr) throw new Error(staffErr.message);

    // Clone template categories & products from existing outlet or default template
    const { data: templateCats } = await supabaseAdmin
      .from("categories")
      .select("name, sort_order")
      .limit(10);

    if (templateCats && templateCats.length > 0) {
      const uniqueCatNames = Array.from(new Set(templateCats.map((c) => c.name)));
      for (const catName of uniqueCatNames) {
        const { data: newCat } = await supabaseAdmin
          .from("categories")
          .insert({ name: catName, sort_order: 1, outlet_id: outlet.id })
          .select()
          .single();

        if (newCat) {
          await supabaseAdmin.from("products").insert([
            {
              category_id: newCat.id,
              name: `Kopi Classic (${outlet.name})`,
              selling_price: 15000,
              stock: 50,
              outlet_id: outlet.id,
            },
            {
              category_id: newCat.id,
              name: `Es Teh Manis (${outlet.name})`,
              selling_price: 5000,
              stock: 100,
              outlet_id: outlet.id,
            },
          ]);
        }
      }
    } else {
      // Default initial category if database is empty
      const { data: defaultCat } = await supabaseAdmin
        .from("categories")
        .insert({ name: "Minuman", sort_order: 1, outlet_id: outlet.id })
        .select()
        .single();

      if (defaultCat) {
        await supabaseAdmin.from("products").insert({
          category_id: defaultCat.id,
          name: `Kopi Spesial (${outlet.name})`,
          selling_price: 18000,
          stock: 50,
          outlet_id: outlet.id,
        });
      }
    }

    return { ok: true as const, outlet };
  });

export const createStaffUser = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        name: z.string().min(2, "Nama user minimal 2 karakter"),
        role: z.enum(["admin", "kasir"]),
        pin: z.string().min(3, "PIN minimal 3 digit"),
        outletId: z.string().uuid("Pilih outlet yang valid"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { getGateSession } = await import("@/lib/session.server");
    const session = await getGateSession();
    if (session.data.role !== "super_admin") {
      throw new Error("Akses ditolak: Hanya Super Admin");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check PIN uniqueness
    const { data: check } = await supabaseAdmin
      .from("staff")
      .select("id")
      .eq("pin", data.pin)
      .maybeSingle();

    if (check) throw new Error("PIN ini sudah digunakan oleh user/outlet lain.");

    const { data: user, error } = await supabaseAdmin
      .from("staff")
      .insert({
        name: data.name.trim(),
        role: data.role,
        pin: data.pin.trim(),
        outlet_id: data.outletId,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { ok: true as const, user };
  });

export const updateStaffPin = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ staffId: z.string().uuid(), newPin: z.string().min(3).max(10) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { getGateSession } = await import("@/lib/session.server");
    const session = await getGateSession();
    if (session.data.role !== "super_admin") {
      throw new Error("Akses ditolak: Hanya Super Admin");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check if new PIN exists
    const { data: check } = await supabaseAdmin
      .from("staff")
      .select("id")
      .eq("pin", data.newPin)
      .neq("id", data.staffId)
      .maybeSingle();

    if (check) throw new Error("PIN ini sudah digunakan oleh petugas/outlet lain.");

    const { error } = await supabaseAdmin
      .from("staff")
      .update({ pin: data.newPin })
      .eq("id", data.staffId);

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
