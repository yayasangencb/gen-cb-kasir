import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Maximize2, Minimize2, QrCode, ShoppingBag, Sparkles, Store, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getStoreSettings, listActiveOrders } from "@/lib/pos.functions";
import { rupiah } from "@/lib/format";

export const Route = createFileRoute("/display-pesanan")({
  head: () => ({ meta: [{ title: "Display Depan Pelanggan — Kasir" }] }),
  component: CustomerFacingDisplayPage,
});

type LiveCartMessage = {
  items: Array<{ product_name: string; price: number; qty: number }>;
  total: number;
  showQris?: boolean;
};

function CustomerFacingDisplayPage() {
  const fetchSettings = useServerFn(getStoreSettings);
  const fetchOrders = useServerFn(listActiveOrders);

  const [fullscreen, setFullscreen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [liveCart, setLiveCart] = useState<LiveCartMessage>({ items: [], total: 0, showQris: false });

  const { data: settings } = useQuery({
    queryKey: ["display_store_settings"],
    queryFn: () => fetchSettings({}),
    refetchInterval: 10000,
  });

  const { data: activeOrders } = useQuery({
    queryKey: ["display_active_orders"],
    queryFn: () => fetchOrders(),
    refetchInterval: 3000,
  });

  // Listen to live BroadcastChannel from Kasir POS
  useEffect(() => {
    const bc = new BroadcastChannel("gencb_pos_cart");
    bc.onmessage = (ev) => {
      if (ev.data) setLiveCart(ev.data);
    };
    return () => bc.close();
  }, []);

  // Promo Banners from Store Settings
  const promoSlides = [
    {
      id: 1,
      title: settings?.promo_title_1 || "PROMO KOPI SPESIAL HARI INI",
      subtitle: "Nikmati Kelezatan Varian Espresso & Ice Blend Favorit Anda",
      image: settings?.promo_image_1 || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1600&auto=format&fit=crop",
    },
    {
      id: 2,
      title: settings?.promo_title_2 || "HAPPY HOUR DISKON 25%",
      subtitle: "Setiap jam 14.00 - 17.00 WIB untuk semua minuman pilihan",
      image: settings?.promo_image_2 || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1600&auto=format&fit=crop",
    },
    {
      id: 3,
      title: settings?.promo_title_3 || "FRESHLY BAKED PASTRIES",
      subtitle: "Kombinasi Sempurna Menyertai Minuman Favorit Anda",
      image: settings?.promo_image_3 || "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?q=80&w=1600&auto=format&fit=crop",
    },
  ];

  // Autoplay Promo Slideshow every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promoSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [promoSlides.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const storeName = settings?.store_name || "Kasir Outlet";
  const logoUrl = settings?.logo_url;
  const slide = promoSlides[currentSlide];

  return (
    <div className="h-screen w-screen overflow-hidden flex font-sans bg-slate-950 text-slate-100 select-none">
      {/* ------------------------------------------------------------------ */}
      {/* AREA 1 (70% LAYAR): PROMOTIONAL BANNER SLIDESHOW & BRANDING        */}
      {/* ------------------------------------------------------------------ */}
      <section className="w-[70%] h-full relative flex flex-col justify-between overflow-hidden">
        {/* Background Image Slideshow with smooth crossfade */}
        {promoSlides.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
            }`}
          >
            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/60" />
          </div>
        ))}

        {/* Top Header Overlay - NO Gen-CB Branding */}
        <div className="relative z-10 p-8 flex items-center justify-between">
          <div className="flex items-center gap-4 bg-slate-950/80 backdrop-blur-md px-6 py-3.5 rounded-2xl border border-white/10 shadow-2xl">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="h-12 w-12 object-contain rounded-xl bg-white p-1" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-amber-500 text-slate-950 grid place-items-center font-black text-2xl shadow-lg border border-amber-400">
                {storeName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-[10px] font-black tracking-widest text-amber-400 uppercase">OUTLET KASIR</div>
              <h1 className="text-2xl font-black text-white">{storeName}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold border border-emerald-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" /> LAYAR PELANGGAN AKTIF
            </span>

            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-700 transition"
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {fullscreen ? "Kecilkan" : "Layar Penuh"}
            </button>
          </div>
        </div>

        {/* Center Content Promo Overlay */}
        <div className="relative z-10 p-12 max-w-3xl">
          <span className="inline-flex items-center gap-2 bg-amber-500 text-slate-950 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase mb-4 shadow-lg">
            <Sparkles className="h-4 w-4" /> PROMO SPESIAL
          </span>
          <h2 className="text-5xl font-black text-white leading-tight drop-shadow-lg mb-4">{slide.title}</h2>
          <p className="text-lg text-slate-200 font-medium drop-shadow">{slide.subtitle}</p>
        </div>

        {/* Bottom Slide Indicators */}
        <div className="relative z-10 p-8 flex items-center gap-3">
          {promoSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2.5 rounded-full transition-all duration-500 ${
                i === currentSlide ? "w-12 bg-amber-400" : "w-3 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* AREA 2 (30% LAYAR): LIVE SHOPPING BASKET OR QRIS PAYMENT ON PAY   */}
      {/* ------------------------------------------------------------------ */}
      <section className="w-[30%] h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl relative z-20">
        {liveCart.showQris ? (
          /* STATE B: QRIS PAYMENT SCAN (APPEARS ON QRIS CHECKOUT) */
          <div className="flex-1 flex flex-col justify-between">
            <div className="text-center pb-5 border-b border-slate-800">
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mb-2">
                <QrCode className="h-3.5 w-3.5" /> PEMBAYARAN QRIS
              </div>
              <h3 className="text-xl font-black text-white">SCAN QRIS DI SINI</h3>
              <p className="text-xs text-slate-400 mt-1">BCA, Mandiri, GoPay, OVO, ShopeePay, Dana & QRIS Bank</p>
            </div>

            {/* QRIS Code Card */}
            <div className="my-auto bg-slate-950 border border-slate-800 rounded-3xl p-6 text-center shadow-inner flex flex-col items-center justify-center">
              <div className="bg-rose-600 text-white font-black text-xs px-4 py-1 rounded-md tracking-wider mb-4 shadow">
                QRIS
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-2xl border-4 border-slate-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=00020101021226680016ID.GENCB.KASIR0118936009140000000000520458125303360540${
                    liveCart.total || 15000
                  }5802ID5912${encodeURIComponent(storeName)}6007JAKARTA6304`}
                  alt="QRIS Pembayaran"
                  className="w-48 h-48 object-contain"
                />
              </div>

              <p className="text-[11px] font-bold text-slate-400 mt-4 uppercase tracking-wider">
                MERCHANT: <span className="text-white font-extrabold">{storeName}</span>
              </p>
            </div>

            {/* Total Payment Callout */}
            <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 text-center">
              <div className="text-xs text-slate-400 font-semibold">TOTAL PEMBAYARAN:</div>
              <div className="text-3xl font-black text-amber-400 mt-1">{rupiah(liveCart.total)}</div>
            </div>
          </div>
        ) : (
          /* STATE A: LIVE SHOPPING BASKET (WHAT KASIR IS CLICKING IN REAL-TIME) */
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 grid place-items-center font-bold">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">PESANAN ANDA</h3>
                  <p className="text-xs text-slate-400">Rincian pesanan sedang diproses kasir</p>
                </div>
              </div>

              {/* Items List */}
              <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {liveCart.items.length === 0 ? (
                  <div className="py-16 text-center text-slate-500">
                    <ShoppingBag className="mx-auto h-12 w-12 opacity-30 mb-2" />
                    <p className="text-xs font-semibold">Selamat datang!</p>
                    <p className="text-[11px] text-slate-600">Pesanan Anda akan tampil di sini saat kasir memilih menu.</p>
                  </div>
                ) : (
                  liveCart.items.map((it, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
                      <div>
                        <div className="font-extrabold text-sm text-white">{it.product_name}</div>
                        <div className="text-xs text-slate-400">
                          {it.qty} x {rupiah(it.price)}
                        </div>
                      </div>
                      <div className="font-black text-sm text-amber-400">{rupiah(it.price * it.qty)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total Pembayaran Footer */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400">TOTAL BELANJA:</div>
                  <div className="text-2xl font-black text-amber-400">{rupiah(liveCart.total)}</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" /> LIVE SYNC
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
