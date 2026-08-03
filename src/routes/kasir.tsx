import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PaymentModal, type PaymentPayload } from "@/components/PaymentModal";
import { ReceiptModal, type ReceiptData } from "@/components/ReceiptModal";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { checkout, listCatalog } from "@/lib/pos.functions";

export const Route = createFileRoute("/kasir")({
  head: () => ({
    meta: [
      { title: "Kasir — GEN-CB Kasir" },
      { name: "description", content: "Layar kasir GEN-CB: pilih produk, hitung total, dan proses pembayaran." },
      { property: "og:title", content: "Kasir — GEN-CB Kasir" },
      { property: "og:description", content: "Layar kasir GEN-CB untuk transaksi penjualan harian." },
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
  component: KasirPage,
});

type CartLine = { product_id: string; name: string; price: number; quantity: number; stock: number };

function KasirPage() {
  const staff = Route.useLoaderData();
  const fetchCatalog = useServerFn(listCatalog);
  const doCheckout = useServerFn(checkout);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => fetchCatalog({}),
  });

  const [q, setQ] = useState("");
  const [catId, setCatId] = useState<string | "all">("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showPay, setShowPay] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const products = useMemo(() => {
    const list = data?.products ?? [];
    return list.filter((p) => {
      if (!p.is_available) return false;
      if (catId !== "all" && p.category_id !== catId) return false;
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, q, catId]);

  const addToCart = (p: { id: string; name: string; selling_price: number; stock: number }) => {
    if (p.stock <= 0) {
      toast.error("Stok habis");
      return;
    }
    setCart((c) => {
      const idx = c.findIndex((l) => l.product_id === p.id);
      if (idx >= 0) {
        if (c[idx].quantity >= p.stock) {
          toast.error(`Stok ${p.name} hanya ${p.stock}`);
          return c;
        }
        const next = [...c];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...c,
        { product_id: p.id, name: p.name, price: Number(p.selling_price), quantity: 1, stock: p.stock },
      ];
    });
  };

  const setQty = (id: string, quantity: number) =>
    setCart((c) =>
      quantity <= 0
        ? c.filter((l) => l.product_id !== id)
        : c.map((l) =>
            l.product_id === id ? { ...l, quantity: Math.min(quantity, l.stock) } : l,
          ),
    );

  const removeLine = (id: string) => setCart((c) => c.filter((l) => l.product_id !== id));

  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  const handlePay = async (v: PaymentPayload) => {
    try {
      const res = await doCheckout({
        data: {
          items: cart.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
          customer_name: v.customer_name || null,
          order_type: v.order_type,
          discount: v.discount,
          payment_method: v.payment_method,
          amount_paid: v.amount_paid,
          notes: v.notes || null,
        },
      });
      toast.success(`Transaksi berhasil! Antrean #${String(res.queue_number).padStart(3, "0")}`);
      setReceipt(res);
      setCart([]);
      setShowPay(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses transaksi");
    }
  };

  return (
    <AppShell staff={staff} fullBleed>
      <div className="grid h-screen grid-cols-1 lg:grid-cols-[1fr_420px]">
        {/* Products */}
        <section className="flex min-h-0 flex-col p-5">
          <header className="mb-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold text-[color:var(--brand-deep)]">Kasir</h1>
              <p className="text-sm text-muted-foreground">Pilih produk untuk menambahkan ke keranjang.</p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari produk..."
                className="w-72 rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[color:var(--brand)]"
              />
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
              <div className="grid h-full place-items-center text-muted-foreground">Tidak ada produk.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      addToCart({ id: p.id, name: p.name, selling_price: Number(p.selling_price), stock: p.stock })
                    }
                    disabled={p.stock <= 0}
                    className="group relative flex flex-col items-start rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-md hover:ring-[color:var(--brand)]/40 disabled:opacity-50"
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        loading="lazy"
                        className="mb-3 h-24 w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className="mb-3 grid h-24 w-full place-items-center rounded-xl text-3xl font-black text-white"
                        style={{ background: "linear-gradient(135deg,#003B8F,#1E6FD9)" }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="line-clamp-2 min-h-[2.5rem] font-semibold">{p.name}</div>
                    <div className="mt-1 text-lg font-extrabold text-[color:var(--brand-deep)]">
                      {rupiah(Number(p.selling_price))}
                    </div>
                    <div
                      className={`mt-1 text-[11px] font-semibold ${
                        p.stock <= p.minimum_stock ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      Stok: {p.stock} {p.unit}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Cart */}
        <aside className="flex min-h-0 flex-col border-l border-border bg-white/80 backdrop-blur">
          <div className="border-b border-border p-5">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-[color:var(--brand)]" />
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Keranjang</div>
                <div className="text-lg font-extrabold text-[color:var(--brand-deep)]">{cart.length} item</div>
              </div>
              <div className="ml-auto text-right text-xs text-muted-foreground">
                Kasir: <b className="text-foreground">{staff.name}</b>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-muted-foreground">
                <div>
                  <ShoppingCart className="mx-auto mb-2 h-10 w-10 opacity-40" />
                  Belum ada produk.
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
                        <div className="truncate font-semibold">{l.name}</div>
                        <div className="text-xs text-muted-foreground">{rupiah(l.price)}</div>
                      </div>
                      <button
                        onClick={() => removeLine(l.product_id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-white hover:text-destructive"
                        aria-label="Hapus item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full bg-white p-1 ring-1 ring-border">
                        <button
                          onClick={() => setQty(l.product_id, l.quantity - 1)}
                          className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
                          aria-label="Kurangi"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <div className="w-8 text-center font-bold">{l.quantity}</div>
                        <button
                          onClick={() => setQty(l.product_id, l.quantity + 1)}
                          className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--brand)] text-white"
                          aria-label="Tambah"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="font-extrabold text-[color:var(--brand-deep)]">
                        {rupiah(l.price * l.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-muted-foreground">SUBTOTAL</span>
              <span className="text-3xl font-extrabold text-[color:var(--brand-deep)]">{rupiah(subtotal)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                className="rounded-2xl bg-secondary py-4 font-bold text-[color:var(--brand-deep)] disabled:opacity-40"
              >
                Kosongkan
              </button>
              <button
                onClick={() => setShowPay(true)}
                disabled={cart.length === 0}
                className="btn-orange rounded-2xl py-4 font-extrabold disabled:opacity-50"
              >
                Bayar
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showPay && <PaymentModal subtotal={subtotal} onClose={() => setShowPay(false)} onSubmit={handlePay} />}
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
          ? "text-white shadow-md"
          : "bg-white text-muted-foreground ring-1 ring-border hover:text-[color:var(--brand-deep)]"
      }`}
      style={active ? { background: "linear-gradient(135deg,#002B7F,#003B8F)" } : undefined}
    >
      {children}
    </button>
  );
}
