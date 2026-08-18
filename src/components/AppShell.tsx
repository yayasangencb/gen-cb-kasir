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
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { logout } from "@/lib/auth.functions";
import { SweetAlertModal } from "@/components/SweetAlertModal";

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
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  const confirmLogout = async () => {
    await doLogout({});
    toast.success("Keluar akun berhasil");
    await router.navigate({ to: "/login" });
  };

  const isAdmin = staff?.role === "admin" || staff?.role === "super_admin";
  const outletTitle = staff?.outletName ?? "Kasir Outlet";

  return (
    <div className="flex min-h-screen bg-[#FAFAFB] font-sans">
      <aside className="hidden w-64 flex-col border-r border-[#E5E7EB] bg-white md:flex shadow-xs">
        {/* Outlet Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[#E5E7EB]">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#2952E3] text-white font-black text-xl shadow-md border border-[#2952E3]/20 shrink-0">
            {outletTitle.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-bold">OUTLET KASIR</div>
            <div className="text-sm font-extrabold text-[#111827] truncate" title={outletTitle}>
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
                  className="flex items-center justify-between rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-[#FAFAFB] hover:text-[#2952E3] transition active:scale-95"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-[#2952E3]" />
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
                className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition active:scale-95 ${
                  active
                    ? "text-white shadow-md bg-gradient-to-r from-[#2952E3] to-[#1E40AF]"
                    : "text-slate-600 hover:bg-[#FAFAFB] hover:text-[#111827]"
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
              className="mt-4 flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs font-extrabold text-amber-900 hover:bg-amber-100 transition active:scale-95"
            >
              <Store className="h-4 w-4 text-[#F97316]" />
              Panel Super Admin
            </Link>
          )}
        </nav>

        {/* Active Staff Footer */}
        <div className="p-3 border-t border-[#E5E7EB]">
          <div className="rounded-2xl bg-[#FAFAFB] p-3 border border-[#E5E7EB]">
            <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-semibold">Petugas Aktif</div>
            <div className="truncate font-extrabold text-[#111827] text-xs">{staff?.name}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="inline-flex rounded-full bg-[#2952E3]/10 px-2.5 py-0.5 text-[9px] font-black text-[#2952E3] uppercase tracking-wide">
                {staff?.role === "admin" ? "Admin Kasir" : staff?.role === "kasir" ? "Kasir POS" : staff?.role}
              </span>
            </div>
            <button
              onClick={() => setShowLogoutAlert(true)}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2 text-xs font-bold text-rose-600 border border-[#E5E7EB] shadow-xs transition hover:bg-rose-50 active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" /> Keluar Akun
            </button>
          </div>
        </div>
      </aside>

      <main className={`flex-1 ${fullBleed ? "" : "p-6"}`}>{children}</main>

      {/* Logout Confirmation SweetAlert */}
      {showLogoutAlert && (
        <SweetAlertModal
          type="warning"
          title="Keluar dari Akun Kasir?"
          message="Sesi login Anda akan diakhiri. Anda perlu memasukkan PIN/Email kembali untuk masuk."
          showCancel
          cancelText="Batal"
          confirmText="Ya, Keluar"
          onConfirm={() => {
            setShowLogoutAlert(false);
            confirmLogout();
          }}
          onCancel={() => setShowLogoutAlert(false)}
        />
      )}
    </div>
  );
}
