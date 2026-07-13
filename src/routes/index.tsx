import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentStaff } from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (staff) throw redirect({ to: "/kasir" });
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
