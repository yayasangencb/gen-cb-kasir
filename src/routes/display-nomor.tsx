import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Maximize2, Minimize2, Tv, Volume2, CheckCircle2, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getCurrentStaff } from "@/lib/auth.functions";
import { listActiveOrders } from "@/lib/pos.functions";

export const Route = createFileRoute("/display-nomor")({
  component: TvQueueDisplayPage,
  head: () => ({ meta: [{ title: "Display TV Antrean — Light Theme" }] }),
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
    <div className="min-h-screen bg-[#F8F9FB] text-[#1A1D29] flex flex-col justify-between p-6 select-none font-sans">
      {/* Header Bar Light Theme */}
      <header className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-3xl p-5 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-[#FFF4E6] text-[#F97316] border border-[#F97316]/20 font-black grid place-items-center text-xl shadow-xs">
            <Tv className="h-7 w-7" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-black tracking-widest text-[#F97316]">DISPLAY NOMOR ANTREAN</div>
            <h1 className="text-2xl font-black text-[#1A1D29]">{staff?.outletName ?? "Kopi Kenangan"}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#FFF4E6] border border-[#F97316]/20 px-4 py-2.5 rounded-2xl text-xs font-bold text-[#F97316]">
            <Volume2 className="h-4 w-4 shrink-0" /> Suara Panggilan Otomatis
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-[#1A1D29] border border-[#E5E7EB] px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-xs active:scale-95"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFullscreen ? "Keluar Fullscreen" : "Layar Penuh"}
          </button>
        </div>
      </header>

      {/* Main Display Columns */}
      <main className="my-6 grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
        {/* SEDANG DIPROSES (Card Putih dengan Accent Bar Oranye) */}
        <div className="bg-white border border-[#E5E7EB] border-t-4 border-t-[#F97316] rounded-3xl p-6 flex flex-col shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4 mb-5">
            <div className="flex items-center gap-3 text-[#F97316] font-black text-xl">
              <Clock className="h-6 w-6 animate-spin" /> SEDANG DIPROSES
            </div>
            <span className="bg-[#FFF4E6] text-[#F97316] font-black text-base px-4 py-1 rounded-2xl border border-[#F97316]/20">
              {diproses.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1 overflow-auto pr-1">
            {diproses.length === 0 ? (
              <div className="col-span-full grid place-items-center text-slate-400 font-medium text-base py-16">
                Tidak ada antrean diproses...
              </div>
            ) : (
              diproses.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#FAFAFB] border border-[#E5E7EB] rounded-3xl p-5 text-center shadow-xs hover:border-[#F97316]/50 transition"
                >
                  <div className="text-[10px] uppercase font-bold text-[#F97316] tracking-wider">ANTREAN</div>
                  <div className="text-4xl font-black text-[#1A1D29] mt-1">#{String(item.queue_number).padStart(3, "0")}</div>
                  {item.customer_name && (
                    <div className="text-xs font-bold text-slate-600 mt-2 truncate">{item.customer_name}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* SIAP DIAMBIL (Card Putih dengan Accent Bar Hijau Universal UX) */}
        <div className="bg-white border border-[#E5E7EB] border-t-4 border-t-emerald-500 rounded-3xl p-6 flex flex-col shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4 mb-5">
            <div className="flex items-center gap-3 text-emerald-600 font-black text-xl">
              <CheckCircle2 className="h-6 w-6" /> SIAP DIAMBIL
            </div>
            <span className="bg-emerald-50 text-emerald-700 font-black text-base px-4 py-1 rounded-2xl border border-emerald-200">
              {selesai.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1 overflow-auto pr-1">
            {selesai.length === 0 ? (
              <div className="col-span-full grid place-items-center text-slate-400 font-medium text-base py-16">
                Belum ada antrean selesai...
              </div>
            ) : (
              selesai.map((item) => (
                <div
                  key={item.id}
                  className="bg-emerald-50/60 border-2 border-emerald-500 rounded-3xl p-5 text-center shadow-sm animate-pulse"
                >
                  <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">AMBIL PESANAN</div>
                  <div className="text-5xl font-black text-emerald-600 mt-1">#{String(item.queue_number).padStart(3, "0")}</div>
                  {item.customer_name && (
                    <div className="text-sm font-black text-[#1A1D29] mt-2 truncate">{item.customer_name}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Footer Banner Light Theme (Biru Muda Soft) */}
      <footer className="bg-[#EFF6FF] border border-[#2952E3]/20 rounded-2xl py-3 px-6 text-center text-xs font-black text-[#1E40AF] tracking-wide shadow-xs">
        ★ SILAKAN MENUJU KE MEJA KASIR APABILA NOMOR ANTREAN ANDA DITAMPILKAN DI KOLOM SIAP DIAMBIL ★
      </footer>
    </div>
  );
}
