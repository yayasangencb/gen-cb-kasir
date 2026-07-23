import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LayoutGrid, LogOut, Package, Receipt, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { toast } from "sonner";
import { logout } from "@/lib/auth.functions";
import logoAsset from "@/assets/gen-cb-logo.png.asset.json";


type NavItem = { to: "/kasir" | "/produk" | "/transaksi"; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { to: "/kasir", label: "Kasir", icon: LayoutGrid },
  { to: "/produk", label: "Produk", icon: Package },
  { to: "/transaksi", label: "Transaksi", icon: Receipt },
];

export function AppShell({
  children,
  staff,
  fullBleed = false,
}: {
  children: ReactNode;
  staff: { name: string; role: string } | null;
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
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r border-border/60 bg-white/70 backdrop-blur md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white p-1 ring-1 ring-border">
            <img src={logoAsset.url} alt="Logo GEN-CB" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Yayasan GEN-CB</div>
            <div className="text-lg font-extrabold text-[color:var(--brand-deep)]">GEN-CB Kasir</div>
          </div>

        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
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
        </nav>

        <div className="p-3">
          <div className="rounded-2xl bg-secondary p-3">
            <div className="text-xs text-muted-foreground">Masuk sebagai</div>
            <div className="truncate font-semibold text-[color:var(--brand-deep)]">{staff?.name}</div>
            <div className="mt-0.5 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--brand)]">
              {staff?.role}
            </div>
            <button
              onClick={onLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2 text-sm font-semibold text-destructive ring-1 ring-border transition hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        </div>
      </aside>

      <main className={`flex-1 ${fullBleed ? "" : "p-6"}`}>{children}</main>
    </div>
  );
}
