import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ReceiptModal, type ReceiptData } from "@/components/ReceiptModal";
import { getCurrentStaff } from "@/lib/auth.functions";
import { dateTimeID, rupiah } from "@/lib/format";
import { getReceipt, listMyRecentTransactions, listTransactions } from "@/lib/pos.functions";

export const Route = createFileRoute("/transaksi")({
  head: () => ({
    meta: [
      { title: "Transaksi — GEN-CB Kasir" },
      { name: "description", content: "Riwayat transaksi penjualan GEN-CB beserta cetak ulang struk." },
      { property: "og:title", content: "Transaksi — GEN-CB Kasir" },
      { property: "og:description", content: "Pantau riwayat transaksi dan cetak ulang struk GEN-CB Kasir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: TransaksiPage,
});

type Row = {
  id: string;
  transaction_number: string;
  created_at: string;
  cashier_name: string | null;
  payment_method: string;
  grand_total: number;
  queue_number: number | null;
  status: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  baru: "Baru",
  diproses: "Diproses",
  selesai: "Selesai",
  diambil: "Sudah Diambil",
  dibatalkan: "Dibatalkan",
};

function TransaksiPage() {
  const staff = Route.useLoaderData();
  const isAdmin = staff.role === "admin";
  const fetchAll = useServerFn(listTransactions);
  const fetchMine = useServerFn(listMyRecentTransactions);
  const fetchReceipt = useServerFn(getReceipt);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", isAdmin ? "all" : "mine"],
    queryFn: async (): Promise<Row[]> => {
      if (isAdmin) {
        const rows = await fetchAll({ data: {} });
        return rows.map((t) => ({
          id: t.id,
          transaction_number: t.transaction_number,
          created_at: t.created_at,
          cashier_name: t.cashier_name,
          payment_method: t.payment_method,
          grand_total: Number(t.grand_total),
          queue_number: t.queues?.[0]?.queue_number ?? null,
          status: t.queues?.[0]?.status ?? null,
        }));
      }
      const rows = await fetchMine({});
      return rows.map((t) => ({
        id: t.id,
        transaction_number: t.transaction_number,
        created_at: t.created_at,
        cashier_name: staff.name,
        payment_method: t.payment_method,
        grand_total: Number(t.grand_total),
        queue_number: t.queues?.[0]?.queue_number ?? null,
        status: t.queues?.[0]?.status ?? null,
      }));
    },
  });

  const rows = data ?? [];
  const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
  const totalToday = rows.filter((t) => isToday(t.created_at)).reduce((s, t) => s + t.grand_total, 0);
  const countToday = rows.filter((t) => isToday(t.created_at)).length;

  const openReceipt = async (id: string) => {
    try {
      setReceipt(await fetchReceipt({ data: { transaction_id: id } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat struk");
    }
  };

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-extrabold text-[color:var(--brand-deep)]">Riwayat Transaksi</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "Semua transaksi yang telah tercatat." : "Transaksi Anda dalam 24 jam terakhir."}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Penjualan Hari Ini" value={rupiah(totalToday)} />
          <Stat label="Transaksi Hari Ini" value={String(countToday)} />
          <Stat label="Total Ditampilkan" value={String(rows.length)} />
        </div>

        <div className="glass-card mt-5 overflow-x-auto rounded-3xl">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--brand-deep)] text-white">
              <tr>
                <th className="px-4 py-3 text-left">No. Transaksi</th>
                <th className="px-4 py-3 text-left">Antrean</th>
                <th className="px-4 py-3 text-left">Waktu</th>
                <th className="px-4 py-3 text-left">Kasir</th>
                <th className="px-4 py-3 text-left">Metode</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Memuat...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Belum ada transaksi.
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{t.transaction_number}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-[color:var(--brand)]">
                        #{String(t.queue_number ?? 0).padStart(3, "0")}
                      </span>
                      {t.status && (
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {STATUS_LABEL[t.status] ?? t.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{dateTimeID(t.created_at)}</td>
                    <td className="px-4 py-3">{t.cashier_name ?? "-"}</td>
                    <td className="px-4 py-3 text-xs font-semibold uppercase">{t.payment_method}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-[color:var(--brand-deep)]">
                      {rupiah(t.grand_total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openReceipt(t.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-[color:var(--brand-deep)] hover:bg-[color:var(--brand)]/10"
                      >
                        <Eye className="h-4 w-4" /> Struk
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {receipt && <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-[color:var(--brand-deep)]">{value}</div>
    </div>
  );
}
