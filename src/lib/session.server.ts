import { useSession } from "@tanstack/react-start/server";

export type SessionRole = "super_admin" | "tenant_admin" | "cashier" | "customer_display" | "queue_display" | "admin" | "kasir";

export type SessionData = {
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
  staffId?: string;
  memberId?: string;
  deviceId?: string;
  name?: string;
  role?: SessionRole;
  isSuperAdmin?: boolean;
  displayUnlocked?: boolean;
};

export function getGateSession() {
  return useSession<SessionData>({
    password: process.env.SESSION_SECRET || "dev-secret-please-change-me-in-production-32ch",
    name: "gencb-kasir",
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
