import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Maximize2, Minimize2, QrCode, ShoppingBag, Sparkles, Store, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getStoreSettings, listActiveOrders } from "@/lib/pos.functions";
import { rupiah } from "@/lib/format";

export const Route = createFileRoute("/display-pesanan")({
  head: () => ({ meta: [{ title: "Display Depan Pelanggan — Light Theme" }] }),
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

  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ["display_store_settings"],
    queryFn: () => fetchSettings({}),
    refetchInterval: 2000,
  });

  const { data: activeOrders } = useQuery({
    queryKey: ["display_active_orders"],
    queryFn: () => fetchOrders(),
    refetchInterval: 3000,
  });

  // Listen to live BroadcastChannel from Kasir POS & Settings
  useEffect(() => {
    const bcCart = new BroadcastChannel("gencb_pos_cart");
    bcCart.onmessage = (ev) => {
      if (ev.data) setLiveCart(ev.data);
    };

    const bcSettings = new BroadcastChannel("gencb_settings_update");
    bcSettings.onmessage = () => {
      refetchSettings();
    };

    return () => {
      bcCart.close();
      bcSettings.close();
    };
  }, [refetchSettings]);

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

  const storeName = settings?.store_name || "Outlet Kasir";
  const logoUrl = settings?.logo_url;
  const slide = promoSlides[currentSlide];

  return (
    <div className="h-screen w-screen overflow-hidden flex font-sans bg-[#F8F9FB] text-[#1A1D29] select-none">
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
            {/* Local Dark Overlay ONLY on top of photo to ensure high text contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>
        ))}

        {/* Top Header Overlay - Light Theme Glass Card */}
        <div className="relative z-10 p-8 flex items-center justify-between">
          <div className="flex items-center gap-4 bg-white/95 backdrop-blur-md px-6 py-3.5 rounded-3xl border border-slate-200 shadow-lg text-[#1A1D29]">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="h-12 w-12 object-contain rounded-2xl bg-white border border-slate-200 p-1 shadow-xs" />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-[#2952E3] text-white grid place-items-center font-black text-2xl shadow-md">
                {storeName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-[10px] font-black tracking-widest text-[#F97316] uppercase">OUTLET KASIR</div>
              <h1 className="text-2xl font-black text-[#1A1D29]">{storeName}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 bg-emerald-50 text-emerald-700 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold border border-emerald-200 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> LAYAR PELANGGAN AKTIF
            </span>

            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-[#1A1D29] backdrop-blur-md px-4 py-2.5 rounded-2xl text-xs font-bold border border-slate-300 shadow-xs transition active:scale-95"
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {fullscreen ? "Kecilkan" : "Layar Penuh"}
            </button>
          </div>
        </div>

        {/* Center Content Promo Overlay (White Text over Local Dark Photo Gradient) */}
        <div className="relative z-10 p-12 max-w-3xl">
          <span className="inline-flex items-center gap-2 bg-[#F97316] text-white px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase mb-4 shadow-lg">
            <Sparkles className="h-4 w-4" /> PROMO SPESIAL
          </span>
          <h2 className="text-5xl font-black text-white leading-tight drop-shadow-md mb-4">{slide.title}</h2>
          <p className="text-lg text-slate-200 font-medium drop-shadow">{slide.subtitle}</p>
        </div>

        {/* Bottom Slide Indicators */}
        <div className="relative z-10 p-8 flex items-center gap-3">
          {promoSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2.5 rounded-full transition-all duration-500 ${
                i === currentSlide ? "w-12 bg-white shadow-md" : "w-3 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* AREA 2 (30% LAYAR): LIVE SHOPPING BASKET OR QRIS PAYMENT (LIGHT)  */}
      {/* ------------------------------------------------------------------ */}
      <section className="w-[30%] h-full bg-white border-l border-[#E5E7EB] p-6 flex flex-col justify-between shadow-xl relative z-20">
        {liveCart.showQris ? (
          /* STATE B: QRIS PAYMENT SCAN (LIGHT THEME) */
          <div className="flex-1 flex flex-col justify-between">
            <div className="text-center pb-5 border-b border-[#E5E7EB]">
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#F97316] uppercase tracking-widest bg-[#FFF4E6] px-3 py-1 rounded-full border border-[#F97316]/20 mb-2">
                <QrCode className="h-3.5 w-3.5" /> PEMBAYARAN QRIS
              </div>
              <h3 className="text-xl font-black text-[#1A1D29]">SCAN QRIS DI SINI</h3>
              <p className="text-xs text-slate-500 mt-1">BCA, Mandiri, GoPay, OVO, ShopeePay, Dana & QRIS Bank</p>
            </div>

            {/* QRIS Code Card Light */}
            <div className="my-auto bg-[#FAFAFB] border border-[#E5E7EB] rounded-3xl p-6 text-center shadow-xs flex flex-col items-center justify-center">
              <div className="bg-[#F97316] text-white font-black text-xs px-4 py-1 rounded-md tracking-wider mb-4 shadow">
                QRIS
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-md border-2 border-[#E5E7EB]">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=00020101021226680016ID.GENCB.KASIR0118936009140000000000520458125303360540${
                    liveCart.total || 15000
                  }5802ID5912${encodeURIComponent(storeName)}6007JAKARTA6304`}
                  alt="QRIS Pembayaran"
                  className="w-48 h-48 object-contain"
                />
              </div>

              <p className="text-[11px] font-bold text-slate-500 mt-4 uppercase tracking-wider">
                MERCHANT: <span className="text-[#1A1D29] font-black">{storeName}</span>
              </p>
            </div>

            {/* Total Payment Callout Light */}
            <div className="bg-white border border-[#2952E3]/20 rounded-2xl p-4 text-center shadow-xs">
              <div className="text-xs text-slate-500 font-semibold">TOTAL PEMBAYARAN:</div>
              <div className="text-3xl font-black text-[#F97316] mt-1">{rupiah(liveCart.total)}</div>
            </div>
          </div>
        ) : (
          /* STATE A: LIVE SHOPPING BASKET (LIGHT THEME) */
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7EB]">
                <div className="h-10 w-10 rounded-2xl bg-[#2952E3]/10 text-[#2952E3] grid place-items-center font-bold">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#1A1D29]">PESANAN ANDA</h3>
                  <p className="text-xs text-slate-500">Rincian pesanan sedang diproses kasir</p>
                </div>
              </div>

              {/* Items List */}
              <div className="mt-4 space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {liveCart.items.length === 0 ? (
                  <div className="py-20 text-center text-slate-400">
                    <ShoppingBag className="mx-auto h-12 w-12 opacity-30 mb-2 text-[#2952E3]" />
                    <p className="text-xs font-semibold text-[#1A1D29]">Selamat datang!</p>
                    <p className="text-[11px] text-slate-500 mt-1">Pesanan Anda akan tampil di sini saat kasir memilih menu.</p>
                  </div>
                ) : (
                  liveCart.items.map((it, idx) => (
                    <div key={idx} className="bg-[#FAFAFB] border border-[#E5E7EB] rounded-2xl p-3.5 flex items-center justify-between">
                      <div>
                        <div className="font-extrabold text-sm text-[#1A1D29]">{it.product_name}</div>
                        <div className="text-xs text-slate-500 font-semibold">
                          {it.qty} x {rupiah(it.price)}
                        </div>
                      </div>
                      <div className="font-black text-sm text-[#2952E3]">{rupiah(it.price * it.qty)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total Pembayaran Footer Light Card */}
            <div className="pt-4 border-t border-[#E5E7EB] space-y-3">
              <div className="bg-[#FAFAFB] border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">TOTAL BELANJA:</div>
                  <div className="text-2xl font-black text-[#F97316] mt-0.5">{rupiah(liveCart.total)}</div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
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
