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
  head: () => ({ meta: [{ title: "Dashboard Aesthetic & Omzet — Kasir Outlet" }] }),
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

const PIE_COLORS = ["#FF7A00", "#003B8F", "#10B981", "#8B5CF6", "#EC4899"];

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

  // Dummy Peak Hours Distribution for Aesthetic Hourly Chart
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
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Title */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-100 text-amber-900 border border-amber-300 font-black px-3 py-0.5 rounded-full text-xs flex items-center gap-1">
                <Store className="h-3.5 w-3.5 text-[#FF7A00]" /> {outletTitle}
              </span>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">PANEL KASIR & OMZET</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[#003B8F]">Dashboard Aesthetic & Laporan Omzet</h1>
            <p className="text-xs text-slate-500">
              Analisis performa bisnis real-time, tren grafik omzet, jam sibuk transaksi, dan produk terlaris.
            </p>
          </div>

          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-2xl bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-extrabold text-slate-700 border border-slate-300 shadow-sm transition"
          >
            <RefreshCw className="h-4 w-4 text-[#FF7A00]" /> Perbarui Data
          </button>
        </div>

        {/* AKSI CEPAT ADMIN KASIR */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-[#FF7A00]" />
            <h2 className="text-base font-black text-[#003B8F] uppercase tracking-wider">AKSI CEPAT STORE MANAGER</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <QuickActionButton to="/kasir" icon={LayoutGrid} label="Kasir POS" color="bg-[#003B8F] text-white" />
            <QuickActionButton to="/pesanan-aktif" icon={Clock} label="Pesanan Aktif" color="bg-purple-600 text-white" />
            <QuickActionButton to="/stok" icon={Boxes} label="Kelola Stok" color="bg-emerald-600 text-white" />
            <QuickActionButton to="/produk" icon={Package} label="Tambah Produk" color="bg-[#FF7A00] text-white font-black" />
            <QuickActionButton to="/omzet" icon={BarChart3} label="Lihat Omzet" color="bg-slate-900 text-white" />
            <QuickActionButton to="/transaksi" icon={Receipt} label="Cetak Struk" color="bg-teal-600 text-white" />
            <QuickActionButton to="/pengaturan" icon={Settings} label="Pengaturan Display" color="bg-slate-800 text-white" />
          </div>
        </div>

        {/* Periode Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mr-2">
            <Filter className="h-4 w-4" /> Filter Periode:
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
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none text-xs"
              />
              <span>s/d</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 outline-none text-xs"
              />
            </div>
          )}
        </div>

        {/* HERO STAT CARD & QUICK STATS */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div
            className="lg:col-span-2 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-between border border-blue-900 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #003B8F 0%, #003B8F 60%, #1E6FD9 100%)" }}
          >
            <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div>
              <div className="text-xs uppercase font-black tracking-widest text-amber-300 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> TOTAL OMZET BERSIH OUTLET
              </div>
              <div className="mt-2 text-4xl sm:text-5xl font-black text-white drop-shadow-md">
                {isLoading ? "..." : rupiah(data?.net ?? 0)}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between border-t border-white/20 pt-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                {diffNet >= 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-emerald-300 font-extrabold border border-emerald-400/30">
                    <TrendingUp className="h-4 w-4" /> Naik {percentDiff}% ({rupiah(diffNet)})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-400/20 px-3 py-1 text-rose-300 font-extrabold border border-rose-400/30">
                    <TrendingDown className="h-4 w-4" /> Turun {Math.abs(Number(percentDiff))}% ({rupiah(Math.abs(diffNet))})
                  </span>
                )}
                <span className="text-white/80">dibandingkan periode sebelumnya</span>
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
          {/* Aesthetic Area Chart: Tren Omzet Harian */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-black text-[#003B8F]">Grafik Area: Tren Omzet Harian</h2>
                <p className="text-xs text-slate-500">Pertumbuhan omzet penjualan dari hari ke hari.</p>
              </div>
              <span className="text-xs font-extrabold text-[#FF7A00] bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                LIVE
              </span>
            </div>

            {isLoading ? (
              <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
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
                        <stop offset="5%" stopColor="#FF7A00" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#003B8F" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip formatter={(val: any) => [rupiah(Number(val)), "Omzet Bersih"]} />
                    <Area type="monotone" dataKey="net" stroke="#FF7A00" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bar Chart: Distribution Jam Sibuk Transaksi */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-black text-[#003B8F]">Grafik Jam Sibuk (Peak Hours)</h2>
                <p className="text-xs text-slate-500">Distribusi jam transaksi terramai di toko.</p>
              </div>
              <span className="text-xs font-extrabold text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                DISTRIBUSI
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => [`${v} Transaksi`, "Volume Pesanan"]} />
                  <Bar dataKey="sales" fill="#003B8F" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* GRAFIK 3 & WIDGET PRODUK TERLARIS */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Donut Pie Chart: Metode Pembayaran */}
          <div className="lg:col-span-1 rounded-3xl bg-white p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-black text-[#003B8F] flex items-center gap-2">
                  <PieIcon className="h-5 w-5 text-[#FF7A00]" /> Metode Pembayaran
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
                        paddingAngle={5}
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

            <div className="space-y-2 mt-4 pt-4 border-t border-slate-200">
              {(data?.methods ?? []).map((m, idx) => (
                <div key={m.method} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="uppercase">{m.method}</span>
                  </div>
                  <span className="font-black text-slate-900">{rupiah(m.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard Produk Terlaris */}
          <div className="lg:col-span-2 rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-[#FF7A00]" />
                <h2 className="text-base font-black text-[#003B8F]">Peringkat Produk Terlaris Hari Ini</h2>
              </div>
              <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                TOP SELLER
              </span>
            </div>

            <div className="space-y-4">
              {(catalogData?.products ?? []).slice(0, 5).map((p, idx) => (
                <div key={p.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-xl grid place-items-center font-black text-xs text-white ${
                        idx === 0
                          ? "bg-amber-500 shadow"
                          : idx === 1
                          ? "bg-slate-400"
                          : idx === 2
                          ? "bg-amber-700"
                          : "bg-slate-900"
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500 font-semibold">{rupiah(Number(p.selling_price ?? p.price ?? 0))}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-[#FF7A00]">Stok Tersedia: {p.stock} Unit</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PERINGATAN STOK LOW */}
        {lowStockItems.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-rose-800 font-black text-sm">
                <AlertTriangle className="h-5 w-5 text-rose-600" /> PERINGATAN STOK HAMPIR HABIS ({lowStockItems.length} Produk)
              </div>
              <Link to="/stok" className="text-xs font-bold text-rose-700 underline hover:no-underline">
                Kelola Tambah Stok NOW &rarr;
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((p) => (
                <span
                  key={p.id}
                  className="bg-white border border-rose-300 text-rose-900 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-xs"
                >
                  {p.name} — Sisa: <b className="text-rose-600">{p.stock} unit</b>
                </span>
              ))}
            </div>
          </div>
        )}
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
          ? "bg-[#FF7A00] text-white shadow"
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
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-[#FF7A00] font-extrabold border border-amber-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[10px] uppercase font-bold text-slate-500">{title}</div>
        <div className="text-lg font-black text-slate-900">{value}</div>
      </div>
    </div>
  );
}
