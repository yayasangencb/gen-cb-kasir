import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Monitor,
  PackagePlus,
  Plus,
  Settings,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { dashboardSummary } from "@/lib/pos.functions";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Gen CB Kasir" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    if (staff.role === "kasir") throw redirect({ to: "/kasir" });
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: DashboardPage,
});

function DashboardPage() {
  const staff = Route.useLoaderData();
  const fetchSummary = useServerFn(dashboardSummary);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => fetchSummary({}),
    refetchInterval: 15000,
  });

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[color:var(--brand-deep)]">Dashboard Ringkasan</h1>
            <p className="text-sm text-muted-foreground">
              Selamat datang kembali, <b>{staff.name}</b>. Berikut statistik penjualan hari ini.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/kasir"
              className="btn-brand inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-md"
            >
              <LayoutGrid className="h-4 w-4" /> Buka Kasir
            </Link>
            <a
              href="/display-pesanan"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[color:var(--brand-deep)] ring-1 ring-border shadow-sm hover:bg-secondary"
            >
              <Monitor className="h-4 w-4" /> Display Pesanan
            </a>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            title="Omzet Hari Ini"
            value={isLoading ? "..." : rupiah(data?.omzetToday ?? 0)}
            subtitle={`${data?.countToday ?? 0} Transaksi berhasil`}
            icon={TrendingUp}
            color="blue"
          />
          <MetricCard
            title="Barang Terjual"
            value={isLoading ? "..." : `${data?.itemsToday ?? 0} Unit`}
            subtitle="Total item dipesan hari ini"
            icon={ShoppingBag}
            color="orange"
          />
          <MetricCard
            title="Sedang Diproses"
            value={isLoading ? "..." : `${data?.processing ?? 0} Pesanan`}
            subtitle="Sedang disiapkan di dapur"
            icon={Clock}
            color="yellow"
          />
          <MetricCard
            title="Pesanan Selesai"
            value={isLoading ? "..." : `${data?.completed ?? 0} Pesanan`}
            subtitle="Siap diambil / disajikan"
            icon={CheckCircle2}
            color="green"
          />
        </div>

        {/* Action Shortcuts */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            <ShortcutButton to="/kasir" icon={LayoutGrid} label="Kasir POS" />
            <ShortcutButton to="/pesanan-aktif" icon={Clock} label="Pesanan Aktif" />
            <ShortcutButton to="/produk" icon={PackagePlus} label="Tambah Produk" />
            <ShortcutButton to="/stok" icon={Boxes} label="Tambah Stok" />
            <ShortcutButton to="/omzet" icon={BarChart3} label="Lihat Omzet" />
            <ShortcutButton to="/pengaturan" icon={Settings} label="Pengaturan Toko" />
          </div>
        </div>

        {/* Middle Section: Stock Alerts & Top Products */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Stock Alerts */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-extrabold text-[color:var(--brand-deep)]">Peringatan Stok</h2>
                </div>
                <Link to="/stok" className="text-xs font-bold text-[color:var(--brand)] hover:underline">
                  Kelola Stok →
                </Link>
              </div>

              {isLoading ? (
                <div className="h-28 animate-pulse rounded-2xl bg-secondary" />
              ) : (data?.lowStock.length ?? 0) === 0 && (data?.outOfStock.length ?? 0) === 0 ? (
                <div className="rounded-2xl bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-700">
                  ✓ Semua stok produk dalam kondisi aman.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(data?.outOfStock ?? []).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 border border-red-200"
                    >
                      <span>{p.name}</span>
                      <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs text-white font-extrabold">
                        Habis
                      </span>
                    </div>
                  ))}
                  {(data?.lowStock ?? []).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 border border-amber-200"
                    >
                      <span>{p.name}</span>
                      <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs text-white font-extrabold">
                        Tersisa {p.stock}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-border pt-3 flex justify-between text-xs text-muted-foreground">
              <span>Total Produk Aktif: <b>{data?.productCount ?? 0}</b></span>
              <span>Diperbarui otomatis</span>
            </div>
          </div>

          {/* Top Products Today */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-[color:var(--brand-deep)]">Produk Terlaris Hari Ini</h2>
              <Link to="/omzet" className="text-xs font-bold text-[color:var(--brand)] hover:underline">
                Laporan Lengkap →
              </Link>
            </div>

            {isLoading ? (
              <div className="h-28 animate-pulse rounded-2xl bg-secondary" />
            ) : (data?.topProducts.length ?? 0) === 0 ? (
              <div className="rounded-2xl bg-secondary p-8 text-center text-sm text-muted-foreground">
                Belum ada penjualan hari ini.
              </div>
            ) : (
              <div className="space-y-3">
                {(data?.topProducts ?? []).map((tp, idx) => (
                  <div key={tp.name} className="flex items-center justify-between rounded-2xl bg-secondary/70 p-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-[color:var(--brand)] text-xs font-extrabold text-white">
                        #{idx + 1}
                      </div>
                      <span className="font-semibold text-sm">{tp.name}</span>
                    </div>
                    <span className="font-extrabold text-[color:var(--brand-deep)] text-sm">{tp.qty} Terjual</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "orange" | "yellow" | "green";
}) {
  const bgStyles = {
    blue: "from-[#002B7F] to-[#0047B3] text-white",
    orange: "from-[#FF7A00] to-[#FF9E3D] text-white",
    yellow: "from-[#FFB000] to-[#FFC44D] text-[color:var(--brand-deep)]",
    green: "from-[#22C55E] to-[#16A34A] text-white",
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${bgStyles[color]} p-5 shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider font-extrabold opacity-90">{title}</span>
        <div className="rounded-xl bg-white/20 p-2 backdrop-blur">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 text-2xl sm:text-3xl font-black">{value}</div>
      <div className="mt-1 text-xs opacity-85">{subtitle}</div>
    </div>
  );
}

function ShortcutButton({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-secondary/80 p-4 text-center transition hover:bg-[color:var(--brand)]/10 hover:text-[color:var(--brand-deep)] active:scale-95 border border-border/50"
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-border text-[color:var(--brand-deep)]">
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xs font-bold">{label}</span>
    </Link>
  );
}
