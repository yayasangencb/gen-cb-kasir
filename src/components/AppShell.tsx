import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  Boxes,
  Clock,
  FolderTree,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Monitor,
  Package,
  Receipt,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode } from "react";
import { toast } from "sonner";
import { logout } from "@/lib/auth.functions";
import logoAsset from "@/assets/gen-cb-logo.png.asset.json";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
};

const ADMIN_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin", label: "Super Admin Platform", icon: Shield },
  { to: "/kasir", label: "Kasir", icon: LayoutGrid },
  { to: "/pesanan-aktif", label: "Pesanan Aktif", icon: Clock },
  { to: "/display-pesanan", label: "Display Pesanan", icon: Monitor, external: true },
  { to: "/produk", label: "Produk", icon: Package },
  { to: "/kategori", label: "Kategori", icon: FolderTree },
  { to: "/stok", label: "Stok", icon: Boxes },
  { to: "/omzet", label: "Omzet Penjualan", icon: BarChart3 },
  { to: "/transaksi", label: "Transaksi", icon: Receipt },
  { to: "/pengguna", label: "Pengguna", icon: Users },
  { to: "/pengaturan", label: "Pengaturan Toko", icon: Settings },
];

const KASIR_NAV: NavItem[] = [
  { to: "/kasir", label: "Kasir", icon: LayoutGrid },
  { to: "/pesanan-aktif", label: "Pesanan Aktif", icon: Clock },
  { to: "/display-pesanan", label: "Display Pesanan", icon: Monitor, external: true },
];

export function AppShell({
  children,
  staff,
  fullBleed = false,
}: {
  children: ReactNode;
  staff: { id?: string; name: string; role: "admin" | "kasir" } | null;
  fullBleed?: boolean;
}) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const doLogout = useServerFn(logout);

  const isAdmin = staff?.role === "admin";
  const navItems = isAdmin ? ADMIN_NAV : KASIR_NAV;

  const onLogout = async () => {
    await doLogout({});
    toast.success("Berhasil keluar");
    await router.navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-[color:var(--bg-soft,#F7F9FC)]">
      <aside className="hidden w-64 flex-col border-r border-border/60 bg-white/80 backdrop-blur md:flex">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border/40">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white p-1 ring-1 ring-border shadow-sm">
            <img src={logoAsset.url} alt="Logo GEN-CB" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              Yayasan GEN-CB
            </div>
            <div className="text-lg font-extrabold text-[color:var(--brand-deep)]">GEN-CB Kasir</div>
          </div>
        </div>

        <nav className="mt-3 flex flex-1 flex-col gap-1 px-3 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            if (item.external) {
              return (
                <a
                  key={item.to}
                  href={item.to}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-[color:var(--brand)]/5 hover:text-[color:var(--brand-deep)]"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  {item.label}
                </a>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "text-white shadow-md"
                    : "text-muted-foreground hover:bg-[color:var(--brand)]/5 hover:text-[color:var(--brand-deep)]"
                }`}
                style={active ? { background: "linear-gradient(135deg,#002B7F,#0047B3)" } : undefined}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/40">
          <div className="rounded-2xl bg-secondary p-3">
            <div className="text-[11px] text-muted-foreground">Petugas Aktif</div>
            <div className="truncate font-bold text-[color:var(--brand-deep)] text-sm">{staff?.name || "Kasir"}</div>
            <div className="mt-1 inline-flex rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[color:var(--brand)] border border-border">
              {staff?.role === "admin" ? "Administrator" : "Kasir"}
            </div>
            <button
              onClick={onLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2 text-xs font-bold text-destructive ring-1 ring-border transition hover:bg-destructive/5 active:scale-95"
            >
              <LogOut className="h-4 w-4" /> Keluar Akun
            </button>
          </div>
        </div>
      </aside>

      <main className={`flex-1 min-w-0 ${fullBleed ? "" : "p-6"}`}>{children}</main>
    </div>
  );
}
