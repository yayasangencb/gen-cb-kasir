import { useSession } from "@tanstack/react-start/server";

export type TenantRole = "tenant_admin" | "cashier" | "customer_display" | "queue_display";

export type SessionData = {
  isSuperAdmin?: boolean;
  tenantId?: string;
  tenantCode?: string;
  businessName?: string;
  tenantRole?: TenantRole;
  staffId?: string;
  name?: string;
  displayUnlocked?: boolean;
};

export function getGateSession() {
  return useSession<SessionData>({
    password: process.env.SESSION_SECRET || "dev-secret-please-change-me-in-production-32ch",
    name: "gencb-kasir-session",
    maxAge: 60 * 60 * 24 * 30,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    },
  });
}

export function jakartaToday(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}
