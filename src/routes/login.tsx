import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Delete, ShieldCheck, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { loginWithPin } from "@/lib/auth.functions";
import logoAsset from "@/assets/gen-cb-logo.png.asset.json";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Login — Gen CB Kasir" }] }),
});

function LoginPage() {
  const router = useRouter();
  const login = useServerFn(loginWithPin);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const press = (n: string) => {
    if (pin.length >= 8) return;
    setPin((p) => p + n);
  };
  const clear = () => setPin("");
  const back = () => setPin((p) => p.slice(0, -1));

  const submit = async () => {
    if (pin.length < 3) return;
    setBusy(true);
    try {
      const res = await login({ data: { pin } });
      if (!res.ok) {
        toast.error(res.error || "PIN salah");
        setPin("");
        return;
      }
      toast.success(`Selamat datang, ${res.staff.name} (${res.staff.outletName ?? "Toko"})`);
      if (res.staff.role === "admin") {
        await router.navigate({ to: "/omzet" });
      } else {
        await router.navigate({ to: "/kasir" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-slate-100 font-sans">
      <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl md:grid-cols-2 shadow-2xl bg-white border border-slate-200">
        {/* Left Side: Branding Sebelum Login (Gen CB Kasir) */}
        <div
          className="relative overflow-hidden p-10 text-white flex flex-col justify-between"
          style={{ background: "linear-gradient(135deg, #003B8F 0%, #003B8F 55%, #1E6FD9 100%)" }}
        >
          <div className="absolute -top-16 -right-10 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div
            className="absolute bottom-0 -left-10 h-56 w-56 rounded-full"
            style={{ background: "radial-gradient(closest-side, rgba(255,122,0,0.4), transparent)" }}
          />
          <div className="relative">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white p-2 shadow-lg">
                <img src={logoAsset.url} alt="Logo GEN-CB" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-white/80 font-semibold">Yayasan GEN-CB</div>
                <div className="text-3xl font-extrabold text-white">Gen CB Kasir</div>
              </div>
            </div>
            <p className="mt-8 text-white/90 leading-relaxed font-medium">
              Aplikasi kasir internal Yayasan Generasi Cerdas Beraksi dengan sistem Multi-Outlet terisolasi penuh.
            </p>

            <div className="mt-8 rounded-2xl bg-white/10 p-4 text-xs text-white/90 backdrop-blur border border-white/20">
              <div className="mb-2 flex items-center gap-2 font-bold text-amber-300">
                <ShieldCheck className="h-4 w-4" /> PIN Login Staff Outlet:
              </div>
              <div className="space-y-1 font-medium">
                <div>• <b>Admin Kasir PIN</b>: Stok, Omzet, Produk, & Promo Outlet</div>
                <div>• <b>Kasir PIN</b>: POS Transaksi & Display Layar Pelanggan</div>
              </div>
            </div>
          </div>

          <div className="relative mt-8 pt-4 border-t border-white/20">
            <a
              href="/admin/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 hover:text-white underline hover:no-underline transition"
            >
              <UserCheck className="h-4 w-4" /> Login Super Admin (Email & Password) &rarr;
            </a>
          </div>
        </div>

        {/* Right Side: Keypad PIN UI (Putih, Biru, Oranye) */}
        <div className="p-8 md:p-10 flex flex-col justify-between bg-white">
          <div>
            <h2 className="text-2xl font-bold text-[#003B8F] text-center">Masuk dengan PIN</h2>
            <p className="mt-1 text-xs text-slate-500 text-center">Masukkan 4-digit PIN Admin Kasir atau Kasir outlet Anda.</p>

            {/* PIN Dots */}
            <div className="mt-6 flex justify-center gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-5 w-5 rounded-full border-2 transition-all duration-300 ${
                    i < pin.length
                      ? "border-[#FF7A00] bg-[#FF7A00] scale-110 shadow"
                      : "border-slate-300 bg-slate-50"
                  }`}
                />
              ))}
            </div>

            {/* Keypad UI Besar & Nyaman */}
            <div className="mx-auto mt-6 grid max-w-xs grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => press(String(n))}
                  className="h-16 rounded-2xl bg-slate-50 hover:bg-blue-50 text-slate-900 text-2xl font-bold shadow-sm ring-1 ring-slate-200 transition active:scale-95 flex items-center justify-center hover:ring-[#003B8F]"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={clear}
                className="h-16 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold ring-1 ring-rose-200 active:scale-95 flex items-center justify-center"
              >
                Hapus
              </button>
              <button
                onClick={() => press("0")}
                className="h-16 rounded-2xl bg-slate-50 hover:bg-blue-50 text-slate-900 text-2xl font-bold shadow-sm ring-1 ring-slate-200 transition active:scale-95 flex items-center justify-center hover:ring-[#003B8F]"
              >
                0
              </button>
              <button
                onClick={back}
                className="h-16 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 ring-1 ring-slate-200 active:scale-95 flex items-center justify-center"
              >
                <Delete className="h-6 w-6 text-slate-600" />
              </button>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={busy || pin.length < 3}
            className="mt-6 w-full rounded-2xl py-4 text-base font-extrabold text-white transition shadow-lg disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #FF7A00, #FFB000)" }}
          >
            {busy ? "Memeriksa PIN..." : "Masuk ke System Toko"}
          </button>
        </div>
      </div>
    </div>
  );
}
