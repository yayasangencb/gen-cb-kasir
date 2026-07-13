import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ReceiptModal, type ReceiptData } from "@/components/ReceiptModal";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { listTransactions } from "@/lib/pos.functions";

export const Route = createFileRoute("/transaksi")({
  head: () => ({ meta: [{ title: "Transaksi — Gen CB Kasir" }] }),
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
  const fetch = useServerFn(listTransactions);
  const { data, isLoading } = useQuery({ queryKey: ["transactions"], queryFn: () => fetch({}) });
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const totalToday = (data ?? []).reduce((s, t) => {
    const d = new Date(t.created_at);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return s + Number(t.total);
    return s;
  }, 0);
  const countToday = (data ?? []).filter((t) => new Date(t.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-extrabold text-[color:var(--brand-deep)]">Riwayat Transaksi</h1>
        <p className="text-sm text-muted-foreground">Semua transaksi yang telah tercatat.</p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Penjualan Hari Ini" value={rupiah(totalToday)} />
          <Stat label="Transaksi Hari Ini" value={String(countToday)} />
          <Stat label="Total Transaksi" value={String(data?.length ?? 0)} />
        </div>

        <div className="glass-card mt-5 overflow-hidden rounded-3xl">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--brand-deep)] text-white">
              <tr>
                <th className="px-4 py-3 text-left">No. Invoice</th>
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
              ) : (data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Belum ada transaksi.
                  </td>
                </tr>
              ) : (
                (data ?? []).map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs">{t.invoice_no}</td>
                    <td className="px-4 py-3 font-bold text-[color:var(--brand)]">#{String(t.queue_no).padStart(3, "0")}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(t.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3">{t.cashier_name}</td>
                    <td className="px-4 py-3 uppercase text-xs font-semibold">{t.payment_method}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-[color:var(--brand-deep)]">
                      {rupiah(Number(t.total))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          setReceipt({
                            invoice_no: t.invoice_no,
                            queue_no: t.queue_no,
                            cashier_name: t.cashier_name,
                            created_at: t.created_at,
                            subtotal: Number(t.subtotal),
                            discount: Number(t.discount),
                            tax: Number(t.tax),
                            total: Number(t.total),
                            paid: Number(t.paid),
                            change_amount: Number(t.change_amount),
                            payment_method: t.payment_method,
                            items: (t.transaction_items ?? []).map((it: {product_name: string; qty: number; price: number; subtotal: number}) => ({
                              product_name: it.product_name,
                              qty: it.qty,
                              price: Number(it.price),
                              subtotal: Number(it.subtotal),
                            })),
                          })
                        }
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
