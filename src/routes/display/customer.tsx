import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Maximize2, Minimize2, QrCode, ShoppingCart, Store, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentTenantSession } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { getCustomerDisplayContext } from "@/lib/pos.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/display/customer")({
  head: () => ({ meta: [{ title: "Customer Display — GEN-CB Kasir" }] }),
  beforeLoad: async () => {
    const session = await getCurrentTenantSession();
    if (!session) throw redirect({ to: "/login" });
    return { session };
  },
  component: CustomerDisplayPage,
});

function CustomerDisplayPage() {
  const { session } = Route.useLoaderData();
  const fetchContext = useServerFn(getCustomerDisplayContext);

  const { data: displayData } = useQuery({
    queryKey: ["customer-display-context", session.tenantId],
    queryFn: () => fetchContext({}),
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const tenant = displayData?.tenant;
  const contents = displayData?.displayContents ?? [];
  const promos = displayData?.promotions ?? [];

  // Automatic Slideshow Timer
  useEffect(() => {
    if (contents.length <= 1) return;
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % contents.length);
    }, (contents[slideIndex]?.duration_seconds || 8) * 1000);
    return () => clearInterval(interval);
  }, [contents, slideIndex]);

  const currentContent = contents[slideIndex];

  return (
    <div
      className="min-h-screen flex flex-col justify-between p-6 sm:p-8 text-white selection:bg-none relative overflow-hidden"
      style={{
        background: tenant?.primary_color
          ? `radial-gradient(circle at top, ${tenant.primary_color} 0%, #001238 100%)`
          : "radial-gradient(circle at top, #002B7F 0%, #001238 100%)",
      }}
    >
      {/* Fullscreen Button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-40 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs font-black backdrop-blur-md border border-white/20 hover:bg-white/20 transition active:scale-95 text-white"
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        {isFullscreen ? "KELUAR FULLSCREEN" : "FULLSCREEN"}
      </button>

      {/* Top Header */}
      <header className="flex items-center gap-4 z-10">
        {tenant?.logo_url ? (
          <img src={tenant.logo_url} alt="Logo" className="h-16 w-16 rounded-2xl object-cover border-2 border-white/20 shadow-xl" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-[#FF7A00] to-[#FFB000] text-white font-black text-2xl shadow-xl">
            {session.tenantCode.substring(0, 2)}
          </div>
        )}

        <div>
          <div className="text-xs uppercase tracking-widest text-blue-200/80 font-extrabold flex items-center gap-1.5">
            <Store className="h-4 w-4 text-[#FFB000]" /> Selamat Datang Di
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{tenant?.business_name || session.businessName}</h1>
        </div>
      </header>

      {/* Main Idle Digital Signage Body */}
      <main className="my-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center z-10 py-6">
        {/* Left Column: Promo Banner / Slideshow */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FF7A00]/20 border border-[#FF7A00]/40 px-4 py-1.5 text-xs font-black text-[#FFB000] uppercase tracking-wider">
            PROMO &amp; PENAWARAN SPESIAL
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-3xl border-2 border-white/20 shadow-2xl bg-black/40">
            {currentContent ? (
              <img
                src={currentContent.media_url}
                alt={currentContent.title || "Banner Promo"}
                className="h-full w-full object-cover transition-all duration-700 hover:scale-105"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center space-y-2">
                <Utensils className="h-16 w-16 opacity-40 text-[#FFB000]" />
                <div className="text-xl font-black">Nikmati Hidangan Spesial Kami</div>
                <p className="text-xs text-blue-200/70 max-w-sm">
                  Pesan langsung di kasir dan rasakan kualitas rasa terbaik dari {session.businessName}.
                </p>
              </div>
            )}
          </div>

          {currentContent?.title && (
            <div className="rounded-2xl bg-white/10 p-4 border border-white/15 backdrop-blur-md">
              <div className="font-extrabold text-base text-[#FFB000]">{currentContent.title}</div>
              {currentContent.subtitle && <p className="text-xs text-blue-100/80 font-medium">{currentContent.subtitle}</p>}
            </div>
          )}
        </div>

        {/* Right Column: QRIS & Payment Info */}
        <div className="flex flex-col items-center justify-center text-center space-y-5 rounded-3xl bg-white/10 p-8 border border-white/20 backdrop-blur-xl shadow-2xl">
          <div className="text-xs font-extrabold uppercase tracking-widest text-blue-200 flex items-center gap-1.5">
            <QrCode className="h-4 w-4 text-[#FFB000]" /> QRIS Pembayaran Resmi
          </div>

          {tenant?.qris_image_url ? (
            <div className="p-4 rounded-3xl bg-white border-4 border-[#FF7A00] shadow-2xl">
              <img src={tenant.qris_image_url} alt="QRIS" className="h-56 w-56 object-contain" />
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-white/10 border-2 border-dashed border-white/30 text-blue-200">
              <QrCode className="h-28 w-28 mx-auto opacity-50 text-[#FFB000]" />
              <div className="text-xs font-bold mt-2">Menerima Pembayaran Tunai &amp; Transfer</div>
            </div>
          )}

          <div className="space-y-1">
            <div className="text-xl font-black text-[#FFB000]">SCAN / BAYAR DI KASIR</div>
            <p className="text-xs text-blue-200/80 font-medium">Menerima QRIS BCA, Mandiri, GoPay, OVO, ShopeePay, DANA</p>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="flex items-center justify-between text-xs text-blue-200/60 border-t border-white/10 pt-4 z-10">
        <div>Customer Display &bull; {session.businessName}</div>
        <div className="font-bold">Powered by GEN CB Kasir</div>
      </footer>
    </div>
  );
}
