import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, KeyRound, LogIn, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { loginTenantWithPin } from "@/lib/auth.functions";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login POS — GEN-CB Kasir" }] }),
  component: TenantLoginPage,
});

function TenantLoginPage() {
  const navigate = useNavigate();
  const doTenantLogin = useServerFn(loginTenantWithPin);

  const [tenantCode, setTenantCode] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [lockoutError, setLockoutError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockoutError(null);

    if (!tenantCode.trim()) {
      toast.error("Kode Tenant / Usaha wajib diisi");
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      toast.error("PIN minimal 4 digit");
      return;
    }

    setBusy(true);
    try {
      const res = await doTenantLogin({
        data: {
          tenant_code: tenantCode.trim().toUpperCase(),
          pin: pin.trim(),
        },
      });

      if (!res.ok) {
        setLockoutError(res.error);
        toast.error(res.error);
        setPin("");
      } else {
        toast.success(`Selamat datang di ${res.tenant.name}!`);
        navigate({ to: res.redirect });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal login tenant";
      setLockoutError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const pressDigit = (digit: string) => {
    if (pin.length < 10) setPin((prev) => prev + digit);
  };

  const backspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(circle at top, #002B7F 0%, #001238 100%)" }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Logo Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#FF7A00] to-[#FFB000] shadow-xl text-white font-black text-2xl">
            GEN
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">GEN CB KASIR</h1>
          <p className="text-xs text-blue-200/80 font-medium">Sistem Kasir & Display Multi-Tenant POS SaaS</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="rounded-3xl bg-white/10 p-6 sm:p-8 backdrop-blur-xl border border-white/20 shadow-2xl space-y-5">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#FFB000] border-b border-white/10 pb-3">
            <KeyRound className="h-4 w-4" /> Masuk Akses Usaha (PIN Only)
          </div>

          {lockoutError && (
            <div className="rounded-2xl bg-red-500/20 border border-red-500/40 p-3.5 text-xs text-red-200 font-bold flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span>{lockoutError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-blue-100 mb-1">Kode Tenant / Usaha</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: KK001"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 py-3.5 pl-10 pr-4 text-sm font-black text-white tracking-wider outline-none uppercase placeholder:text-blue-200/40 focus:border-[#FF7A00] focus:bg-white/20 transition"
                />
                <Store className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-200/50" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-100 mb-1">PIN Akses (Min. 4 Digit)</label>
              <input
                type="password"
                required
                readOnly
                value={pin}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[0.5em] text-2xl font-black rounded-2xl border border-white/20 bg-white/10 py-3.5 px-4 text-white outline-none placeholder:text-blue-200/40 placeholder:tracking-normal placeholder:text-sm focus:border-[#FF7A00] focus:bg-white/20 transition"
              />
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => pressDigit(n)}
                className="rounded-2xl bg-white/10 py-3.5 text-lg font-black text-white hover:bg-white/20 active:scale-95 transition"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={backspace}
              className="rounded-2xl bg-white/10 py-3.5 text-xs font-extrabold text-red-300 hover:bg-red-500/20 active:scale-95 transition"
            >
              Hapus
            </button>
            <button
              type="button"
              onClick={() => pressDigit("0")}
              className="rounded-2xl bg-white/10 py-3.5 text-lg font-black text-white hover:bg-white/20 active:scale-95 transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin("")}
              className="rounded-2xl bg-white/10 py-3.5 text-xs font-extrabold text-blue-200 hover:bg-white/20 active:scale-95 transition"
            >
              Reset
            </button>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full btn-orange rounded-2xl py-4 text-sm font-extrabold shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            {busy ? "Memverifikasi PIN..." : "Masuk Sistem Kasir"}
          </button>
        </form>

        <div className="text-center space-y-1">
          <a href="/admin/login" className="text-xs text-blue-200/70 hover:text-white font-bold underline transition">
            Portal Login Super Admin GEN-CB &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
