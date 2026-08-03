import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Eye, Printer, Search } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ReceiptModal, type ReceiptData } from "@/components/ReceiptModal";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { listTransactions } from "@/lib/pos.functions";

export const Route = createFileRoute("/transaksi")({
  head: () => ({ meta: [{ title: "Riwayat Transaksi — Gen CB Kasir" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    if (staff.role !== "admin") throw redirect({ to: "/kasir" });
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

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[color:var(--brand-deep)]">Riwayat Transaksi Penjualan</h1>
            <p className="text-sm text-muted-foreground">
              Arsip seluruh transaksi produksi yang telah dilakukan oleh petugas kasir.
            </p>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-border">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nomor transaksi, nama pelanggan, atau nama kasir..."
              className="w-full rounded-2xl border border-border bg-secondary/50 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none focus:border-[color:var(--brand)]"
            />
          </div>
        </div>

        {/* Transaction Table */}
        <div className="glass-card overflow-hidden rounded-3xl shadow-md border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[color:var(--brand-deep)] text-white font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">No. Transaksi</th>
                  <th className="px-4 py-3.5">Antrean</th>
                  <th className="px-4 py-3.5">Waktu</th>
                  <th className="px-4 py-3.5">Pelanggan</th>
                  <th className="px-4 py-3.5">Kasir</th>
                  <th className="px-4 py-3.5">Metode</th>
                  <th className="px-4 py-3.5 text-right">Total Pembayaran</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Struk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-white font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground font-bold">
                      Memuat transaksi...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-muted-foreground">
                      Belum ada data transaksi.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-secondary/40 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-xs text-[color:var(--brand-deep)]">
                        {t.transaction_number}
                      </td>
                      <td className="px-4 py-3.5 font-black text-sm text-[color:var(--brand)]">
                        #{String(t.queues?.[0]?.queue_number ?? 0).padStart(3, "0")}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                        {new Date(t.created_at).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-foreground">{t.customer_name || "Umum"}</td>
                      <td className="px-4 py-3.5 font-semibold text-muted-foreground">{t.cashier_name || "-"}</td>
                      <td className="px-4 py-3.5 uppercase font-bold text-xs">{t.payment_method}</td>
                      <td className="px-4 py-3.5 text-right font-black text-sm text-[color:var(--brand-deep)]">
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
                          onClick={() =>
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
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-xs font-extrabold text-[color:var(--brand-deep)] hover:bg-[color:var(--brand)]/10"
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
