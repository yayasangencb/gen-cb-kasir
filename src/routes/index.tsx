import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentSuperAdmin, getCurrentTenantSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const superAdmin = await getCurrentSuperAdmin();
    if (superAdmin) throw redirect({ to: "/admin" });

    const session = await getCurrentTenantSession();
    if (!session) throw redirect({ to: "/login" });

    if (session.tenantRole === "tenant_admin") throw redirect({ to: "/app/admin" });
    if (session.tenantRole === "customer_display") throw redirect({ to: "/display/customer" });
    if (session.tenantRole === "queue_display") throw redirect({ to: "/display/antrian" });
    throw redirect({ to: "/app/kasir" });
  },
});
