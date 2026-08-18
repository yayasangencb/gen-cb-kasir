import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutGrid,
  LogOut,
  Package,
  Receipt,
  Store,
  Monitor,
  Clock,
  Layers,
  BarChart3,
  Settings,
  Home,
  type LucideIcon,
  ExternalLink,
  Boxes,
} from "lucide-react";
import { type ReactNode } from "react";
import { toast } from "sonner";
import { logout } from "@/lib/auth.functions";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: "/omzet", label: "Dashboard", icon: Home, adminOnly: true },
  { to: "/kasir", label: "Kasir POS", icon: LayoutGrid },
  { to: "/pesanan-aktif", label: "Pesanan Aktif", icon: Clock },
  { to: "/display-pesanan", label: "Display Pesanan", icon: Monitor, external: true },
  { to: "/produk", label: "Produk", icon: Package, adminOnly: true },
  { to: "/kategori", label: "Kategori", icon: Layers, adminOnly: true },
  { to: "/stok", label: "Stok", icon: Boxes, adminOnly: true },
  { to: "/omzet", label: "Omzet Penjualan", icon: BarChart3, adminOnly: true },
  { to: "/transaksi", label: "Transaksi", icon: Receipt },
  { to: "/pengaturan", label: "Pengaturan Toko", icon: Settings, adminOnly: true },
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

  const isAdmin = staff?.role === "admin" || staff?.role === "super_admin";
  const outletTitle = staff?.outletName ?? "Kasir Outlet";

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="hidden w-64 flex-col border-r border-border/60 bg-white/90 backdrop-blur md:flex">
        {/* Outlet Header - No Gen CB branding here */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border/40">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500 text-slate-950 font-black text-xl shadow-md border border-amber-400 shrink-0">
            {outletTitle.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">OUTLET KASIR</div>
            <div className="text-sm font-extrabold text-slate-900 truncate" title={outletTitle}>
              {outletTitle}
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="mt-3 flex flex-1 flex-col gap-1 px-3 overflow-y-auto">
          {NAV.map((item) => {
            if (item.adminOnly && !isAdmin) return null;

            const active = !item.external && pathname === item.to;
            const Icon = item.icon;

            if (item.external) {
              return (
                <a
                  key={item.label}
                  href={item.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-blue-600" />
                    {item.label}
                  </span>
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
              );
            }

            return (
              <Link
                key={item.label + item.to}
                to={item.to as any}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
                  active
                    ? "text-white shadow-md bg-gradient-to-r from-blue-700 to-blue-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {staff?.role === "super_admin" && (
            <Link
              to="/admin/dashboard"
              className="mt-4 flex items-center gap-3 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 text-xs font-extrabold text-amber-900 hover:bg-amber-500/20 transition"
            >
              <Store className="h-4 w-4 text-amber-700" />
              Panel Super Admin
            </Link>
          )}
        </nav>

        {/* Active Staff Footer */}
        <div className="p-3 border-t border-slate-200">
          <div className="rounded-2xl bg-slate-100 p-3 border border-slate-200">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Petugas Aktif</div>
            <div className="truncate font-extrabold text-slate-900 text-xs">{staff?.name}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black text-blue-800 uppercase tracking-wide">
                {staff?.role === "admin" ? "Admin Kasir" : staff?.role === "kasir" ? "Kasir POS" : staff?.role}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-1.5 text-xs font-bold text-rose-600 ring-1 ring-slate-200 transition hover:bg-rose-50"
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
