import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Delete, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { loginWithPin } from "@/lib/auth.functions";
import logoAsset from "@/assets/gen-cb-logo.png.asset.json";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Masuk — Gen CB Kasir" }] }),
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
        toast.error(res.error || "PIN tidak valid");
        setPin("");
        return;
      }
      toast.success(`Selamat datang kembali, ${res.name || "Petugas"}`);
      if (res.redirect) {
        await router.navigate({ to: res.redirect as any });
      } else {
        await router.navigate({ to: "/kasir" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal masuk");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[color:var(--bg-soft,#F7F9FC)]">
      <div className="glass-card grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl md:grid-cols-2 shadow-2xl border border-border/80">
        {/* Left Branding Panel */}
        <div
          className="relative overflow-hidden p-8 md:p-12 text-white flex flex-col justify-between"
          style={{ background: "linear-gradient(135deg, #002B7F 0%, #0047B3 60%, #00A3FF 100%)" }}
        >
          <div className="absolute -top-16 -right-10 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div
            className="absolute bottom-0 -left-10 h-56 w-56 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(closest-side, rgba(255,122,0,0.35), transparent)" }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white p-2 shadow-xl">
                <img src={logoAsset.url} alt="Logo GEN-CB" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-white/80 font-bold">Yayasan GEN-CB</div>
                <div className="text-3xl font-extrabold tracking-tight">GEN-CB Kasir</div>
              </div>
            </div>
            <p className="mt-8 text-sm leading-relaxed text-white/90 font-medium">
              Sistem Kasir Produksi & Manajemen Antrean Penjualan Yayasan Generasi Cerdas Beraksi. Cepat, aman, dan siap operasional.
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-white/85 font-medium">
              <li className="flex items-center gap-2">• Transaksi kasir cepat & akurat untuk tablet</li>
              <li className="flex items-center gap-2">• Sinkronisasi antrean real-time ke Display Pesanan</li>
              <li className="flex items-center gap-2">• Laporan omzet dan audit pergerakan stok otomatis</li>
            </ul>
          </div>

          <div className="relative z-10 mt-8 rounded-2xl bg-white/10 p-4 text-xs text-white/90 backdrop-blur border border-white/20">
            <div className="flex items-center gap-2 font-bold mb-1">
              <Lock className="h-4 w-4 text-amber-300" /> Otentikasi Petugas
            </div>
            Gunakan PIN terdaftar untuk masuk ke sistem Kasir atau Panel Administrator.
          </div>
        </div>

        {/* Right PIN Keypad Panel */}
        <div className="p-8 md:p-10 flex flex-col justify-center bg-white">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-extrabold text-[color:var(--brand-deep)]">Masuk Sistem Kasir</h2>
            <p className="mt-1 text-sm text-muted-foreground">Masukkan PIN petugas Anda untuk mulai bekerja.</p>
          </div>

          <div className="mt-8 flex justify-center gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full border-2 transition-all ${
                  i < pin.length
                    ? "border-[color:var(--brand)] bg-[color:var(--brand)] scale-110 shadow-sm"
                    : "border-border bg-secondary"
                }`}
              />
            ))}
          </div>

          <div className="mx-auto mt-8 grid max-w-xs grid-cols-3 gap-3 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => press(String(n))}
                className="h-16 rounded-2xl bg-secondary/80 text-2xl font-black text-[color:var(--brand-deep)] shadow-sm ring-1 ring-border/60 transition active:scale-95 hover:bg-[color:var(--brand)]/10"
              >
                {n}
              </button>
            ))}
            <button
              onClick={clear}
              className="h-16 rounded-2xl bg-secondary/80 text-xs font-extrabold text-muted-foreground shadow-sm ring-1 ring-border/60 active:scale-95 hover:bg-secondary"
            >
              C
            </button>
            <button
              onClick={() => press("0")}
              className="h-16 rounded-2xl bg-secondary/80 text-2xl font-black text-[color:var(--brand-deep)] shadow-sm ring-1 ring-border/60 transition active:scale-95 hover:bg-[color:var(--brand)]/10"
            >
              0
            </button>
            <button
              onClick={back}
              className="grid h-16 place-items-center rounded-2xl bg-secondary/80 shadow-sm ring-1 ring-border/60 active:scale-95 hover:bg-secondary"
            >
              <Delete className="h-6 w-6 text-muted-foreground" />
            </button>
          </div>

          <button
            onClick={submit}
            disabled={busy || pin.length < 3}
            className="btn-brand mt-8 w-full rounded-2xl py-4 text-base font-extrabold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Memeriksa PIN..." : "Masuk Sistem"}
          </button>

          <div className="mt-4 text-center">
            <a href="/admin" className="text-xs font-bold text-muted-foreground hover:text-[color:var(--brand)] transition">
              Portal Super Admin Platform (/admin) →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
