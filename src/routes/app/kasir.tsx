import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LogOut,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  Trash2,
  User,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PaymentModal, type PaymentMethod, type PaymentPayload } from "@/components/PaymentModal";
import { ReceiptModal, type ReceiptData } from "@/components/ReceiptModal";
import { getCurrentTenantSession, logoutSession } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { checkout, listCatalog } from "@/lib/pos.functions";

export const Route = createFileRoute("/app/kasir")({
  head: () => ({ meta: [{ title: "Kasir POS — GEN-CB Kasir" }] }),
  beforeLoad: async () => {
    const session = await getCurrentTenantSession();
    if (!session) throw redirect({ to: "/login" });
    return { session };
  },
  component: KasirPosPage,
});

type CartLine = {
  product_id: string;
  product_name: string;
  price: number;
  qty: number;
  stock_available: number;
  notes?: string;
};

function KasirPosPage() {
  const { session } = Route.useLoaderData();
  const navigate = useNavigate();

  const fetchCatalog = useServerFn(listCatalog);
  const doCheckout = useServerFn(checkout);
  const doLogout = useServerFn(logoutSession);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tenant-kasir-catalog", session.tenantId],
    queryFn: () => fetchCatalog({}),
  });

  const [q, setQ] = useState("");
  const [catId, setCatId] = useState<string | "all">("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [orderType, setOrderType] = useState<"dine_in" | "take_away">("dine_in");
  const [orderNotes, setOrderNotes] = useState("");
  const [showPay, setShowPay] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const handleLogout = async () => {
    await doLogout({});
    toast.success("Berhasil keluar dari Kasir");
    navigate({ to: "/login" });
  };

  const products = useMemo(() => {
    const list = data?.products ?? [];
    return list.filter((p) => {
      if (catId !== "all" && p.category_id !== catId) return false;
      if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !p.sku?.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [data, q, catId]);

  const addToCart = (p: { id: string; name: string; selling_price: number; stock: number }) => {
    if (p.stock <= 0) {
      toast.error(`Stok "${p.name}" telah habis`);
      return;
    }

    setCart((c) => {
      const idx = c.findIndex((l) => l.product_id === p.id);
      if (idx >= 0) {
        const cur = c[idx];
        if (cur.qty + 1 > p.stock) {
          toast.error(`Stok "${p.name}" tersisa ${p.stock}`);
          return c;
        }
        const updated = [...c];
        updated[idx] = { ...cur, qty: cur.qty + 1 };
        return updated;
      }
      return [
        ...c,
        {
          product_id: p.id,
          product_name: p.name,
          price: p.selling_price,
          qty: 1,
          stock_available: p.stock,
        },
      ];
    });
  };

  const setQty = (id: string, qty: number) => {
    setCart((c) => {
      if (qty <= 0) return c.filter((l) => l.product_id !== id);
      return c.map((l) => {
        if (l.product_id === id) {
          if (qty > l.stock_available) {
            toast.error(`Stok tidak mencukupi (maksimal ${l.stock_available})`);
            return l;
          }
          return { ...l, qty };
        }
        return l;
      });
    });
  };

  const removeLine = (id: string) => setCart((c) => c.filter((l) => l.product_id !== id));

  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const total = subtotal;

  const handlePay = async (payload: PaymentPayload) => {
    try {
      const res = await doCheckout({
        data: {
          items: cart.map((l) => ({
            product_id: l.product_id,
            quantity: l.qty,
            notes: l.notes || undefined,
          })),
          customer_name: payload.customer_name || customerName.trim() || undefined,
          order_type: payload.order_type || orderType,
          discount: payload.discount || 0,
          payment_method: payload.payment_method,
          amount_paid: payload.amount_paid,
          notes: payload.notes || orderNotes.trim() || undefined,
        },
      });

      toast.success(`Transaksi Berhasil! Antrean #${String(res.queue_number).padStart(3, "0")}`);
      setReceipt(res);
      setCart([]);
      setCustomerName("");
      setOrderNotes("");
      setShowPay(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses transaksi");
    }
  };

  return (
    <AppShell staff={{ id: session.staffId, name: session.name, role: session.tenantRole === "tenant_admin" ? "admin" : "kasir" }} fullBleed>
      <div className="grid h-screen grid-cols-1 lg:grid-cols-[1fr_440px] bg-[color:var(--bg-soft,#F7F9FC)]">
        {/* Products Section (65%) */}
        <section className="flex min-h-0 flex-col p-4 sm:p-6">
          <header className="mb-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wider font-extrabold text-[color:var(--brand)] flex items-center gap-1">
                <Store className="h-3.5 w-3.5" /> {session.businessName} ({session.tenantCode})
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[color:var(--brand-deep)]">Kasir POS</h1>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari produk atau SKU..."
                className="w-full rounded-2xl border border-border bg-white py-3 pl-10 pr-4 text-sm font-medium outline-none shadow-sm focus:border-[color:var(--brand)]"
              />
            </div>

            <button
              onClick={handleLogout}
              className="rounded-2xl bg-secondary px-3 py-3 text-xs font-extrabold text-muted-foreground hover:text-destructive hover:bg-red-50 transition"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </header>

          {/* Category Chips */}
          <div className="mb-4 flex flex-wrap gap-2 overflow-x-auto pb-1">
            <CatChip active={catId === "all"} onClick={() => setCatId("all")}>
              Semua Produk
            </CatChip>
            {(data?.categories ?? []).map((c: any) => (
              <CatChip key={c.id} active={catId === c.id} onClick={() => setCatId(c.id)}>
                {c.name}
              </CatChip>
            ))}
          </div>

          {/* Product Grid */}
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded-3xl bg-white/70" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <ShoppingBag className="mb-3 h-12 w-12 opacity-30 text-[color:var(--brand)]" />
                <div className="text-base font-bold">Belum ada produk</div>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                  {q || catId !== "all"
                    ? "Tidak ada produk yang cocok dengan pencarian atau filter."
                    : "Tambahkan produk pertama Anda melalui menu Produk di panel admin UKM."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((p: any) => {
                  const outOfStock = p.stock <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() =>
                        addToCart({
                          id: p.id,
                          name: p.name,
                          selling_price: Number(p.selling_price),
                          stock: p.stock,
                        })
                      }
                      disabled={outOfStock || !p.is_available}
                      className={`group relative flex flex-col items-start rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-border/80 transition-all hover:-translate-y-1 hover:shadow-md hover:ring-[color:var(--brand)]/50 active:scale-95 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none`}
                    >
                      {/* Image / Fallback Icon */}
                      <div className="relative mb-3 h-28 w-full overflow-hidden rounded-2xl bg-secondary/80 flex items-center justify-center">
                        {p.image_url && (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                              const fallback = (e.target as HTMLElement).nextElementSibling;
                              if (fallback) fallback.classList.remove("hidden");
                            }}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        )}
                        <div
                          className={`grid h-full w-full place-items-center text-3xl font-black text-white ${
                            p.image_url ? "hidden" : ""
                          }`}
                          style={{ background: "linear-gradient(135deg,#002B7F,#00A3FF)" }}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        {outOfStock && (
                          <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-xs text-white font-extrabold text-xs uppercase tracking-wider">
                            Habis
                          </div>
                        )}
                      </div>

                      <div className="line-clamp-2 min-h-[2.5rem] font-bold text-sm text-[color:var(--brand-deep)]">
                        {p.name}
                      </div>
                      <div className="mt-1 text-base font-black text-[color:var(--brand)]">
                        {rupiah(Number(p.selling_price))}
                      </div>

                      <div className="mt-2 flex w-full items-center justify-between text-[11px] font-semibold text-muted-foreground border-t border-border/40 pt-2">
                        <span className={p.stock <= p.minimum_stock ? "text-amber-600 font-bold" : ""}>
                          Stok: {p.stock} {p.unit || "pcs"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Cart Sidebar Section (35%) */}
        <aside className="flex min-h-0 flex-col border-l border-border/80 bg-white shadow-xl">
          {/* Header */}
          <div className="border-b border-border/60 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--brand)]/10 text-[color:var(--brand)]">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Keranjang Belanja</div>
                <div className="text-lg font-extrabold text-[color:var(--brand-deep)]">{cart.length} Jenis Item</div>
              </div>
            </div>

            {/* Customer Name & Order Type */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama Pelanggan..."
                  className="w-full rounded-xl border border-border bg-secondary/50 py-2 pl-9 pr-3 text-xs font-semibold outline-none focus:border-[color:var(--brand)]"
                />
              </div>

              <div className="flex rounded-xl bg-secondary/80 p-1 border border-border/50 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setOrderType("dine_in")}
                  className={`flex-1 rounded-lg py-1.5 transition ${
                    orderType === "dine_in"
                      ? "bg-[color:var(--brand-deep)] text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Dine In
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("take_away")}
                  className={`flex-1 rounded-lg py-1.5 transition ${
                    orderType === "take_away"
                      ? "bg-[color:var(--brand-deep)] text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Take Away
                </button>
              </div>
            </div>
          </div>

          {/* Cart Item List */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-muted-foreground">
                <div>
                  <Utensils className="mx-auto mb-2 h-10 w-10 opacity-30 text-[color:var(--brand)]" />
                  <div className="font-bold text-sm">Keranjang Masih Kosong</div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cart.map((l) => (
                  <div key={l.product_id} className="rounded-2xl bg-secondary/70 p-3 border border-border/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold text-sm text-[color:var(--brand-deep)]">{l.product_name}</div>
                        <div className="text-xs font-semibold text-muted-foreground">{rupiah(l.price)}</div>
                      </div>
                      <button
                        onClick={() => removeLine(l.product_id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-white hover:text-destructive transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full bg-white p-1 ring-1 ring-border shadow-2xs">
                        <button
                          onClick={() => setQty(l.product_id, l.qty - 1)}
                          className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <div className="w-7 text-center font-black text-sm">{l.qty}</div>
                        <button
                          onClick={() => setQty(l.product_id, l.qty + 1)}
                          className="grid h-7 w-7 place-items-center rounded-full bg-[color:var(--brand)] text-white shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="font-black text-base text-[color:var(--brand-deep)]">
                        {rupiah(l.price * l.qty)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout Action Footer */}
          <div className="border-t border-border/80 p-4 sm:p-5 bg-white">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground font-medium">
              <span>Subtotal</span>
              <span className="font-bold text-foreground">{rupiah(subtotal)}</span>
            </div>

            <div className="mb-4 flex items-baseline justify-between border-t border-dashed border-border pt-2">
              <span className="text-sm font-extrabold text-muted-foreground">TOTAL DIBAYAR</span>
              <span className="text-3xl font-black text-[color:var(--brand-deep)]">{rupiah(total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                className="rounded-2xl bg-secondary py-3.5 text-xs font-extrabold text-[color:var(--brand-deep)] hover:bg-secondary/80 disabled:opacity-40"
              >
                Kosongkan
              </button>
              <button
                type="button"
                onClick={() => setShowPay(true)}
                disabled={cart.length === 0}
                className="btn-orange rounded-2xl py-3.5 text-base font-extrabold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bayar Sekarang
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showPay && <PaymentModal subtotal={subtotal} total={total} onClose={() => setShowPay(false)} onSubmit={handlePay} />}
      {receipt && <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />}
    </AppShell>
  );
}

function CatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-extrabold transition shadow-xs ${
        active
          ? "text-white shadow-md"
          : "bg-white text-muted-foreground ring-1 ring-border/80 hover:text-[color:var(--brand-deep)] hover:bg-secondary/60"
      }`}
      style={active ? { background: "linear-gradient(135deg,#002B7F,#0047B3)" } : undefined}
    >
      {children}
    </button>
  );
}
