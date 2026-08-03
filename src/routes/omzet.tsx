import { createFileRoute, redirect } from "@tanstack/react-router";
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
  LineChart,
  Line,
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
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { omzetReport } from "@/lib/pos.functions";

export const Route = createFileRoute("/omzet")({
  head: () => ({ meta: [{ title: "Laporan Omzet — Gen CB Kasir" }] }),
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

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[color:var(--brand-deep)]">Omzet & Laporan Penjualan</h1>
            <p className="text-sm text-muted-foreground">
              Analisis performa penjualan, omzet bersih, metode pembayaran, dan produk terlaris.
            </p>
          </div>
        </div>

        {/* Preset & Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-border">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mr-2">
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
            <div className="flex items-center gap-2 text-xs font-semibold border-l border-border pl-3 mt-2 sm:mt-0">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-xl border border-border bg-secondary/50 px-3 py-1.5 outline-none"
              />
              <span>s/d</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-xl border border-border bg-secondary/50 px-3 py-1.5 outline-none"
              />
            </div>
          )}
        </div>

        {/* Omzet Net Header Card & Comparison */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl bg-gradient-to-r from-[#002B7F] to-[#0047B3] p-8 text-white shadow-md flex flex-col justify-between">
            <div>
              <div className="text-xs uppercase font-extrabold tracking-widest text-white/80">
                Total Omzet Bersih Periode Ini
              </div>
              <div className="mt-2 text-4xl sm:text-5xl font-black">{isLoading ? "..." : rupiah(data?.net ?? 0)}</div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between border-t border-white/20 pt-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                {diffNet >= 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-emerald-300 font-extrabold border border-emerald-400/30">
                    <TrendingUp className="h-4 w-4" /> Naik {percentDiff}% ({rupiah(diffNet)})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-400/20 px-3 py-1 text-red-300 font-extrabold border border-red-400/30">
                    <TrendingDown className="h-4 w-4" /> Turun {Math.abs(Number(percentDiff))}% ({rupiah(Math.abs(diffNet))})
                  </span>
                )}
                <span className="text-white/80">dibanding periode sebelumnya</span>
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
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border">
            <h2 className="text-base font-extrabold text-[color:var(--brand-deep)] mb-4">
              Grafik Penjualan Harian
            </h2>
            {isLoading ? (
              <div className="h-64 animate-pulse rounded-2xl bg-secondary" />
            ) : (data?.daily.length ?? 0) === 0 ? (
              <div className="grid h-64 place-items-center text-xs text-muted-foreground font-bold">
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
                    <Bar dataKey="net" fill="#0047B3" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Payment Method Breakdown */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border">
            <h2 className="text-base font-extrabold text-[color:var(--brand-deep)] mb-4">
              Metode Pembayaran Terbanyak
            </h2>
            {isLoading ? (
              <div className="h-64 animate-pulse rounded-2xl bg-secondary" />
            ) : (data?.methods.length ?? 0) === 0 ? (
              <div className="grid h-64 place-items-center text-xs text-muted-foreground font-bold">
                Belum ada data pembayaran.
              </div>
            ) : (
              <div className="space-y-3">
                {(data?.methods ?? []).map((m) => (
                  <div key={m.method} className="flex items-center justify-between rounded-2xl bg-secondary/70 p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[color:var(--brand-deep)] shadow-xs ring-1 ring-border">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-extrabold uppercase text-xs text-[color:var(--brand-deep)]">{m.method}</div>
                        <div className="text-[11px] text-muted-foreground font-semibold">{m.count} Transaksi</div>
                      </div>
                    </div>
                    <div className="text-right font-black text-sm text-[color:var(--brand-deep)]">
                      {rupiah(m.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Summary Table */}
        <div className="glass-card overflow-hidden rounded-3xl shadow-md border border-border">
          <div className="p-5 border-b border-border bg-white flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-[color:var(--brand-deep)]">Rincian Penjualan Harian</h2>
            <span className="text-xs text-muted-foreground font-semibold">Omzet Kotor - Diskon - Refund = Omzet Bersih</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[color:var(--brand-deep)] text-white font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Tanggal</th>
                  <th className="px-4 py-3.5 text-center">Transaksi</th>
                  <th className="px-4 py-3.5 text-center">Item Terjual</th>
                  <th className="px-4 py-3.5 text-right">Omzet Kotor</th>
                  <th className="px-4 py-3.5 text-right">Diskon</th>
                  <th className="px-4 py-3.5 text-right">Refund</th>
                  <th className="px-4 py-3.5 text-right">Omzet Bersih</th>
                  <th className="px-4 py-3.5 text-right">Tunai</th>
                  <th className="px-4 py-3.5 text-right">Non-Tunai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-white font-semibold">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      Memuat laporan...
                    </td>
                  </tr>
                ) : (data?.daily.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-muted-foreground">
                      Belum ada penjualan pada periode ini.
                    </td>
                  </tr>
                ) : (
                  (data?.daily ?? []).map((row) => (
                    <tr key={row.date} className="hover:bg-secondary/40 transition">
                      <td className="px-4 py-3.5 font-bold text-[color:var(--brand-deep)]">{row.date}</td>
                      <td className="px-4 py-3.5 text-center font-bold">{row.count}</td>
                      <td className="px-4 py-3.5 text-center text-muted-foreground">{row.items}</td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground">{rupiah(row.gross)}</td>
                      <td className="px-4 py-3.5 text-right text-amber-600">
                        {row.discount > 0 ? `- ${rupiah(row.discount)}` : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right text-red-600">
                        {row.refund > 0 ? `- ${rupiah(row.refund)}` : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-sm text-[color:var(--brand-deep)]">
                        {rupiah(row.net)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">{rupiah(row.cash)}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-sky-700">{rupiah(row.noncash)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function PresetButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition shadow-2xs ${
        active
          ? "bg-[color:var(--brand-deep)] text-white shadow-sm"
          : "bg-white text-muted-foreground ring-1 ring-border/80 hover:text-[color:var(--brand-deep)]"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryStatCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-border">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-[color:var(--brand-deep)] font-extrabold">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[10px] uppercase font-bold text-muted-foreground">{title}</div>
        <div className="text-lg font-black text-[color:var(--brand-deep)]">{value}</div>
      </div>
    </div>
  );
}
