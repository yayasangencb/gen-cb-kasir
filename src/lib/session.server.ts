import { useSession } from "@tanstack/react-start/server";

export type StaffRole = "admin" | "kasir" | "dapur";

export type SessionData = {
  staffId?: string;
  name?: string;
  role?: StaffRole;
};

export function getGateSession() {
  return useSession<SessionData>({
    password: process.env.SESSION_SECRET || "dev-secret-please-change-me-in-production-32ch",
    name: "gencb-kasir",
    maxAge: 60 * 60 * 12,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    },
  });
}
