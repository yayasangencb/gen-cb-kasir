import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Maximize2, Minimize2, QrCode, ShoppingBag, Sparkles, Clock, CheckCircle, Store, Coffee } from "lucide-react";
import { useEffect, useState } from "react";
import { listActiveOrders } from "@/lib/pos.functions";
import logoAsset from "@/assets/gen-cb-logo.png.asset.json";

export const Route = createFileRoute("/display-pesanan")({
  head: () => ({ meta: [{ title: "Display Depan Kasir (70% Promo & 30% QRIS) — Gen CB Kasir" }] }),
  component: CustomerFacingDisplayPage,
});

// Promotional Slideshow Banners (70% Screen Area)
const PROMO_SLIDES = [
  {
    id: 1,
    title: "PROMO KOPI SPESIAL HARI INI",
    subtitle: "Beli 2 Kopi Kenangan / Starbucks Gratis 1 Premium Donut!",
    tag: "PROMO HEMAT 30%",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1600&auto=format&fit=crop",
    color: "from-amber-600/90 to-slate-950/90",
  },
  {
    id: 2,
    title: "HAPPY HOUR DISKON 25%",
    subtitle: "Setiap jam 14.00 - 17.00 WIB untuk semua varian Espresso & Ice Blend",
    tag: "HAPPY HOUR",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1600&auto=format&fit=crop",
    color: "from-emerald-600/90 to-slate-950/90",
  },
  {
    id: 3,
    title: "FRESHLY BAKED PASTRIES & CAKE",
    subtitle: "Nikmati Kelezatan Croissant Hangat Menyertai Minuman Favorit Anda",
    tag: "FAVORIT PELANGGAN",
    image: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?q=80&w=1600&auto=format&fit=crop",
    color: "from-yellow-600/90 to-slate-950/90",
  },
];

function CustomerFacingDisplayPage() {
  const fetchOrders = useServerFn(listActiveOrders);
  const [fullscreen, setFullscreen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: activeOrders } = useQuery({
    queryKey: ["customer_display_orders"],
    queryFn: () => fetchOrders(),
    refetchInterval: 3000, // refresh active queue every 3s
  });

  // Autoplay Promo Slideshow every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const latestOrder = (activeOrders ?? [])[0];
  const slide = PROMO_SLIDES[currentSlide];

  return (
    <div className="h-screen w-screen overflow-hidden flex font-sans bg-slate-950 text-slate-100 select-none">
      {/* ------------------------------------------------------------------ */}
      {/* AREA 1: 70% LAYAR PROMOSI & BANNER SLIDESHOW                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="w-[70%] h-full relative flex flex-col justify-between overflow-hidden">
        {/* Background Image Slideshow with smooth crossfade */}
        {PROMO_SLIDES.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
            }`}
          >
            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            <div className={`absolute inset-0 bg-gradient-to-t ${item.color}`} />
          </div>
        ))}

        {/* Top Header Overlay */}
        <div className="relative z-10 p-8 flex items-center justify-between">
          <div className="flex items-center gap-4 bg-slate-950/70 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
            <img src={logoAsset.url} alt="Logo" className="h-10 w-10 object-contain" />
            <div>
              <div className="text-[10px] font-black tracking-widest text-amber-400 uppercase">GEN CB KASIR</div>
              <h1 className="text-xl font-extrabold text-white">GEN-CB CAFE & POS</h1>
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

        {/* Center Content Overlay */}
        <div className="relative z-10 p-12 max-w-3xl">
          <span className="inline-flex items-center gap-2 bg-amber-500 text-slate-950 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase mb-4 shadow-lg">
            <Sparkles className="h-4 w-4" /> {slide.tag}
          </span>
          <h2 className="text-5xl font-black text-white leading-tight drop-shadow-lg mb-4">{slide.title}</h2>
          <p className="text-lg text-slate-200 font-medium drop-shadow">{slide.subtitle}</p>
        </div>

        {/* Bottom Slide Indicators */}
        <div className="relative z-10 p-8 flex items-center gap-3">
          {PROMO_SLIDES.map((_, i) => (
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
      {/* AREA 2: 30% LAYAR PEMBAYARAN QRIS & RINGKASAN BELANJA             */}
      {/* ------------------------------------------------------------------ */}
      <section className="w-[30%] h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl relative z-20">
        <div>
          {/* Header Area */}
          <div className="text-center pb-5 border-b border-slate-800">
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mb-2">
              <QrCode className="h-3.5 w-3.5" /> METODE PEMBAYARAN
            </div>
            <h3 className="text-xl font-black text-white">SCAN QRIS DI SINI</h3>
            <p className="text-xs text-slate-400 mt-1">Mendukung BCA, Mandiri, GoPay, OVO, ShopeePay, Dana & QRIS Semua Bank</p>
          </div>

          {/* QRIS Display Card */}
          <div className="mt-6 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-center shadow-inner flex flex-col items-center justify-center relative overflow-hidden">
            {/* Standard QRIS Header Badge */}
            <div className="bg-rose-600 text-white font-black text-xs px-4 py-1 rounded-md tracking-wider mb-4 shadow">
              QRIS
            </div>

            {/* Simulated Scannable QR Code */}
            <div className="bg-white p-4 rounded-2xl shadow-2xl border-4 border-slate-200 relative group">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=00020101021226680016ID.GENCB.KASIR0118936009140000000000520458125303360540${
                  latestOrder?.grand_total ?? 15000
                }5802ID5912GEN+CB+CAFE6007JAKARTA6304`}
                alt="QRIS Code Pembayaran"
                className="w-48 h-48 object-contain"
              />
            </div>

            <p className="text-[11px] font-bold text-slate-400 mt-4 uppercase tracking-wider">
              NAMA MERCHANT: <span className="text-white font-extrabold">GEN-CB KASIR OFFICIAL</span>
            </p>
          </div>
        </div>

        {/* Order Summary & Active Queue Callout */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          {latestOrder ? (
            <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Pelanggan / Pesanan:</span>
                <span className="font-bold text-amber-400">No. #{latestOrder.queue_number}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-white">
                <span>{latestOrder.customer_name || "Pelanggan POS"}</span>
                <span className="text-xs font-normal text-slate-400">({latestOrder.items?.length ?? 1} item)</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Total Pembayaran:</span>
                <span className="text-xl font-black text-amber-400">
                  Rp {Number(latestOrder.grand_total).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <div className="text-xs font-bold text-slate-300">SIAP MELAYANI PESANAN</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Kasir sedang memproses pesanan...</div>
            </div>
          )}

          {/* Footer Branding */}
          <div className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            POWERED BY GEN CB KASIR MULTI-OUTLET
          </div>
        </div>
      </section>
    </div>
  );
}
