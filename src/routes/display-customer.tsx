import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Maximize2, Minimize2, QrCode, ShoppingBag, Sparkles, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDisplayContext } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";

export const Route = createFileRoute("/display-customer")({
  head: () => ({ meta: [{ title: "Customer Display — Gen CB Kasir" }] }),
  loader: async () => {
    const ctx = await getDisplayContext();
    return { ctx };
  },
});

type DisplayCartItem = {
  name: string;
  price: number;
  qty: number;
};

export default function CustomerDisplayPage() {
  const loaderCtx = Route.useLoaderData().ctx;
  const fetchCtx = useServerFn(getDisplayContext);

  const { data: displayCtx } = useQuery({
    queryKey: ["display-customer-ctx"],
    queryFn: () => fetchCtx({}),
    initialData: loaderCtx,
  });

  const tenantId = displayCtx?.tenantId || "00000000-0000-0000-0000-000000000001";
  const settings = displayCtx?.settings;

  // Realtime state from Cashier POS
  const [cart, setCart] = useState<DisplayCartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<"idle" | "cart" | "qris" | "success">("idle");
  const [qrisData, setQrisData] = useState<{ amount: number; qrUrl: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);

  // Slideshow promos
  const promos = [
    { title: "Selamat Datang di " + (settings?.store_name || "Gen CB Cafe"), desc: "Nikmati sajian berkualitas dengan pelayanan terbaik kami.", badge: "GEN CB POS" },
    { title: "Promo Menu Favorit Hari Ini", desc: "Dapatkan diskon khusus untuk paket kombinasi makanan & minuman.", badge: "SPESIAL PROMO" },
    { title: "Pembayaran QRIS Serba Praktis", desc: "Bisa bayar menggunakan GoPay, OVO, Dana, ShopeePay, dan M-Banking.", badge: "CASHLESS" },
  ];

  // Auto slideshow timer
  useEffect(() => {
    if (paymentMode !== "idle") return;
    const interval = setInterval(() => {
      setPromoIndex((prev) => (prev + 1) % promos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [paymentMode]);

  // Subscribe to Supabase Realtime channel for Customer Display pairing
  useEffect(() => {
    const channel = supabase.channel(`tenant:${tenantId}:customer-display`);

    channel
      .on("broadcast", { event: "cart_update" }, ({ payload }) => {
        if (payload?.items && Array.isArray(payload.items)) {
          setCart(payload.items);
          setPaymentMode(payload.items.length > 0 ? "cart" : "idle");
        }
      })
      .on("broadcast", { event: "show_qris" }, ({ payload }) => {
        if (payload?.qrUrl && payload?.amount) {
          setQrisData({ amount: payload.amount, qrUrl: payload.qrUrl });
          setPaymentMode("qris");
        }
      })
      .on("broadcast", { event: "payment_success" }, () => {
        setPaymentMode("success");
        setTimeout(() => {
          setCart([]);
          setQrisData(null);
          setPaymentMode("idle");
        }, 4000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white font-sans selection:bg-amber-500">
      {/* Top Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 font-black text-slate-950 shadow-lg">
            {settings?.store_name?.charAt(0) || "G"}
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wide text-amber-400">{settings?.store_name || "Gen CB Cafe"}</h1>
            <p className="text-[11px] font-semibold text-slate-400">Customer Display Screen</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-white/20 transition active:scale-95"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span>{isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left Side: Cart / Order Items (60%) */}
        <section className="flex flex-1 flex-col border-b border-white/10 lg:border-b-0 lg:border-r border-slate-800/80 bg-slate-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest font-extrabold text-amber-400/90 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Pesanan Anda
            </span>
            <span className="text-xs font-bold text-slate-400">{cart.length} Item</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto space-y-3 pr-2">
            {cart.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-slate-500">
                <div>
                  <Utensils className="mx-auto mb-3 h-16 w-16 opacity-20 text-amber-400" />
                  <div className="text-lg font-bold text-slate-400">Keranjang Belum Diisi</div>
                  <p className="mt-1 text-xs text-slate-500">Item pilihan Anda akan tampil secara otomatis di layar ini.</p>
                </div>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl bg-slate-900/90 p-4 border border-white/5 shadow-md transition hover:border-amber-500/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-extrabold text-white truncate">{item.name}</div>
                    <div className="text-xs font-semibold text-slate-400">{rupiah(item.price)} / pcs</div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <span className="rounded-xl bg-amber-500/10 px-3 py-1 text-sm font-black text-amber-400 border border-amber-500/20">
                      {item.qty} ×
                    </span>
                    <span className="text-lg font-black text-white w-28 text-right">{rupiah(item.price * item.qty)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Subtotal Footer */}
          <div className="mt-4 rounded-3xl bg-slate-900 p-5 border border-amber-500/20 shadow-xl">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-extrabold text-slate-400 uppercase tracking-wider">TOTAL PEMBAYARAN</span>
              <span className="text-4xl font-black text-amber-400">{rupiah(subtotal)}</span>
            </div>
          </div>
        </section>

        {/* Right Side: Interactive Display (QRIS / Success / Promo Slideshow) (40%) */}
        <section className="relative flex w-full lg:w-[480px] shrink-0 flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 p-8 text-center">
          {paymentMode === "qris" && qrisData ? (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-4 py-1.5 text-xs font-black text-amber-400 border border-amber-500/30">
                <QrCode className="h-4 w-4" /> SCAN UNTUK BAYAR
              </span>

              <div className="text-2xl font-black text-white">Silakan Scan QRIS</div>

              <div className="mx-auto grid h-64 w-64 place-items-center rounded-3xl bg-white p-3 shadow-2xl ring-4 ring-amber-500/40">
                <img src={qrisData.qrUrl} alt="QRIS Code" className="h-full w-full object-contain" />
              </div>

              <div className="text-3xl font-black text-amber-400">{rupiah(qrisData.amount)}</div>
              <p className="text-xs font-medium text-slate-400 max-w-xs mx-auto">
                Bisa menggunakan aplikasi GoPay, OVO, Dana, ShopeePay, LinkAja, atau Mobile Banking.
              </p>
            </div>
          ) : paymentMode === "success" ? (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 ring-4 ring-emerald-500/40 shadow-xl">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div className="text-3xl font-black text-white">PEMBAYARAN BERHASIL!</div>
              <p className="text-sm font-semibold text-slate-300">Terima kasih telah berbelanja di {settings?.store_name || "Gen CB Cafe"}.</p>
              <div className="text-xs text-slate-500">Silakan menunggu nomor antrean Anda dipanggil.</div>
            </div>
          ) : (
            /* Promo Slideshow Mode */
            <div className="space-y-6 max-w-sm animate-in fade-in duration-500">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-1.5 text-xs font-black text-amber-400 border border-amber-500/20">
                <Sparkles className="h-3.5 w-3.5" /> {promos[promoIndex].badge}
              </div>

              <h2 className="text-2xl font-black text-white leading-snug">{promos[promoIndex].title}</h2>

              <p className="text-xs text-slate-400 font-medium leading-relaxed">{promos[promoIndex].desc}</p>

              {/* Dots */}
              <div className="flex justify-center gap-2 pt-4">
                {promos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPromoIndex(i)}
                    className={`h-2 rounded-full transition-all ${i === promoIndex ? "w-8 bg-amber-400" : "w-2 bg-slate-700"}`}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
