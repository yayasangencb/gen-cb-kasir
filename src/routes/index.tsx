import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentStaff } from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    if (staff.role === "super_admin") throw redirect({ to: "/admin/dashboard" });
    if (staff.role === "admin") throw redirect({ to: "/produk" });
    throw redirect({ to: "/kasir" });
  },
  component: () => null,
});
