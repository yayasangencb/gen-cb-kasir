import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, LogIn, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { loginSuperAdmin } from "@/lib/auth.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Login Super Admin — GEN-CB Kasir" }] }),
  component: SuperAdminLoginPage,
});

function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const doSuperAdminLogin = useServerFn(loginSuperAdmin);

  const [email, setEmail] = useState("yayasangencb@gmail.com");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Email dan password wajib diisi");
      return;
    }

    setBusy(true);
    try {
      const res = await doSuperAdminLogin({ data: { email: email.trim(), password } });
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Selamat datang, Super Admin GEN-CB!");
        navigate({ to: "/admin" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal login Super Admin");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(circle at top, #002B7F 0%, #001238 100%)" }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#FF7A00] to-[#FFB000] shadow-xl text-white font-black text-2xl">
            GEN
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Portal Super Admin</h1>
          <p className="text-xs text-blue-200/80 font-medium">Sistem Pengelolaan Multi-Tenant Kasir SaaS GEN-CB</p>
        </div>

        {/* Login Form Card */}
        <form onSubmit={handleSubmit} className="rounded-3xl bg-white/10 p-6 sm:p-8 backdrop-blur-xl border border-white/20 shadow-2xl space-y-5">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#FFB000] border-b border-white/10 pb-3">
            <ShieldCheck className="h-4 w-4" /> Autentikasi Pengelola Utama
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-blue-100 mb-1">Email Super Admin</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yayasangencb@gmail.com"
                className="w-full rounded-2xl border border-white/20 bg-white/10 py-3.5 px-4 text-sm font-semibold text-white outline-none placeholder:text-blue-200/40 focus:border-[#FF7A00] focus:bg-white/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-100 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 py-3.5 px-4 text-sm font-semibold text-white outline-none placeholder:text-blue-200/40 focus:border-[#FF7A00] focus:bg-white/20 transition pr-10"
                />
                <Lock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-200/50" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full btn-orange rounded-2xl py-4 text-sm font-extrabold shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            {busy ? "Memverifikasi..." : "Masuk ke Panel Super Admin"}
          </button>
        </form>

        <div className="text-center text-xs text-blue-200/60 font-semibold">
          Antarmuka Pengelolaan Multi-UKM SaaS GEN-CB Kasir &copy; 2026
        </div>
      </div>
    </div>
  );
}
