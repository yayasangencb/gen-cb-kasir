import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Maximize2, Minimize2, Tv, Volume2, CheckCircle2, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getCurrentStaff } from "@/lib/auth.functions";
import { listActiveOrders } from "@/lib/pos.functions";

export const Route = createFileRoute("/display-nomor")({
  component: TvQueueDisplayPage,
  head: () => ({ meta: [{ title: "Display TV Antrean — Gen CB Kasir" }] }),
});

function TvQueueDisplayPage() {
  const fetchActive = useServerFn(listActiveOrders);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prevSelesaiRef = useRef<number[]>([]);

  const { data: staff } = useQuery({
    queryKey: ["current_staff_tv"],
    queryFn: () => getCurrentStaff(),
  });

  const { data: orders } = useQuery({
    queryKey: ["active_orders_tv_display"],
    queryFn: () => fetchActive(),
    refetchInterval: 2500,
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const activeList = orders ?? [];
  const diproses = activeList.filter((o) => o.status === "diproses");
  const selesai = activeList.filter((o) => o.status === "selesai");

  // Voice chime when new queue is completed
  useEffect(() => {
    const currentCompletedNums = selesai.map((s) => s.queue_number);
    const newCompleted = currentCompletedNums.filter((num) => !prevSelesaiRef.current.includes(num));

    if (newCompleted.length > 0 && typeof window !== "undefined" && "speechSynthesis" in window) {
      newCompleted.forEach((num) => {
        const text = `Nomor antrean ${num}, silakan mengambil pesanan Anda.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "id-ID";
        window.speechSynthesis.speak(utterance);
      });
    }

    prevSelesaiRef.current = currentCompletedNums;
  }, [selesai]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-8 select-none font-sans">
      {/* Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-3xl bg-amber-500 text-slate-950 font-black grid place-items-center text-2xl shadow-xl">
            <Tv className="h-8 w-8" />
          </div>
          <div>
            <div className="text-xs uppercase font-extrabold tracking-widest text-amber-400">NOMOR ANTREAN PELANGGAN</div>
            <h1 className="text-3xl font-black text-white">{staff?.outletName ?? "Kopi & Resto"}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl text-xs text-amber-300">
            <Volume2 className="h-4 w-4 shrink-0" /> Suara Panggilan Otomatis
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-3 rounded-2xl text-xs font-black transition shadow-lg"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFullscreen ? "Keluar Fullscreen" : "Layar Penuh (Fullscreen)"}
          </button>
        </div>
      </header>

      {/* Main Display Columns */}
      <main className="my-8 grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
        {/* SEDANG DIPROSES */}
        <div className="bg-slate-900/80 border border-amber-500/30 rounded-3xl p-8 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-4 mb-6">
            <div className="flex items-center gap-3 text-amber-400 font-black text-2xl">
              <Clock className="h-7 w-7 animate-spin" /> SEDANG DIPROSES
            </div>
            <span className="bg-amber-500/20 text-amber-300 font-black text-lg px-4 py-1 rounded-2xl border border-amber-500/30">
              {diproses.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1 overflow-auto pr-2">
            {diproses.length === 0 ? (
              <div className="col-span-full grid place-items-center text-slate-500 text-lg">
                Tidak ada antrean diproses
              </div>
            ) : (
              diproses.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-800 border border-amber-500/40 rounded-3xl p-6 text-center shadow-lg"
                >
                  <div className="text-xs uppercase font-bold text-amber-400 tracking-wider">ANTREAN</div>
                  <div className="text-5xl font-black text-white mt-1">#{String(item.queue_number).padStart(3, "0")}</div>
                  {item.customer_name && (
                    <div className="text-sm font-bold text-slate-300 mt-2 truncate">{item.customer_name}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* SIAP DIAMBIL */}
        <div className="bg-slate-900/80 border border-emerald-500/40 rounded-3xl p-8 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4 mb-6">
            <div className="flex items-center gap-3 text-emerald-400 font-black text-2xl">
              <CheckCircle2 className="h-7 w-7" /> SIAP DIAMBIL
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 font-black text-lg px-4 py-1 rounded-2xl border border-emerald-500/30">
              {selesai.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1 overflow-auto pr-2">
            {selesai.length === 0 ? (
              <div className="col-span-full grid place-items-center text-slate-500 text-lg">
                Belum ada antrean selesai
              </div>
            ) : (
              selesai.map((item) => (
                <div
                  key={item.id}
                  className="bg-emerald-950/60 border-2 border-emerald-400 rounded-3xl p-6 text-center shadow-xl animate-pulse"
                >
                  <div className="text-xs uppercase font-bold text-emerald-300 tracking-wider">AMBIL PESANAN</div>
                  <div className="text-6xl font-black text-emerald-400 mt-1">#{String(item.queue_number).padStart(3, "0")}</div>
                  {item.customer_name && (
                    <div className="text-base font-black text-white mt-2 truncate">{item.customer_name}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Ticker / Footer */}
      <footer className="bg-slate-900 border border-slate-800 rounded-2xl py-4 px-6 text-center text-sm font-bold text-amber-400 tracking-wide">
        ★ SILAKAN MENUJU KE MEJA KASIR APABILA NOMOR ANTREAN ANDA DITAMPILKAN DI KOLOM SIAP DIAMBIL ★
      </footer>
    </div>
  );
}
