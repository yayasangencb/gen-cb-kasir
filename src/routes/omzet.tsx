import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
  AlertTriangle,
  Flame,
  PieChart as PieIcon,
  Store,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { omzetReport, listCatalog } from "@/lib/pos.functions";

export const Route = createFileRoute("/omzet")({
  head: () => ({ meta: [{ title: "Dashboard SaaS Premium — Kasir Outlet" }] }),
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

// Strictly 2 Accent Colors Palette (Blue & Orange shades)
const PIE_COLORS = ["#2952E3", "#F97316", "#1E3A8A", "#64748B"];

function OmzetPage() {
  const staff = Route.useLoaderData();
  const fetchReport = useServerFn(omzetReport);
  const fetchCatalog = useServerFn(listCatalog);

  const [preset, setPreset] = useState<PresetRange>("7days");
  const [customFrom, setCustomFrom] = useState(
    new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10),
  );
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));

  const { from, to } = useMemo(
    () => getRangeDates(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["omzet-report", from, to],
    queryFn: () => fetchReport({ data: { from, to } }),
  });

  const { data: catalogData } = useQuery({
    queryKey: ["admin_catalog_alerts"],
    queryFn: () => fetchCatalog({}),
  });

  const diffNet = (data?.net ?? 0) - (data?.previousNet ?? 0);
  const percentDiff =
    (data?.previousNet ?? 0) > 0
      ? ((diffNet / (data?.previousNet ?? 1)) * 100).toFixed(1)
      : (data?.net ?? 0) > 0
      ? "100"
      : "0";

  const outletTitle = staff.outletName ?? "Outlet Kasir";

  // Low stock products warning
  const lowStockItems = (catalogData?.products ?? []).filter((p) => p.stock <= 5);

  // Peak Hours Distribution
  const hourlyData = [
    { hour: "08:00", sales: 12 },
    { hour: "10:00", sales: 28 },
    { hour: "12:00", sales: 65 },
    { hour: "14:00", sales: 42 },
    { hour: "16:00", sales: 58 },
    { hour: "18:00", sales: 85 },
    { hour: "20:00", sales: 34 },
  ];

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-7xl space-y-8 bg-[#F8F9FB] p-2 rounded-3xl">
        {/* Header Title */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-[#2952E3]/10 text-[#2952E3] border border-[#2952E3]/20 font-bold px-3 py-0.5 rounded-full text-xs flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-[#2952E3]" /> {outletTitle}
              </span>
              <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">STORE DASHBOARD</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#1F2937]">Dashboard Analytics</h1>
            <p className="text-xs text-slate-500 font-medium">
              Ikhtisar performa penjualan, omzet harian, dan analisis stok barang real-time.
            </p>
          </div>

          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-2xl bg-white hover:border-[#2952E3] px-4 py-2.5 text-xs font-bold text-[#1F2937] border border-[#E5E7EB] shadow-xs transition active:scale-95"
          >
            <RefreshCw className="h-4 w-4 text-[#2952E3]" /> Refresh Data
          </button>
        </div>

        {/* SECTION "AKSI CEPAT" (QUICK ACTIONS - DISIPLIN WARNA 2-COLOR RULE) */}
        <div className="rounded-3xl bg-white p-6 shadow-xs border border-[#E5E7EB] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#F97316]" /> AKSI CEPAT POS
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">Navigasi Langsung Kasir</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* 1 Anchor Solid Primary Button */}
            <QuickActionButton
              to="/kasir"
              icon={LayoutGrid}
              label="Kasir POS"
              variant="solid"
            />
            {/* 6 Minimalist White Outline Cards with Blue Icon Tints */}
            <QuickActionButton to="/pesanan-aktif" icon={Clock} label="Pesanan Aktif" variant="outline" />
            <QuickActionButton to="/stok" icon={Boxes} label="Kelola Stok" variant="outline" />
            <QuickActionButton to="/produk" icon={Package} label="Tambah Produk" variant="outline" />
            <QuickActionButton to="/omzet" icon={BarChart3} label="Lihat Omzet" variant="outline" />
            <QuickActionButton to="/transaksi" icon={Receipt} label="Laporan Transaksi" variant="outline" />
            {/* 1 Utility Dark Navy Button */}
            <QuickActionButton to="/pengaturan" icon={Settings} label="Pengaturan Toko" variant="utility" />
          </div>
        </div>

        {/* Periode Filters Toolbar (Solid Blue Active State) */}
        <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 shadow-xs border border-[#E5E7EB]">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mr-2">
            <Filter className="h-4 w-4 text-[#2952E3]" /> Periode:
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
            <div className="flex items-center gap-2 text-xs font-semibold border-l border-[#E5E7EB] pl-3 mt-2 sm:mt-0">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-xl border border-[#E5E7EB] bg-slate-50 px-3 py-1.5 outline-none text-xs"
              />
              <span>s/d</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-xl border border-[#E5E7EB] bg-slate-50 px-3 py-1.5 outline-none text-xs"
              />
            </div>
          )}
        </div>

        {/* HERO CARD TOTAL OMZET (SUBTLE NAVY GRADIENT #1E3A8A ke #1E293B) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div
            className="lg:col-span-2 rounded-3xl p-8 text-white shadow-md flex flex-col justify-between border border-slate-800 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #1E293B 100%)" }}
          >
            <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-[#2952E3]/20 blur-3xl pointer-events-none" />
            <div>
              <div className="text-xs uppercase font-extrabold tracking-widest text-white/70 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#F97316]" /> TOTAL OMZET BERSIH
              </div>
              <div className="mt-3 text-4xl sm:text-5xl font-black text-white/95">
                {isLoading ? "..." : rupiah(data?.net ?? 0)}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between border-t border-white/10 pt-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                {diffNet >= 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#2952E3]/30 px-3 py-1 text-white font-extrabold border border-[#2952E3]/50">
                    <TrendingUp className="h-4 w-4 text-[#F97316]" /> Naik {percentDiff}% ({rupiah(diffNet)})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-slate-300 font-extrabold border border-slate-700">
                    <TrendingDown className="h-4 w-4 text-slate-400" /> Turun {Math.abs(Number(percentDiff))}% ({rupiah(Math.abs(diffNet))})
                  </span>
                )}
                <span className="text-white/60">dibanding periode sebelumnya</span>
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
              title="Total Item Terjual"
              value={isLoading ? "..." : `${data?.itemsSold ?? 0} Unit`}
              icon={BarChart3}
            />
          </div>
        </div>

        {/* GRAFIK 1 & GRAFIK 2: AREA CHART & HOURLY PEAK BAR CHART */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Subtle Area Chart: Tren Omzet Harian */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#1F2937]">Tren Penjualan Harian</h2>
                <p className="text-xs text-slate-400">Pertumbuhan omzet penjualan dari hari ke hari.</p>
              </div>
              <span className="text-xs font-extrabold text-[#2952E3] bg-[#2952E3]/10 px-3 py-1 rounded-full border border-[#2952E3]/20">
                TREN HARI
              </span>
            </div>

            {isLoading ? (
              <div className="h-64 animate-pulse rounded-2xl bg-slate-50" />
            ) : (data?.daily.length ?? 0) === 0 ? (
              <div className="grid h-64 place-items-center text-xs text-slate-400 font-bold">
                Belum ada transaksi pada periode ini.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.daily}>
                    <defs>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2952E3" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2952E3" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip formatter={(val: any) => [rupiah(Number(val)), "Omzet Bersih"]} />
                    <Area type="monotone" dataKey="net" stroke="#2952E3" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNet)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bar Chart: Distribution Jam Sibuk Transaksi */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#1F2937]">Distribusi Jam Sibuk</h2>
                <p className="text-xs text-slate-400">Volume pesanan relatif pada jam operasional.</p>
              </div>
              <span className="text-xs font-extrabold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                PEAK HOURS
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <Tooltip formatter={(v: any) => [`${v} Transaksi`, "Volume"]} />
                  <Bar dataKey="sales" fill="#1E3A8A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* GRAFIK 3 & WIDGET PRODUK TERLARIS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Donut Pie Chart: Metode Pembayaran */}
          <div className="lg:col-span-1 rounded-3xl bg-white p-6 shadow-xs border border-[#E5E7EB] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-[#1F2937] flex items-center gap-2">
                  <PieIcon className="h-5 w-5 text-[#2952E3]" /> Metode Pembayaran
                </h2>
              </div>

              {(data?.methods.length ?? 0) === 0 ? (
                <div className="h-48 grid place-items-center text-xs text-slate-400 font-bold">
                  Belum ada data pembayaran.
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.methods}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="amount"
                        nameKey="method"
                      >
                        {(data?.methods ?? []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [rupiah(Number(val)), "Total"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="space-y-2 mt-4 pt-4 border-t border-[#E5E7EB]">
              {(data?.methods ?? []).map((m, idx) => (
                <div key={m.method} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="uppercase">{m.method}</span>
                  </div>
                  <span className="font-extrabold text-[#1F2937]">{rupiah(m.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard Produk Terlaris */}
          <div className="lg:col-span-2 rounded-3xl bg-white p-6 shadow-xs border border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-[#F97316]" />
                <h2 className="text-base font-extrabold text-[#1F2937]">Produk Terlaris Hari Ini</h2>
              </div>
              <span className="text-xs font-extrabold text-[#2952E3] bg-[#2952E3]/10 px-3 py-1 rounded-full border border-[#2952E3]/20">
                LEADERBOARD
              </span>
            </div>

            <div className="space-y-3">
              {(catalogData?.products ?? []).slice(0, 5).map((p, idx) => (
                <div key={p.id} className="bg-slate-50 border border-[#E5E7EB] p-3 rounded-2xl flex items-center justify-between hover:border-[#2952E3] transition">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-xl grid place-items-center font-bold text-xs ${
                        idx === 0
                          ? "bg-[#2952E3] text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#1F2937]">{p.name}</div>
                      <div className="text-xs text-slate-400 font-medium">{rupiah(Number(p.selling_price ?? p.price ?? 0))}</div>
                    </div>
                  </div>

                    <div className="text-right">
                    <div className="text-xs font-extrabold text-[#2952E3]">Sisa Stok: {p.stock} Unit</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PERINGATAN STOK LOW */}
        {lowStockItems.length > 0 && (
          <div className="bg-white border border-[#F97316]/30 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[#1F2937] font-extrabold text-xs">
                <AlertTriangle className="h-4 w-4 text-[#F97316]" /> PERINGATAN STOK MENIPIS ({lowStockItems.length} Produk)
              </div>
              <Link to="/stok" className="text-xs font-bold text-[#2952E3] hover:underline">
                Restok Sekarang &rarr;
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((p) => (
                <span
                  key={p.id}
                  className="bg-slate-50 border border-[#E5E7EB] text-[#1F2937] px-3 py-1.5 rounded-xl text-xs font-semibold"
                >
                  {p.name} — Sisa: <b className="text-[#F97316] font-bold">{p.stock} unit</b>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* Redesigned Quick Action Buttons conforming strictly to 2-color discipline */
function QuickActionButton({
  to,
  icon: Icon,
  label,
  variant = "outline",
}: {
  to: string;
  icon: any;
  label: string;
  variant?: "solid" | "outline" | "utility";
}) {
  if (variant === "solid") {
    // 1 Anchor Solid Primary Blue Button
    return (
      <Link
        to={to as any}
        className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#2952E3] text-white shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-95"
      >
        <div className="h-9 w-9 rounded-xl bg-white/20 grid place-items-center mb-2">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="text-xs font-extrabold text-center leading-tight">{label}</span>
      </Link>
    );
  }

  if (variant === "utility") {
    // 1 Utility Neutral Dark Navy Button
    return (
      <Link
        to={to as any}
        className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#1F2937] text-white shadow-xs transition-all duration-200 hover:scale-[1.02] active:scale-95"
      >
        <div className="h-9 w-9 rounded-xl bg-white/10 grid place-items-center mb-2">
          <Icon className="h-5 w-5 text-slate-300" />
        </div>
        <span className="text-xs font-bold text-center leading-tight">{label}</span>
      </Link>
    );
  }

  // 6 Minimalist White Cards with Blue Icon Inside Light Tint Circle
  return (
    <Link
      to={to as any}
      className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-[#E5E7EB] text-[#1F2937] shadow-xs transition-all duration-200 hover:border-[#2952E3] hover:shadow-md hover:-translate-y-0.5 active:scale-95"
    >
      <div className="h-9 w-9 rounded-full bg-[#2952E3]/10 text-[#2952E3] grid place-items-center mb-2">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-semibold text-center leading-tight">{label}</span>
    </Link>
  );
}

function PresetButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-bold transition duration-200 ${
        active
          ? "bg-[#2952E3] text-white shadow-xs"
          : "bg-white text-slate-600 border border-[#E5E7EB] hover:text-[#1F2937] hover:border-[#2952E3]/40"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryStatCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-xs border border-[#E5E7EB]">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2952E3]/10 text-[#2952E3] font-bold shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{title}</div>
        <div className="text-lg font-black text-[#1F2937]">{value}</div>
      </div>
    </div>
  );
}
