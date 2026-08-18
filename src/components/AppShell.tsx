import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LayoutGrid, LogOut, Package, Receipt, Store, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { toast } from "sonner";
import { logout } from "@/lib/auth.functions";
import logoAsset from "@/assets/gen-cb-logo.png.asset.json";

type NavItem = { to: "/kasir" | "/produk" | "/transaksi"; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { to: "/kasir", label: "Kasir POS", icon: LayoutGrid },
  { to: "/produk", label: "Stok Produk", icon: Package },
  { to: "/transaksi", label: "Riwayat Transaksi", icon: Receipt },
];

export function AppShell({
  children,
  staff,
  fullBleed = false,
}: {
  children: ReactNode;
  staff: { name: string; role: string; outletName?: string | null } | null;
  fullBleed?: boolean;
}) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const doLogout = useServerFn(logout);

  const onLogout = async () => {
    await doLogout({});
    toast.success("Keluar berhasil");
    await router.navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-col border-r border-border/60 bg-white/80 backdrop-blur md:flex">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border/40">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white p-1 ring-1 ring-border shadow-sm">
            <img src={logoAsset.url} alt="Logo GEN-CB" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">GEN-CB KASIR</div>
            <div className="text-sm font-extrabold text-[color:var(--brand-deep)] truncate max-w-[140px]">
              {staff?.outletName ?? "Aplikasi Kasir"}
            </div>
          </div>
        </div>

        <nav className="mt-3 flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "text-white shadow-md"
                    : "text-muted-foreground hover:bg-[color:var(--brand)]/5 hover:text-[color:var(--brand-deep)]"
                }`}
                style={active ? { background: "linear-gradient(135deg,#003B8F,#1E6FD9)" } : undefined}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}

          {staff?.role === "super_admin" && (
            <Link
              to="/admin/dashboard"
              className="mt-4 flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm font-bold text-amber-900 hover:bg-amber-500/20 transition"
            >
              <Store className="h-5 w-5 text-amber-700" />
              Panel Super Admin
            </Link>
          )}
        </nav>

        <div className="p-3">
          <div className="rounded-2xl bg-slate-100 p-3 border border-slate-200">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Petugas Aktif</div>
            <div className="truncate font-bold text-slate-900">{staff?.name}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 uppercase tracking-wide">
                {staff?.role === "admin" ? "Admin Kasir" : staff?.role === "kasir" ? "Kasir POS" : staff?.role}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2 text-xs font-bold text-rose-600 ring-1 ring-slate-200 transition hover:bg-rose-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Keluar Akun
            </button>
          </div>
        </div>
      </aside>

      <main className={`flex-1 ${fullBleed ? "" : "p-6"}`}>{children}</main>
    </div>
  );
}
