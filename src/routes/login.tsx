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
        await router.navigate({ to: "/produk" });
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
    <div className="flex min-h-screen items-center justify-center p-6 bg-slate-100">
      <div className="glass-card grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl md:grid-cols-2 shadow-xl">
        {/* Left panel */}
        <div
          className="relative overflow-hidden p-10 text-white flex flex-col justify-between"
          style={{ background: "linear-gradient(135deg, #003B8F 0%, #003B8F 55%, #1E6FD9 100%)" }}
        >
          <div className="absolute -top-16 -right-10 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div
            className="absolute bottom-0 -left-10 h-56 w-56 rounded-full"
            style={{ background: "radial-gradient(closest-side, rgba(255,122,0,0.35), transparent)" }}
          />
          <div className="relative">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white p-2 shadow-lg">
                <img src={logoAsset.url} alt="Logo GEN-CB" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-white/70">Yayasan GEN-CB</div>
                <div className="text-3xl font-extrabold">GEN-CB Kasir</div>
              </div>
            </div>
            <p className="mt-8 text-white/85">
              Aplikasi kasir internal Yayasan Generasi Cerdas Beraksi dengan sistem Multi-Outlet terisolasi.
            </p>

            <ul className="mt-6 space-y-2 text-sm text-white/85">
              <li>• Multi-Tenant Outlet terpisah</li>
              <li>• Admin Kasir untuk kelola stok toko</li>
              <li>• Kasir POS & Layar Display Antrean</li>
            </ul>

            <div className="mt-8 rounded-2xl bg-white/10 p-4 text-xs text-white/80 backdrop-blur">
              <div className="mb-2 flex items-center gap-2 font-semibold text-white">
                <ShieldCheck className="h-4 w-4" /> Contoh PIN Demo Unik:
              </div>
              <div className="space-y-1">
                <div><b>Kopi Kenangan:</b> Admin <span className="underline">1234</span> · Kasir <span className="underline">2222</span></div>
                <div><b>Starbucks:</b> Admin <span className="underline">1111</span> · Kasir <span className="underline">3333</span></div>
              </div>
            </div>
          </div>

          <div className="relative mt-8 pt-4 border-t border-white/20">
            <a
              href="/admin/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-white/90 hover:text-white underline hover:no-underline"
            >
              <UserCheck className="h-4 w-4" /> Login Super Admin (Email & Password) &rarr;
            </a>
          </div>
        </div>

        {/* Right panel */}
        <div className="p-8 md:p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-[color:var(--brand-deep)]">Masuk dengan PIN</h2>
          <p className="mt-1 text-sm text-muted-foreground">Masukkan PIN Admin Kasir atau Kasir outlet Anda.</p>

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
            {busy ? "Memeriksa PIN..." : "Masuk"}
          </button>
        </div>
      </div>
    </div>
  );
}
