import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Delete, ShieldCheck, UserCheck, KeyRound, Store } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { loginWithPin } from "@/lib/auth.functions";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Login Staff Kasir" }] }),
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
    <div className="flex min-h-screen items-center justify-center p-6 bg-slate-900 font-sans">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 overflow-hidden rounded-3xl bg-slate-800 border border-slate-700 shadow-2xl">
        {/* Left Side: Store & Role Info */}
        <div className="p-10 bg-gradient-to-br from-slate-900 to-blue-950 text-white flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-700">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl grid place-items-center shadow-lg border border-amber-400">
                <Store className="h-7 w-7" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-amber-400 font-extrabold">APLIKASI KASIR</div>
                <h1 className="text-2xl font-black text-white">Login Staff Outlet</h1>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Masukkan PIN unik 4-digit yang telah diberikan oleh Super Admin untuk masuk ke sistem toko Anda.
            </p>

            <div className="space-y-3 rounded-2xl bg-slate-900/80 p-4 border border-slate-700/80 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <KeyRound className="h-4 w-4" /> PIN Akses Otomatis Mengenali Outlet:
              </div>
              <div className="space-y-1.5 font-medium">
                <div>• <b>Admin Kasir PIN</b>: Mengelola Stok, Omzet, Produk, & Pengaturan Promo</div>
                <div>• <b>Kasir PIN</b>: Mengoperasikan POS Transaksi & Display Layar Pelanggan</div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
            <a
              href="/admin/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition underline hover:no-underline"
            >
              <UserCheck className="h-4 w-4" /> Khusus Pembuat / Super Admin (Email & Password) &rarr;
            </a>
          </div>
        </div>

        {/* Right Side: Keypad UI Besar & Nyaman */}
        <div className="p-8 md:p-10 flex flex-col justify-between bg-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-white text-center">Ketuk PIN Anda</h2>
            <p className="text-xs text-slate-400 text-center mt-1">Gunakan Keypad di bawah ini</p>

            {/* PIN Dots Indicator */}
            <div className="mt-6 flex justify-center gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-5 w-5 rounded-full border-2 transition-all duration-300 ${
                    i < pin.length
                      ? "border-amber-400 bg-amber-400 scale-110 shadow-lg shadow-amber-400/30"
                      : "border-slate-600 bg-slate-900"
                  }`}
                />
              ))}
            </div>

            {/* Keypad UI Besar (Touchscreen-friendly) */}
            <div className="mx-auto mt-8 grid max-w-xs grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => press(String(n))}
                  className="h-16 rounded-2xl bg-slate-900 text-white text-3xl font-extrabold shadow-md border border-slate-700 transition active:scale-95 hover:bg-slate-700 hover:border-amber-400 flex items-center justify-center"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={clear}
                className="h-16 rounded-2xl bg-rose-950/40 text-rose-400 text-xs font-bold shadow-md border border-rose-900/50 active:scale-95 hover:bg-rose-900/60 flex items-center justify-center"
              >
                KOSONG
              </button>
              <button
                onClick={() => press("0")}
                className="h-16 rounded-2xl bg-slate-900 text-white text-3xl font-extrabold shadow-md border border-slate-700 transition active:scale-95 hover:bg-slate-700 hover:border-amber-400 flex items-center justify-center"
              >
                0
              </button>
              <button
                onClick={back}
                className="h-16 rounded-2xl bg-slate-900 text-slate-400 text-sm font-bold shadow-md border border-slate-700 active:scale-95 hover:bg-slate-700 hover:text-white flex items-center justify-center"
              >
                <Delete className="h-6 w-6" />
              </button>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={busy || pin.length < 3}
            className="mt-6 w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 py-4 text-base font-black transition shadow-xl disabled:opacity-40"
          >
            {busy ? "Memeriksa PIN..." : "Masuk ke Sistem Toko"}
          </button>
        </div>
      </div>
    </div>
  );
}
