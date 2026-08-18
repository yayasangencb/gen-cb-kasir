import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Search, ShoppingCart, Trash2, Monitor, Tv, ExternalLink, Clock, CheckCircle2, Play, Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PaymentModal, type PaymentMethod } from "@/components/PaymentModal";
import { ReceiptModal, type ReceiptData } from "@/components/ReceiptModal";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { checkout, listCatalog, listActiveOrders, updateQueueStatus } from "@/lib/pos.functions";

export const Route = createFileRoute("/kasir")({
  head: () => ({ meta: [{ title: "Kasir POS — Gen CB Kasir" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: KasirPage,
});

type CartLine = { product_id: string; product_name: string; price: number; qty: number };

function KasirPage() {
  const staff = Route.useLoaderData();
  const fetchCatalog = useServerFn(listCatalog);
  const fetchActiveOrders = useServerFn(listActiveOrders);
  const doCheckout = useServerFn(checkout);
  const doUpdateQueue = useServerFn(updateQueueStatus);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => fetchCatalog({}),
  });

  const { data: activeOrders, refetch: refetchActiveOrders } = useQuery({
    queryKey: ["pos_active_orders"],
    queryFn: () => fetchActiveOrders(),
    refetchInterval: 4000,
  });

  const [q, setQ] = useState("");
  const [catId, setCatId] = useState<string | "all">("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showPay, setShowPay] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  // Broadcast Live Cart to Customer Display (/display-pesanan)
  useEffect(() => {
    try {
      const bc = new BroadcastChannel("gencb_pos_cart");
      bc.postMessage({
        items: cart,
        total: cart.reduce((s, l) => s + l.price * l.qty, 0),
        showQris: showPay,
      });
      bc.close();
    } catch (e) {
      // broadcast fallback
    }
  }, [cart, showPay]);

  const products = useMemo(() => {
    const list = data?.products ?? [];
    return list.filter((p) => {
      if (catId !== "all" && p.category_id !== catId) return false;
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, q, catId]);

  const addToCart = (p: { id: string; name: string; selling_price?: number; price?: number; stock: number }) => {
    const priceVal = Number(p.selling_price ?? p.price ?? 0);
    if (p.stock <= 0) {
      toast.error("Stok habis");
      return;
    }
    setCart((c) => {
      const idx = c.findIndex((l) => l.product_id === p.id);
      if (idx >= 0) {
        const next = [...c];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...c, { product_id: p.id, product_name: p.name, price: priceVal, qty: 1 }];
    });
  };

  const setQty = (id: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.product_id !== id) : c.map((l) => (l.product_id === id ? { ...l, qty } : l))));

  const removeLine = (id: string) => setCart((c) => c.filter((l) => l.product_id !== id));

  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const total = subtotal;

  const handlePay = async ({ paid, method }: { paid: number; method: PaymentMethod }) => {
    try {
      const res = await doCheckout({
        data: {
          items: cart.map((l) => ({ product_id: l.product_id, quantity: l.qty })),
          discount: 0,
          amount_paid: paid,
          payment_method: method,
        },
      });
      toast.success(`Transaksi berhasil! Antrean #${String(res.queue_number).padStart(3, "0")}`);
      setReceipt({
        invoice_no: res.transaction_number,
        queue_no: res.queue_number,
        cashier_name: res.cashier_name,
        created_at: res.created_at,
        subtotal: Number(res.subtotal),
        discount: Number(res.discount),
        tax: 0,
        total: Number(res.grand_total),
        paid: Number(res.amount_paid),
        change_amount: Number(res.change_amount),
        payment_method: res.payment_method,
        items: res.items.map((it) => ({
          product_name: it.name,
          qty: it.quantity,
          price: Number(it.price),
          subtotal: Number(it.subtotal),
        })),
      });
      setCart([]);
      setShowPay(false);
      refetch();
      refetchActiveOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses transaksi");
    }
  };

  const handleStatusChange = async (queueId: string, status: "baru" | "diproses" | "selesai" | "diambil" | "batal") => {
    try {
      await doUpdateQueue({ data: { queueId, status } });
      toast.success(`Status antrean diperbarui ke ${status.toUpperCase()}`);
      refetchActiveOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui status");
    }
  };

  return (
    <AppShell staff={staff} fullBleed>
      <div className="grid h-screen grid-cols-1 lg:grid-cols-[1fr_420px]">
        {/* Products Section */}
        <section className="flex min-h-0 flex-col p-5">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-900 border border-amber-300">
                  {staff.outletName ?? "Kasir Outlet"}
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">POS</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">Kasir POS</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Display Links */}
              <a
                href="/display-pesanan"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                title="Buka Layar Display Pesanan di depan Meja Kasir (Pelanggan)"
              >
                <Monitor className="h-4 w-4" /> Display Pesanan <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              <a
                href="/display-nomor"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 border border-purple-200 hover:bg-purple-100 transition"
                title="Buka Layar Display Nomor Antrean TV Gantung"
              >
                <Tv className="h-4 w-4" /> Display TV Antrean <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari produk..."
                  className="w-48 sm:w-60 rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </header>

          <div className="mb-3 flex flex-wrap gap-2">
            <CatChip active={catId === "all"} onClick={() => setCatId("all")}>
              Semua
            </CatChip>
            {(data?.categories ?? []).map((c) => (
              <CatChip key={c.id} active={catId === c.id} onClick={() => setCatId(c.id)}>
                {c.name}
              </CatChip>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto pr-1">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/60" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="grid h-full place-items-center text-muted-foreground text-sm">
                Belum ada produk untuk toko ini.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => {
                  const priceVal = Number(p.selling_price ?? p.price ?? 0);
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart({ id: p.id, name: p.name, price: priceVal, stock: p.stock })}
                      disabled={p.stock <= 0}
                      className="group relative flex flex-col items-start rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-md hover:ring-amber-500/40 disabled:opacity-50"
                    >
                      <div
                        className="mb-3 grid h-24 w-full place-items-center rounded-xl text-3xl font-black text-white"
                        style={{ background: "linear-gradient(135deg,#0047B3,#00A3FF)" }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="line-clamp-2 min-h-[2.5rem] font-semibold">{p.name}</div>
                      <div className="mt-1 text-lg font-extrabold text-slate-900">
                        {rupiah(priceVal)}
                      </div>
                      <div
                        className={`mt-1 text-[11px] font-semibold ${p.stock <= 5 ? "text-rose-600 font-bold" : "text-slate-500"}`}
                      >
                        Stok: {p.stock}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ACTIVE QUEUE PIPELINE CONTROLLER (REVISI 6) */}
          {(activeOrders ?? []).length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200 bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Kontroler Status Pesanan Aktif ({(activeOrders ?? []).length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">Klik pill untuk mengubah status:</span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {(activeOrders ?? []).slice(0, 5).map((ord: any) => {
                  const status = ord.status || "baru";
                  return (
                    <div
                      key={ord.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 min-w-[200px] shrink-0 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-amber-700">No. #{ord.queue_number}</span>
                        <span className="text-slate-600 truncate max-w-[90px]">{ord.customer_name || "Umum"}</span>
                      </div>

                      {/* Status Action Buttons */}
                      <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-[10px] font-extrabold">
                        <button
                          onClick={() => handleStatusChange(ord.id, "diproses")}
                          className={`px-2 py-1 rounded transition ${
                            status === "diproses" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-500 hover:bg-slate-100"
                          }`}
                          title="Tandai Sedang Diproses"
                        >
                          <Play className="h-3 w-3 inline mr-0.5" /> Pros
                        </button>

                        <button
                          onClick={() => handleStatusChange(ord.id, "selesai")}
                          className={`px-2 py-1 rounded transition ${
                            status === "selesai" ? "bg-emerald-500 text-white shadow" : "text-slate-500 hover:bg-slate-100"
                          }`}
                          title="Tandai Siap Diambil / Selesai"
                        >
                          <Bell className="h-3 w-3 inline mr-0.5" /> Siap
                        </button>

                        <button
                          onClick={() => handleStatusChange(ord.id, "diambil")}
                          className={`px-2 py-1 rounded transition ${
                            status === "diambil" ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-100"
                          }`}
                          title="Tandai Sudah Diambil Pelanggan"
                        >
                          <CheckCircle2 className="h-3 w-3 inline mr-0.5" /> Ambil
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Cart Sidebar */}
        <aside className="flex min-h-0 flex-col border-l border-border bg-white/90 backdrop-blur">
          <div className="border-b border-border p-5">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-amber-600" />
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Keranjang Belanja</div>
                <div className="text-lg font-extrabold text-slate-900">{cart.length} item</div>
              </div>
              <div className="ml-auto text-right text-xs text-muted-foreground">
                Petugas: <b className="text-foreground">{staff.name}</b>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-muted-foreground">
                <div>
                  <ShoppingCart className="mx-auto mb-2 h-10 w-10 opacity-40" />
                  Keranjang kosong.
                  <br />
                  Sentuh produk untuk menambahkan.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((l) => (
                  <div key={l.product_id} className="rounded-2xl bg-secondary p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{l.product_name}</div>
                        <div className="text-xs text-muted-foreground">{rupiah(l.price)}</div>
                      </div>
                      <button
                        onClick={() => removeLine(l.product_id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-white hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full bg-white p-1 ring-1 ring-border">
                        <button
                          onClick={() => setQty(l.product_id, l.qty - 1)}
                          className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <div className="w-8 text-center font-bold">{l.qty}</div>
                        <button
                          onClick={() => setQty(l.product_id, l.qty + 1)}
                          className="grid h-8 w-8 place-items-center rounded-full bg-amber-500 text-slate-950 font-bold"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="font-extrabold text-slate-900">{rupiah(l.price * l.qty)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-5">
            <div className="mb-2 flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{rupiah(subtotal)}</span>
            </div>
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-muted-foreground">TOTAL PENJUALAN</span>
              <span className="text-3xl font-extrabold text-slate-900">{rupiah(total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                className="rounded-2xl bg-secondary py-4 font-bold text-slate-700 disabled:opacity-40"
              >
                Kosongkan
              </button>
              <button
                onClick={() => setShowPay(true)}
                disabled={cart.length === 0}
                className="rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 py-4 font-black shadow-lg disabled:opacity-50"
              >
                Bayar Sekarang
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showPay && <PaymentModal total={total} onClose={() => setShowPay(false)} onSubmit={handlePay} />}
      {receipt && <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />}
    </AppShell>
  );
}

function CatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-amber-500 text-slate-950 font-bold shadow-md"
          : "bg-white text-slate-600 ring-1 ring-border hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}
