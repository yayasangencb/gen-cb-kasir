import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Coffee, Delete, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { loginWithPin } from "@/lib/auth.functions";

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
      toast.success(`Selamat datang, ${res.staff.name}`);
      if (res.staff.role === "admin") await router.navigate({ to: "/kasir" });
      else if (res.staff.role === "kasir") await router.navigate({ to: "/kasir" });
      else await router.navigate({ to: "/kasir" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login gagal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-card grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl md:grid-cols-2">
        {/* Left panel */}
        <div className="relative overflow-hidden p-10 text-white" style={{ background: "linear-gradient(135deg, #002B7F, #0047B3 60%, #00A3FF)" }}>
          <div className="absolute -top-16 -right-10 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 -left-10 h-56 w-56 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(255,122,0,0.35), transparent)" }} />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                <Coffee className="h-8 w-8" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-white/70">GEN-CB</div>
                <div className="text-3xl font-extrabold">Gen CB Kasir</div>
              </div>
            </div>
            <p className="mt-8 text-white/85">
              Aplikasi kasir modern untuk kafe, kantin, dan bazar GEN-CB. Cepat, ramah tablet, dan mudah digunakan.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/85">
              <li>• Transaksi cepat dengan sekali sentuh</li>
              <li>• Perhitungan kembalian otomatis</li>
              <li>• Struk instan & riwayat lengkap</li>
            </ul>
            <div className="mt-10 rounded-2xl bg-white/10 p-4 text-xs text-white/80 backdrop-blur">
              <div className="mb-1 flex items-center gap-2 font-semibold text-white">
                <ShieldCheck className="h-4 w-4" /> PIN Demo
              </div>
              Admin: <b>1234</b> · Kasir: <b>2222</b> · Dapur: <b>3333</b>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="p-8 md:p-10">
          <h2 className="text-2xl font-bold text-[color:var(--brand-deep)]">Masuk dengan PIN</h2>
          <p className="mt-1 text-sm text-muted-foreground">Masukkan PIN petugas untuk mulai bekerja.</p>

          <div className="mt-6 flex justify-center gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full border-2 transition ${
                  i < pin.length
                    ? "border-[color:var(--brand)] bg-[color:var(--brand)]"
                    : "border-border bg-transparent"
                }`}
              />
            ))}
          </div>

          <div className="mx-auto mt-6 grid max-w-xs grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => press(String(n))}
                className="h-16 rounded-2xl bg-white text-2xl font-bold shadow-sm ring-1 ring-border transition active:scale-95 hover:bg-[color:var(--brand)]/5"
              >
                {n}
              </button>
            ))}
            <button
              onClick={clear}
              className="h-16 rounded-2xl bg-white text-sm font-semibold text-muted-foreground shadow-sm ring-1 ring-border active:scale-95"
            >
              Hapus
            </button>
            <button
              onClick={() => press("0")}
              className="h-16 rounded-2xl bg-white text-2xl font-bold shadow-sm ring-1 ring-border transition active:scale-95 hover:bg-[color:var(--brand)]/5"
            >
              0
            </button>
            <button
              onClick={back}
              className="grid h-16 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-border active:scale-95"
            >
              <Delete className="h-6 w-6 text-muted-foreground" />
            </button>
          </div>

          <button
            onClick={submit}
            disabled={busy || pin.length < 3}
            className="btn-brand mt-6 w-full rounded-2xl py-4 text-base font-bold disabled:opacity-50"
          >
            {busy ? "Memeriksa..." : "Masuk"}
          </button>
        </div>
      </div>
    </div>
  );
}
