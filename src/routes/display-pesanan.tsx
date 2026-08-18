import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Maximize2, Minimize2, ShoppingBag, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { getCurrentStaff } from "@/lib/auth.functions";
import { listActiveOrders } from "@/lib/pos.functions";
import logoAsset from "@/assets/gen-cb-logo.png.asset.json";

export const Route = createFileRoute("/display-pesanan")({
  component: CustomerDisplayPage,
  head: () => ({ meta: [{ title: "Display Pesanan Pelanggan — Gen CB Kasir" }] }),
});

function CustomerDisplayPage() {
  const fetchActive = useServerFn(listActiveOrders);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: staff } = useQuery({
    queryKey: ["current_staff_display"],
    queryFn: () => getCurrentStaff(),
  });

  const { data: orders } = useQuery({
    queryKey: ["active_orders_customer_display"],
    queryFn: () => fetchActive(),
    refetchInterval: 3000,
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const activeList = orders ?? [];
  const baru = activeList.filter((o) => o.status === "baru");
  const diproses = activeList.filter((o) => o.status === "diproses");
  const selesai = activeList.filter((o) => o.status === "selesai");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 select-none">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white p-2 shadow-lg grid place-items-center">
            <img src={logoAsset.url} alt="Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-xs uppercase font-extrabold tracking-widest text-amber-400">STATUS PESANAN PELANGGAN</div>
            <h1 className="text-2xl font-black text-white">{staff?.outletName ?? "Kopi & Resto"}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition border border-slate-700 shadow"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFullscreen ? "Keluar Fullscreen" : "Layar Penuh"}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="my-6 grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {/* Kolom 1: Pesanan Baru */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sky-400 font-extrabold text-base">
              <ShoppingBag className="h-5 w-5" /> BARU MASUK
            </div>
            <span className="bg-sky-500/20 text-sky-300 font-bold px-3 py-0.5 rounded-full text-xs border border-sky-500/30">
              {baru.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-auto pr-1">
            {baru.length === 0 ? (
              <div className="text-center text-slate-500 py-12 text-sm">Tidak ada pesanan baru</div>
            ) : (
              baru.map((item) => (
                <div key={item.id} className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Antrean</span>
                    <span className="text-2xl font-black text-sky-400">#{String(item.queue_number).padStart(3, "0")}</span>
                  </div>
                  {item.customer_name && <div className="text-sm font-bold text-white mt-1">{item.customer_name}</div>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kolom 2: Diproses / Dapur */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-base">
              <Clock className="h-5 w-5 animate-spin" /> SEDANG DIPROSES
            </div>
            <span className="bg-amber-500/20 text-amber-300 font-bold px-3 py-0.5 rounded-full text-xs border border-amber-500/30">
              {diproses.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-auto pr-1">
            {diproses.length === 0 ? (
              <div className="text-center text-slate-500 py-12 text-sm">Tidak ada pesanan diproses</div>
            ) : (
              diproses.map((item) => (
                <div key={item.id} className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-300/80">Antrean</span>
                    <span className="text-3xl font-black text-amber-400">#{String(item.queue_number).padStart(3, "0")}</span>
                  </div>
                  {item.customer_name && <div className="text-sm font-bold text-white mt-1">{item.customer_name}</div>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kolom 3: Siap Diambil / Selesai */}
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-base">
              <CheckCircle2 className="h-5 w-5" /> SIAP DIAMBIL
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-3 py-0.5 rounded-full text-xs border border-emerald-500/30">
              {selesai.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-auto pr-1">
            {selesai.length === 0 ? (
              <div className="text-center text-slate-500 py-12 text-sm">Belum ada pesanan selesai</div>
            ) : (
              selesai.map((item) => (
                <div key={item.id} className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-4 shadow animate-pulse">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-300">Silakan Ambil</span>
                    <span className="text-4xl font-black text-emerald-400">#{String(item.queue_number).padStart(3, "0")}</span>
                  </div>
                  {item.customer_name && <div className="text-base font-black text-white mt-1">{item.customer_name}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-3 border-t border-slate-800 text-xs text-slate-400">
        Mohon menunggu hingga nomor antrean Anda dipanggil di kasir. Terima kasih telah berbelanja!
      </footer>
    </div>
  );
}
