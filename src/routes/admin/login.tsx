import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, ArrowLeft, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { loginWithEmailPassword } from "@/lib/auth.functions";
import logoAsset from "@/assets/gen-cb-logo.png.asset.json";

export const Route = createFileRoute("/admin/login")({
  component: SuperAdminLoginPage,
  head: () => ({ meta: [{ title: "Super Admin Login — Gen CB Kasir" }] }),
});

function SuperAdminLoginPage() {
  const router = useRouter();
  const login = useServerFn(loginWithEmailPassword);
  const [email, setEmail] = useState("yayasangencb@gmail.com");
  const [password, setPassword] = useState("Generasicerdasberaksi_");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      const res = await login({ data: { email, password } });
      if (!res.ok) {
        toast.error(res.error || "Login gagal");
        return;
      }
      toast.success(`Selamat datang, Super Admin (${res.staff.name})`);
      await router.navigate({ to: "/admin/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal login Super Admin");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-slate-900 text-slate-100 font-sans">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl">
        <a
          href="/login"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Login PIN Kasir
        </a>

        <div className="flex items-center gap-3 mb-6">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white p-2 shadow-lg">
            <img src={logoAsset.url} alt="Logo GEN-CB" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-400 font-bold">PUSAT KONTROL</div>
            <h1 className="text-xl font-black text-white">Login Super Admin</h1>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          Login khusus Super Admin untuk membuat outlet baru, menghubungkan Admin Kasir & Kasir, dan mengelola PIN.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Super Admin</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yayasangencb@gmail.com"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <b>Kredensial Super Admin:</b>
              <br />
              Email: <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-200">yayasangencb@gmail.com</code>
              <br />
              Password: <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-200">Generasicerdasberaksi_</code>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3.5 rounded-xl transition shadow-lg disabled:opacity-50"
          >
            {busy ? "Memeriksa Kredensial..." : "Masuk ke Panel Super Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
