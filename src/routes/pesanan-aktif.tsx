import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Play, ShoppingBag, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { listActiveOrders, updateOrderStatus } from "@/lib/pos.functions";

export const Route = createFileRoute("/pesanan-aktif")({
  head: () => ({ meta: [{ title: "Pesanan Aktif — Gen CB Kasir" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: PesananAktifPage,
});

function PesananAktifPage() {
  const staff = Route.useLoaderData();
  const fetchOrders = useServerFn(listActiveOrders);
  const changeStatus = useServerFn(updateOrderStatus);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => fetchOrders({}),
    refetchInterval: 5000,
  });

  const [busyId, setBusyId] = useState<string | null>(null);

  const handleUpdate = async (queueId: string, newStatus: "diproses" | "selesai" | "diambil" | "dibatalkan") => {
    if (newStatus === "dibatalkan" && !confirm("Yakin ingin membatalkan pesanan ini? Transaksi akan dibatalkan.")) {
      return;
    }

    setBusyId(queueId);
    try {
      await changeStatus({ data: { queue_id: queueId, status: newStatus } });
      toast.success(
        newStatus === "diproses"
          ? "Pesanan mulai diproses"
          : newStatus === "selesai"
          ? "Pesanan ditandai selesai"
          : newStatus === "diambil"
          ? "Pesanan sudah diambil"
          : "Pesanan dibatalkan",
      );
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah status");
    } finally {
      setBusyId(null);
    }
  };

  const orders = data ?? [];

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[color:var(--brand-deep)]">Pesanan Aktif</h1>
            <p className="text-sm text-muted-foreground">
              Kelola proses pembuatan dan penyerahan pesanan secara real-time.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-bold text-muted-foreground ring-1 ring-border shadow-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            Sinkronkan otomatis setiap 5 detik
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-3xl bg-white/70 shadow-xs" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm ring-1 ring-border">
            <ShoppingBag className="mx-auto mb-3 h-12 w-12 opacity-30 text-[color:var(--brand)]" />
            <div className="text-lg font-bold text-[color:var(--brand-deep)]">Tidak ada pesanan aktif saat ini</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pesanan baru yang berhasil dibayar akan muncul di sini secara otomatis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((q) => {
              const txn = q.transactions;
              const items = txn?.transaction_items ?? [];
              const isBusy = busyId === q.id;

              return (
                <div
                  key={q.id}
                  className="flex flex-col justify-between rounded-3xl bg-white p-6 shadow-md ring-1 ring-border/80 transition-all hover:shadow-lg"
                >
                  <div>
                    {/* Queue header */}
                    <div className="flex items-start justify-between border-b border-border/60 pb-4">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Antrean #{String(q.queue_number).padStart(3, "0")}
                        </div>
                        <div className="text-lg font-black text-[color:var(--brand-deep)]">
                          {q.customer_name || "Pelanggan Umum"}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {txn?.transaction_number}
                        </div>
                      </div>

                      <StatusBadge status={q.status} />
                    </div>

                    {/* Order Meta Info */}
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <ElapsedTimer startTime={q.created_at} />
                      </span>
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 font-bold uppercase text-[10px] text-[color:var(--brand-deep)]">
                        {txn?.order_type === "take_away" ? "Take Away" : "Dine In"}
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="mt-4 space-y-1.5 border-t border-dashed border-border pt-3">
                      {items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-xs font-semibold text-foreground">
                          <span className="min-w-0 truncate">
                            {it.quantity}x {it.product_name_snapshot}
                            {it.notes && <span className="block text-[10px] text-muted-foreground">({it.notes})</span>}
                          </span>
                        </div>
                      ))}
                    </div>

                    {txn?.notes && (
                      <div className="mt-3 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900 border border-amber-200">
                        <b>Catatan:</b> {txn.notes}
                      </div>
                    )}
                  </div>

                  {/* Footer & Actions */}
                  <div className="mt-6 border-t border-border/80 pt-4">
                    <div className="mb-3 flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground font-semibold">Total Tagihan</span>
                      <span className="text-base font-black text-[color:var(--brand-deep)]">
                        {rupiah(Number(txn?.grand_total ?? 0))}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {q.status === "baru" && (
                        <button
                          disabled={isBusy}
                          onClick={() => handleUpdate(q.id, "diproses")}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FFB000] py-3 text-xs font-extrabold text-[color:var(--brand-deep)] shadow-md transition hover:bg-[#FF9E3D] active:scale-95 disabled:opacity-50"
                        >
                          <Play className="h-4 w-4 fill-current" /> Mulai Proses
                        </button>
                      )}

                      {q.status === "diproses" && (
                        <button
                          disabled={isBusy}
                          onClick={() => handleUpdate(q.id, "selesai")}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#22C55E] py-3 text-xs font-extrabold text-white shadow-md transition hover:bg-emerald-600 active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Tandai Selesai
                        </button>
                      )}

                      {q.status === "selesai" && (
                        <button
                          disabled={isBusy}
                          onClick={() => handleUpdate(q.id, "diambil")}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 text-xs font-extrabold text-white shadow-md transition hover:bg-sky-600 active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Sudah Diambil
                        </button>
                      )}

                      <button
                        disabled={isBusy}
                        onClick={() => handleUpdate(q.id, "dibatalkan")}
                        className="rounded-2xl bg-secondary p-3 text-xs font-bold text-destructive hover:bg-destructive/10 transition active:scale-95 disabled:opacity-50"
                        title="Batalkan Pesanan"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "baru") {
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700 ring-1 ring-slate-300">
        Baru
      </span>
    );
  }
  if (status === "diproses") {
    return (
      <span className="rounded-full bg-[#FFB000]/20 px-3 py-1 text-xs font-extrabold text-[#FF7A00] ring-1 ring-[#FFB000]/40">
        Sedang Diproses
      </span>
    );
  }
  if (status === "selesai") {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-300">
        Selesai
      </span>
    );
  }
  return (
    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground">
      {status}
    </span>
  );
}

function ElapsedTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}m ${s}s`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [startTime]);

  return <span>{elapsed}</span>;
}
