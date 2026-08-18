import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Monitor,
  Tv,
  ExternalLink,
  Clock,
  CheckCircle2,
  Play,
  Bell,
  Sparkles,
  ShoppingBag,
  Store,
  CreditCard,
  Flame,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PaymentModal, type PaymentPayload } from "@/components/PaymentModal";
import { ReceiptModal, type ReceiptData } from "@/components/ReceiptModal";
import { SweetAlertModal, type SweetAlertProps } from "@/components/SweetAlertModal";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { checkout, listCatalog, listActiveOrders, updateQueueStatus } from "@/lib/pos.functions";

export const Route = createFileRoute("/kasir")({
  head: () => ({ meta: [{ title: "Kasir POS — Square & Loyverse Style" }] }),
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

  // SweetAlert Modal State
  const [alertConfig, setAlertConfig] = useState<SweetAlertProps | null>(null);

  // Live Clock State
  const [timeStr, setTimeStr] = useState("");
  useEffect(() => {
    const update = () => {
      setTimeStr(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

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
      setAlertConfig({
        type: "error",
        title: "Stok Produk Habis!",
        message: `Produk "${p.name}" tidak dapat ditambahkan karena stok sudah 0.`,
        confirmText: "Paham",
        onConfirm: () => setAlertConfig(null),
      });
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

  const handleClearCart = () => {
    setAlertConfig({
      type: "warning",
      title: "Kosongkan Keranjang?",
      message: "Seluruh item yang dipilih akan dihapus dari daftar pesanan saat ini.",
      showCancel: true,
      cancelText: "Batal",
      confirmText: "Ya, Kosongkan",
      onConfirm: () => {
        setCart([]);
        setAlertConfig(null);
        toast.info("Keranjang belanja dikosongkan");
      },
      onCancel: () => setAlertConfig(null),
    });
  };

  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const total = subtotal;

  const handlePay = async (payload: PaymentPayload) => {
    try {
      const res = await doCheckout({
        data: {
          items: cart.map((l) => ({ product_id: l.product_id, quantity: l.qty })),
          discount: payload.discount || 0,
          amount_paid: payload.amount_paid,
          payment_method: payload.payment_method,
          customer_name: payload.customer_name,
          order_type: payload.order_type,
          notes: payload.notes,
        },
      });

      const receiptObj: ReceiptData = {
        transaction_number: res.transaction_number,
        invoice_no: res.transaction_number,
        queue_number: res.queue_number,
        queue_no: res.queue_number,
        cashier_name: res.cashier_name || staff.name,
        created_at: res.created_at,
        subtotal: Number(res.subtotal),
        discount: Number(res.discount),
        grand_total: Number(res.grand_total),
        total: Number(res.grand_total),
        paid: Number(res.amount_paid),
        amount_paid: Number(res.amount_paid),
        change_amount: Number(res.change_amount),
        payment_method: res.payment_method,
        items: res.items.map((it) => ({
          name: it.name,
          product_name: it.name,
          quantity: it.quantity,
          qty: it.quantity,
          price: Number(it.price),
          subtotal: Number(it.subtotal),
        })),
        store: {
          store_name: staff.outletName || "Outlet Kasir",
        },
      };

      setReceipt(receiptObj);
      setCart([]);
      setShowPay(false);
      refetch();
      refetchActiveOrders();

      // Trigger SweetAlert Animated Popup Success
      setAlertConfig({
        type: "success",
        title: "Transaksi Selesai & Lunas!",
        message: `Nomor Antrean: #${String(res.queue_number).padStart(3, "0")} • Total: ${rupiah(Number(res.grand_total))}`,
        confirmText: "Cetak Struk",
        onConfirm: () => {
          setAlertConfig(null);
        },
      });
    } catch (e) {
      setAlertConfig({
        type: "error",
        title: "Gagal Memproses Transaksi",
        message: e instanceof Error ? e.message : "Terjadi kesalahan sistem",
        confirmText: "Tutup",
        onConfirm: () => setAlertConfig(null),
      });
    }
  };

  const handleStatusChange = async (queueId: string, status: "baru" | "diproses" | "selesai" | "diambil" | "batal") => {
    try {
      await doUpdateQueue({ data: { queueId, status } });
      refetchActiveOrders();

      // SweetAlert Notification for Status Update
      setAlertConfig({
        type: "info",
        title: `Status Antrean: ${status.toUpperCase()}`,
        message: `Antrean pesanan berhasil diperbarui ke status ${status.toUpperCase()}.`,
        confirmText: "OK",
        onConfirm: () => setAlertConfig(null),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui status");
    }
  };

  return (
    <AppShell staff={staff} fullBleed>
      <div className="grid h-screen grid-cols-1 lg:grid-cols-[1fr_420px] bg-[#FAFAFB]">
        {/* Main Products Area */}
        <section className="flex min-h-0 flex-col p-6">
          {/* Header Bar POS (Loyverse & Square Style) */}
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-sm border border-[#E5E7EB]">
            <div className="min-w-0 flex-1 flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[#2952E3] text-white grid place-items-center font-black text-xl shadow-md">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#111827] text-base">
                    {staff.outletName ?? "Kasir Outlet"}
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300">
                    ONLINE
                  </span>
                </div>
                <div className="text-xs text-[#9CA3AF] font-semibold flex items-center gap-2">
                  Kasir: <b className="text-[#111827]">{staff.name}</b> • <Clock className="h-3.5 w-3.5 inline text-[#2952E3]" /> {timeStr || "16:00 WIB"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Display Links */}
              <a
                href="/display-pesanan"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-2xl bg-[#2952E3]/10 hover:bg-[#2952E3]/20 px-4 py-2.5 text-xs font-black text-[#2952E3] border border-[#2952E3]/20 transition active:scale-95"
                title="Buka Layar Display Pesanan di depan Meja Kasir"
              >
                <Monitor className="h-4 w-4" /> Display Pelanggan <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              <a
                href="/display-nomor"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-2xl bg-purple-50 hover:bg-purple-100 px-4 py-2.5 text-xs font-black text-purple-700 border border-purple-200 transition active:scale-95"
                title="Buka Layar TV Antrean"
              >
                <Tv className="h-4 w-4" /> Display TV <ExternalLink className="h-3 w-3 opacity-60" />
              </a>

              {/* Search Bar */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari produk / barcode..."
                  className="w-48 sm:w-64 rounded-2xl border border-[#E5E7EB] bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-[#111827] outline-none focus:border-[#2952E3] focus:bg-white transition"
                />
              </div>
            </div>
          </header>

          {/* Kategori Bar (Blue Active Highlight) */}
          <div className="mb-4 flex flex-wrap gap-2 overflow-x-auto pb-1">
            <CatChip active={catId === "all"} onClick={() => setCatId("all")}>
              Semua Menu
            </CatChip>
            {(data?.categories ?? []).map((c) => (
              <CatChip key={c.id} active={catId === c.id} onClick={() => setCatId(c.id)}>
                {c.name}
              </CatChip>
            ))}
          </div>

          {/* Product Grid Area */}
          <div className="min-h-0 flex-1 overflow-auto pr-1">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-48 animate-pulse rounded-3xl bg-white border border-[#E5E7EB]" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="grid h-full place-items-center text-center p-8 bg-white rounded-3xl border border-[#E5E7EB] shadow-xs">
                <div>
                  <ShoppingBag className="mx-auto h-16 w-16 text-[#9CA3AF] opacity-40 mb-3" />
                  <h3 className="text-base font-extrabold text-[#111827]">Tidak Ada Produk Ditemukan</h3>
                  <p className="text-xs text-[#9CA3AF] mt-1">Coba sesuaikan kata kunci pencarian atau pilih kategori lain.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => {
                  const priceVal = Number(p.selling_price ?? p.price ?? 0);
                  const isLowStock = p.stock > 0 && p.stock <= 5;
                  const isOutOfStock = p.stock <= 0;

                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart({ id: p.id, name: p.name, price: priceVal, stock: p.stock })}
                      disabled={isOutOfStock}
                      className="group relative flex flex-col justify-between rounded-3xl bg-white p-4 text-left shadow-xs border border-[#E5E7EB] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[#2952E3] active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      <div>
                        {/* Product Image / Gradient Avatar */}
                        <div
                          className="mb-3 grid h-28 w-full place-items-center rounded-2xl text-3xl font-black text-white shadow-inner relative overflow-hidden"
                          style={{ background: "linear-gradient(135deg, #2952E3 0%, #1E40AF 100%)" }}
                        >
                          {p.name.charAt(0).toUpperCase()}

                          {/* Badge Stok Menipis (Oranye) */}
                          {isLowStock && (
                            <span className="absolute top-2 right-2 bg-[#F97316] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow border border-amber-300">
                              Stok {p.stock}
                            </span>
                          )}

                          {/* Badge Habis */}
                          {isOutOfStock && (
                            <span className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center text-xs font-black text-white">
                              HABIS
                            </span>
                          )}
                        </div>

                        <div className="line-clamp-2 min-h-[2.5rem] font-bold text-[#111827] text-sm group-hover:text-[#2952E3] transition">
                          {p.name}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-base font-extrabold text-[#111827]">
                          {rupiah(priceVal)}
                        </div>
                        <span className="h-8 w-8 rounded-full bg-[#2952E3]/10 text-[#2952E3] group-hover:bg-[#2952E3] group-hover:text-white grid place-items-center transition font-bold text-xs">
                          +
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kontroler Status Antrean Aktif (Loyverse Queue Pipeline Controller) */}
          {(activeOrders ?? []).length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#E5E7EB] bg-white rounded-3xl p-4 shadow-sm border border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#F97316]" />
                  <h3 className="text-xs font-black text-[#111827] uppercase tracking-wider">
                    Kontroler Dapur & Status Pesanan ({(activeOrders ?? []).length})
                  </h3>
                </div>
                <span className="text-[11px] text-[#9CA3AF] font-semibold">Klik pill untuk ubah status:</span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {(activeOrders ?? []).slice(0, 5).map((ord: any) => {
                  const status = ord.status || "baru";
                  return (
                    <div
                      key={ord.id}
                      className="bg-[#FAFAFB] border border-[#E5E7EB] rounded-2xl p-3 min-w-[210px] shrink-0 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-[#F97316]">Antrean #{ord.queue_number}</span>
                        <span className="text-slate-700 truncate max-w-[90px]">{ord.customer_name || "Umum"}</span>
                      </div>

                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E5E7EB] text-[10px] font-extrabold">
                        <button
                          onClick={() => handleStatusChange(ord.id, "diproses")}
                          className={`px-2 py-1 rounded-lg transition ${
                            status === "diproses" ? "bg-[#F97316] text-white shadow" : "text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          <Play className="h-3 w-3 inline mr-0.5" /> Pros
                        </button>

                        <button
                          onClick={() => handleStatusChange(ord.id, "selesai")}
                          className={`px-2 py-1 rounded-lg transition ${
                            status === "selesai" ? "bg-emerald-600 text-white shadow" : "text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          <Bell className="h-3 w-3 inline mr-0.5" /> Siap
                        </button>

                        <button
                          onClick={() => handleStatusChange(ord.id, "diambil")}
                          className={`px-2 py-1 rounded-lg transition ${
                            status === "diambil" ? "bg-[#2952E3] text-white shadow" : "text-slate-500 hover:bg-slate-100"
                          }`}
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

        {/* Panel Keranjang Belanja (Sisi Kanan - Square POS Style) */}
        <aside className="flex min-h-0 flex-col border-l border-[#E5E7EB] bg-white p-6 shadow-xl justify-between">
          <div>
            <div className="pb-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[#2952E3]/10 text-[#2952E3] grid place-items-center font-bold">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#111827]">Pesanan Baru</h2>
                  <p className="text-xs text-[#9CA3AF] font-semibold">{cart.length} Jenis Item Terpilih</p>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="rounded-xl p-2 text-rose-600 hover:bg-rose-50 transition"
                  title="Kosongkan Keranjang"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* List Cart Items */}
            <div className="mt-4 min-h-0 max-h-[52vh] overflow-y-auto space-y-3 pr-1">
              {cart.length === 0 ? (
                <div className="py-20 text-center text-[#9CA3AF]">
                  <ShoppingBag className="mx-auto mb-3 h-14 w-14 opacity-30 text-[#2952E3]" />
                  <p className="text-sm font-bold text-[#111827]">Keranjang Masih Kosong</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">Sentuh produk di sebelah kiri untuk memasukkan ke pesanan.</p>
                </div>
              ) : (
                cart.map((l) => (
                  <div key={l.product_id} className="rounded-2xl bg-[#FAFAFB] border border-[#E5E7EB] p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-extrabold text-sm text-[#111827]">{l.product_name}</div>
                        <div className="text-xs text-[#9CA3AF] font-semibold">{rupiah(l.price)}</div>
                      </div>
                      <button
                        onClick={() => removeLine(l.product_id)}
                        className="rounded-lg p-1 text-[#9CA3AF] hover:text-rose-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 rounded-full bg-white p-1 ring-1 ring-[#E5E7EB] shadow-xs">
                        <button
                          onClick={() => setQty(l.product_id, l.qty - 1)}
                          className="grid h-7 w-7 place-items-center rounded-full hover:bg-slate-100 text-[#111827]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <div className="w-7 text-center font-extrabold text-xs">{l.qty}</div>
                        <button
                          onClick={() => setQty(l.product_id, l.qty + 1)}
                          className="grid h-7 w-7 place-items-center rounded-full bg-[#2952E3] text-white font-bold"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="font-black text-sm text-[#111827]">{rupiah(l.price * l.qty)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Summary & CTA BAYAR (Oranye Elegansi) */}
          <div className="pt-4 border-t border-[#E5E7EB] space-y-3">
            <div className="space-y-1.5 text-xs text-[#9CA3AF] font-semibold">
              <div className="flex justify-between">
                <span>Subtotal Pesanan</span>
                <span className="text-[#111827] font-bold">{rupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pajak (0%)</span>
                <span className="text-[#111827] font-bold">Rp 0</span>
              </div>
            </div>

            <div className="rounded-2xl bg-[#FAFAFB] border border-[#E5E7EB] p-4 flex items-baseline justify-between">
              <span className="text-xs font-black text-[#9CA3AF] uppercase">TOTAL PEMBAYARAN</span>
              <span className="text-3xl font-black text-[#111827]">{rupiah(total)}</span>
            </div>

            <button
              onClick={() => setShowPay(true)}
              disabled={cart.length === 0}
              className="w-full rounded-2xl py-4 text-base font-black text-white shadow-lg transition duration-200 active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #F97316 0%, #FB923C 100%)" }}
            >
              BAYAR SEKARANG ({rupiah(total)}) &rarr;
            </button>
          </div>
        </aside>
      </div>

      {showPay && <PaymentModal total={total} onClose={() => setShowPay(false)} onSubmit={handlePay} />}
      {receipt && <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />}
      {alertConfig && <SweetAlertModal {...alertConfig} />}
    </AppShell>
  );
}

function CatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-5 py-2.5 text-xs font-extrabold transition duration-200 active:scale-95 ${
        active
          ? "bg-[#2952E3] text-white shadow-md"
          : "bg-white text-slate-600 border border-[#E5E7EB] hover:text-[#111827] hover:border-[#2952E3]/50"
      }`}
    >
      {children}
    </button>
  );
}
