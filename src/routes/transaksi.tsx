import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Eye, Printer, Search, Receipt, ArrowRight } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ReceiptModal, type ReceiptData } from "@/components/ReceiptModal";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { listTransactions } from "@/lib/pos.functions";

export const Route = createFileRoute("/transaksi")({
  head: () => ({ meta: [{ title: "Riwayat Transaksi — Kasir" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: TransaksiPage,
});

function TransaksiPage() {
  const staff = Route.useLoaderData();
  const fetchTxns = useServerFn(listTransactions);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: () => fetchTxns({}),
  });

  const [q, setQ] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const transactions = (data ?? []).filter((t) => {
    if (!q) return true;
    const search = q.toLowerCase();
    return (
      t.transaction_number.toLowerCase().includes(search) ||
      (t.customer_name && t.customer_name.toLowerCase().includes(search)) ||
      (t.cashier_name && t.cashier_name.toLowerCase().includes(search))
    );
  });

  const openReceipt = (t: any) => {
    setReceipt({
      invoice_no: t.transaction_number,
      queue_no: t.queues?.[0]?.queue_number ?? 0,
      cashier_name: t.cashier_name,
      customer_name: t.customer_name,
      order_type: t.order_type,
      created_at: t.created_at,
      subtotal: Number(t.subtotal),
      discount: Number(t.discount),
      tax: 0,
      total: Number(t.grand_total),
      paid: Number(t.amount_paid),
      change_amount: Number(t.change_amount),
      payment_method: t.payment_method,
      notes: t.notes,
      items: (t.transaction_items ?? []).map((it: any) => ({
        product_name: it.product_name_snapshot,
        qty: it.quantity,
        price: Number(it.product_price_snapshot),
        subtotal: Number(it.subtotal),
      })),
    });
  };

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Riwayat Transaksi Penjualan</h1>
            <p className="text-xs text-slate-500">
              Sentuh atau klik pada baris transaksi mana saja untuk melihat rincian dan mencetak struk thermal.
            </p>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-border">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nomor transaksi, nama pelanggan, atau nama kasir..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Transaction Table */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-md border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">No. Transaksi</th>
                  <th className="px-4 py-3.5">Antrean</th>
                  <th className="px-4 py-3.5">Waktu</th>
                  <th className="px-4 py-3.5">Pelanggan</th>
                  <th className="px-4 py-3.5">Kasir</th>
                  <th className="px-4 py-3.5">Metode</th>
                  <th className="px-4 py-3.5 text-right">Total Pembayaran</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                      Memuat data transaksi...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400">
                      Belum ada data transaksi.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => openReceipt(t)}
                      className="hover:bg-amber-500/10 cursor-pointer transition group"
                      title="Klik untuk lihat rincian & cetak struk"
                    >
                      <td className="px-4 py-3.5 font-mono font-bold text-xs text-blue-900 group-hover:text-amber-800">
                        {t.transaction_number}
                      </td>
                      <td className="px-4 py-3.5 font-black text-sm text-amber-600">
                        #{String(t.queues?.[0]?.queue_number ?? 0).padStart(3, "0")}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">{t.customer_name || "Umum"}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-500">{t.cashier_name || "-"}</td>
                      <td className="px-4 py-3.5 uppercase font-bold text-xs">{t.payment_method}</td>
                      <td className="px-4 py-3.5 text-right font-black text-sm text-slate-900">
                        {rupiah(Number(t.grand_total))}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            t.transaction_status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {t.transaction_status === "completed" ? "Selesai" : "Dibatalkan"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openReceipt(t);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-amber-500 text-slate-950 px-3 py-1.5 text-xs font-black shadow transition hover:bg-amber-400"
                        >
                          <Printer className="h-3.5 w-3.5" /> Cetak Struk
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {receipt && <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />}
    </AppShell>
  );
}
