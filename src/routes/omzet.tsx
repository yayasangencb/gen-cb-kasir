import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Filter,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  LayoutGrid,
  Clock,
  Boxes,
  Package,
  Settings,
  Receipt,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { omzetReport } from "@/lib/pos.functions";

export const Route = createFileRoute("/omzet")({
  head: () => ({ meta: [{ title: "Dashboard & Omzet — Kasir Outlet" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    if (staff.role !== "admin") throw redirect({ to: "/kasir" });
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: OmzetPage,
});

type PresetRange = "today" | "yesterday" | "7days" | "30days" | "this_month" | "this_year" | "custom";

function getRangeDates(preset: PresetRange, customFrom?: string, customTo?: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (preset === "today") {
    return { from: todayStart.toISOString(), to: todayEnd.toISOString() };
  }
  if (preset === "yesterday") {
    const yStart = new Date(todayStart.getTime() - 86400_000);
    const yEnd = new Date(todayEnd.getTime() - 86400_000);
    return { from: yStart.toISOString(), to: yEnd.toISOString() };
  }
  if (preset === "7days") {
    const s = new Date(todayStart.getTime() - 6 * 86400_000);
    return { from: s.toISOString(), to: todayEnd.toISOString() };
  }
  if (preset === "30days") {
    const s = new Date(todayStart.getTime() - 29 * 86400_000);
    return { from: s.toISOString(), to: todayEnd.toISOString() };
  }
  if (preset === "this_month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    return { from: s.toISOString(), to: todayEnd.toISOString() };
  }
  if (preset === "this_year") {
    const s = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    return { from: s.toISOString(), to: todayEnd.toISOString() };
  }
  return {
    from: customFrom ? new Date(`${customFrom}T00:00:00`).toISOString() : todayStart.toISOString(),
    to: customTo ? new Date(`${customTo}T23:59:59`).toISOString() : todayEnd.toISOString(),
  };
}

function OmzetPage() {
  const staff = Route.useLoaderData();
  const fetchReport = useServerFn(omzetReport);

  const [preset, setPreset] = useState<PresetRange>("7days");
  const [customFrom, setCustomFrom] = useState(
    new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10),
  );
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));

  const { from, to } = useMemo(
    () => getRangeDates(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["omzet-report", from, to],
    queryFn: () => fetchReport({ data: { from, to } }),
  });

  const diffNet = (data?.net ?? 0) - (data?.previousNet ?? 0);
  const percentDiff =
    (data?.previousNet ?? 0) > 0
      ? ((diffNet / (data?.previousNet ?? 1)) * 100).toFixed(1)
      : (data?.net ?? 0) > 0
      ? "100"
      : "0";

  const outletTitle = staff.outletName ?? "Outlet Kasir";

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-3 py-0.5 rounded-full text-xs">
                {outletTitle}
              </span>
              <span className="text-xs text-slate-500 font-bold">PANEL ADMIN KASIR</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">Dashboard & Ringkasan Omzet</h1>
            <p className="text-xs text-slate-500">
              Pengelolaan lengkap stok, omzet penjualan harian, transaksi, dan pengaturan display outlet.
            </p>
          </div>
        </div>

        {/* AKSI CEPAT / QUICK ACTIONS (REVISI 2) */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">AKSI CEPAT ADMIN</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <QuickActionButton to="/kasir" icon={LayoutGrid} label="Kasir POS" color="bg-blue-600 text-white" />
            <QuickActionButton to="/pesanan-aktif" icon={Clock} label="Pesanan Aktif" color="bg-purple-600 text-white" />
            <QuickActionButton to="/stok" icon={Boxes} label="Kelola Stok" color="bg-emerald-600 text-white" />
            <QuickActionButton to="/produk" icon={Package} label="Tambah Produk" color="bg-amber-500 text-slate-950 font-black" />
            <QuickActionButton to="/omzet" icon={BarChart3} label="Lihat Omzet" color="bg-slate-900 text-white" />
            <QuickActionButton to="/transaksi" icon={Receipt} label="Laporan Transaksi" color="bg-teal-600 text-white" />
            <QuickActionButton to="/pengaturan" icon={Settings} label="Pengaturan Toko" color="bg-slate-800 text-white" />
          </div>
        </div>

        {/* Preset & Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mr-2">
            <Filter className="h-4 w-4" /> Periode:
          </div>

          <div className="flex flex-wrap gap-1.5 overflow-x-auto">
            <PresetButton active={preset === "today"} onClick={() => setPreset("today")}>
              Hari Ini
            </PresetButton>
            <PresetButton active={preset === "yesterday"} onClick={() => setPreset("yesterday")}>
              Kemarin
            </PresetButton>
            <PresetButton active={preset === "7days"} onClick={() => setPreset("7days")}>
              7 Hari Terakhir
            </PresetButton>
            <PresetButton active={preset === "30days"} onClick={() => setPreset("30days")}>
              30 Hari Terakhir
            </PresetButton>
            <PresetButton active={preset === "this_month"} onClick={() => setPreset("this_month")}>
              Bulan Ini
            </PresetButton>
            <PresetButton active={preset === "this_year"} onClick={() => setPreset("this_year")}>
              Tahun Ini
            </PresetButton>
            <PresetButton active={preset === "custom"} onClick={() => setPreset("custom")}>
              Rentang Tanggal
            </PresetButton>
          </div>

          {preset === "custom" && (
            <div className="flex items-center gap-2 text-xs font-semibold border-l border-slate-200 pl-3 mt-2 sm:mt-0">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none"
              />
              <span>s/d</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none"
              />
            </div>
          )}
        </div>

        {/* Omzet Net Header Card & Comparison */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl bg-slate-900 p-8 text-white shadow-xl flex flex-col justify-between border border-slate-800">
            <div>
              <div className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
                Total Omzet Bersih ({outletTitle})
              </div>
              <div className="mt-2 text-4xl sm:text-5xl font-black text-white">{isLoading ? "..." : rupiah(data?.net ?? 0)}</div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between border-t border-slate-800 pt-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                {diffNet >= 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-300 font-extrabold border border-emerald-500/30">
                    <TrendingUp className="h-4 w-4" /> Naik {percentDiff}% ({rupiah(diffNet)})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-3 py-1 text-rose-300 font-extrabold border border-rose-500/30">
                    <TrendingDown className="h-4 w-4" /> Turun {Math.abs(Number(percentDiff))}% ({rupiah(Math.abs(diffNet))})
                  </span>
                )}
                <span className="text-slate-400">dibanding periode sebelumnya</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <SummaryStatCard
              title="Transaksi Berhasil"
              value={isLoading ? "..." : `${data?.count ?? 0} Transaksi`}
              icon={ShoppingBag}
            />
            <SummaryStatCard
              title="Rata-rata Transaksi"
              value={isLoading ? "..." : rupiah(data?.average ?? 0)}
              icon={DollarSign}
            />
            <SummaryStatCard
              title="Barang Terjual"
              value={isLoading ? "..." : `${data?.itemsSold ?? 0} Unit`}
              icon={BarChart3}
            />
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Daily Revenue Chart */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-base font-extrabold text-slate-900 mb-4">
              Grafik Penjualan Harian
            </h2>
            {isLoading ? (
              <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
            ) : (data?.daily.length ?? 0) === 0 ? (
              <div className="grid h-64 place-items-center text-xs text-slate-400 font-bold">
                Belum ada penjualan pada periode ini.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.daily}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip formatter={(value: any) => [rupiah(Number(value)), "Omzet Bersih"]} />
                    <Bar dataKey="net" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Payment Method Breakdown */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-base font-extrabold text-slate-900 mb-4">
              Metode Pembayaran Terbanyak
            </h2>
            {isLoading ? (
              <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
            ) : (data?.methods.length ?? 0) === 0 ? (
              <div className="grid h-64 place-items-center text-xs text-slate-400 font-bold">
                Belum ada data pembayaran.
              </div>
            ) : (
              <div className="space-y-3">
                {(data?.methods ?? []).map((m) => (
                  <div key={m.method} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-900 shadow-xs border border-slate-200">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-extrabold uppercase text-xs text-slate-900">{m.method}</div>
                        <div className="text-[11px] text-slate-500 font-semibold">{m.count} Transaksi</div>
                      </div>
                    </div>
                    <div className="text-right font-black text-sm text-slate-900">
                      {rupiah(m.amount)}
                    </div>
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

function QuickActionButton({ to, icon: Icon, label, color }: { to: string; icon: any; label: string; color: string }) {
  return (
    <Link
      to={to as any}
      className={`flex flex-col items-center justify-center p-3.5 rounded-2xl shadow-sm transition hover:scale-105 ${color}`}
    >
      <Icon className="h-5 w-5 mb-1.5" />
      <span className="text-xs font-bold text-center leading-tight">{label}</span>
    </Link>
  );
}

function PresetButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
        active
          ? "bg-amber-500 text-slate-950 font-bold shadow"
          : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryStatCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 font-extrabold">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[10px] uppercase font-bold text-slate-500">{title}</div>
        <div className="text-lg font-black text-slate-900">{value}</div>
      </div>
    </div>
  );
}
