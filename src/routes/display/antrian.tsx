import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getCurrentTenantSession } from "@/lib/auth.functions";
import { getQueueDisplayData } from "@/lib/pos.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/display/antrian")({
  head: () => ({ meta: [{ title: "Display Antrean — GEN-CB Kasir" }] }),
  beforeLoad: async () => {
    const session = await getCurrentTenantSession();
    if (!session) throw redirect({ to: "/login" });
    return { session };
  },
  component: QueueDisplayPage,
});

/** Helper function to convert numbers into natural Indonesian words */
function numberToIndonesianWords(n: number): string {
  if (n <= 0) return "nol";
  const units = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  if (n < 12) return units[n];
  if (n < 20) return units[n - 10] + " belas";
  if (n < 100) return units[Math.floor(n / 10)] + " puluh " + (n % 10 !== 0 ? units[n % 10] : "");
  if (n < 200) return "seratus " + (n % 100 !== 0 ? numberToIndonesianWords(n % 100) : "");
  if (n < 1000) return units[Math.floor(n / 100)] + " ratus " + (n % 100 !== 0 ? numberToIndonesianWords(n % 100) : "");
  return String(n);
}

function QueueDisplayPage() {
  const { session } = Route.useLoaderData();
  const fetchQueueData = useServerFn(getQueueDisplayData);

  const { data, refetch } = useQuery({
    queryKey: ["tenant-queue-display", session.tenantId],
    queryFn: () => fetchQueueData({}),
    refetchInterval: 5000,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeStr, setTimeStr] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(1.0);
  const [highlightedNum, setHighlightedNum] = useState<number | null>(null);

  // Audio Announcement Queue
  const speechQueueRef = useRef<number[]>([]);
  const isSpeakingRef = useRef(false);
  const knownCompletedIds = useRef<Set<string>>(new Set());

  // Clock Timer
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(
        d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB",
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Process Indonesian Speech Queue
  const processSpeechQueue = () => {
    if (!soundEnabled || isSpeakingRef.current || speechQueueRef.current.length === 0) {
      return;
    }

    const num = speechQueueRef.current.shift()!;
    isSpeakingRef.current = true;
    setHighlightedNum(num);

    const words = numberToIndonesianWords(num);
    const text = `Nomor antrean ${words}, pesanan Anda telah selesai. Silakan mengambil pesanan di kasir.`;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.volume = volume;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        isSpeakingRef.current = false;
        setTimeout(() => {
          setHighlightedNum(null);
          processSpeechQueue();
        }, 1000);
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
        setHighlightedNum(null);
        processSpeechQueue();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      isSpeakingRef.current = false;
    }
  };

  const enqueueAnnouncement = (num: number) => {
    if (!speechQueueRef.current.includes(num)) {
      speechQueueRef.current.push(num);
      processSpeechQueue();
    }
  };

  // Supabase Realtime Subscription for Queues
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-queues-${session.tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queues",
          filter: `tenant_id=eq.${session.tenantId}`,
        },
        (payload) => {
          refetch();
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const newRow = payload.new as any;
            if (newRow && newRow.status === "selesai" && !knownCompletedIds.current.has(newRow.id)) {
              knownCompletedIds.current.add(newRow.id);
              enqueueAnnouncement(newRow.queue_number);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.tenantId, soundEnabled, volume]);

  const processing = data?.processing ?? [];
  const completed = data?.completed ?? [];

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-white flex flex-col justify-between p-6 sm:p-8 font-sans selection:bg-none relative overflow-hidden">
      {/* Top Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-[#FF7A00] to-[#FFB000] text-white font-black text-2xl shadow-lg">
            {session.tenantCode.substring(0, 2)}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#FFB000] tracking-tight">{session.businessName}</h1>
            <p className="text-xs text-blue-200/80 font-bold uppercase tracking-widest">STATUS NOMOR ANTREAN PESANAN</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Clock */}
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-extrabold backdrop-blur-md border border-white/15">
            <Clock className="h-4 w-4 text-[#FFB000]" />
            <span>{timeStr}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`rounded-2xl p-2.5 backdrop-blur-md border transition active:scale-95 ${
              soundEnabled ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-red-500/20 border-red-500/40 text-red-400"
            }`}
            title={soundEnabled ? "Matikan Suara Panggilan" : "Aktifkan Suara Panggilan"}
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs font-black backdrop-blur-md border border-white/20 hover:bg-white/20 transition active:scale-95 text-white"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFullscreen ? "KELUAR FULLSCREEN" : "FULLSCREEN"}
          </button>
        </div>
      </header>

      {/* Main 2-Column Queue Board */}
      <main className="my-auto grid grid-cols-1 lg:grid-cols-2 gap-8 py-6">
        {/* Column 1: SEDANG DIPROSES (#FFB000) */}
        <div className="rounded-3xl bg-white/5 p-6 border-2 border-[#FFB000]/40 backdrop-blur-xl shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#FFB000]/30 pb-3">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 rounded-full bg-[#FFB000] animate-ping" />
              <h2 className="text-xl sm:text-2xl font-black text-[#FFB000] tracking-wider uppercase">SEDANG DIPROSES</h2>
            </div>
            <span className="rounded-xl bg-[#FFB000]/20 px-3 py-1 text-xs font-black text-[#FFB000]">
              {processing.length} Pesanan
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
            {processing.length === 0 ? (
              <div className="col-span-full py-12 text-center text-sm font-bold text-blue-200/50">
                Tidak ada pesanan sedang diproses
              </div>
            ) : (
              processing.map((q) => (
                <div
                  key={q.id}
                  className="rounded-2xl bg-[#FFB000]/10 border-2 border-[#FFB000]/30 p-4 text-center shadow-lg transition transform hover:scale-105"
                >
                  <div className="text-xs font-bold text-[#FFB000]/80 uppercase tracking-widest">Nomor</div>
                  <div className="text-4xl sm:text-5xl font-black text-[#FFB000] font-mono tracking-tight">
                    {String(q.queue_number).padStart(3, "0")}
                  </div>
                  {q.customer_name && (
                    <div className="mt-1 truncate text-xs font-bold text-white/90">{q.customer_name}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: SELESAI (#22C55E) */}
        <div className="rounded-3xl bg-white/5 p-6 border-2 border-[#22C55E]/40 backdrop-blur-xl shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#22C55E]/30 pb-3">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 rounded-full bg-[#22C55E] animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black text-[#22C55E] tracking-wider uppercase">SIAP / SELESAI</h2>
            </div>
            <span className="rounded-xl bg-[#22C55E]/20 px-3 py-1 text-xs font-black text-[#22C55E]">
              {completed.length} Pesanan
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
            {completed.length === 0 ? (
              <div className="col-span-full py-12 text-center text-sm font-bold text-blue-200/50">
                Belum ada pesanan selesai
              </div>
            ) : (
              completed.map((q) => {
                const isHighlight = highlightedNum === q.queue_number;
                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border-2 p-4 text-center shadow-lg transition-all duration-500 transform ${
                      isHighlight
                        ? "bg-[#22C55E] border-white text-white scale-110 shadow-2xl ring-4 ring-[#22C55E]/50 animate-bounce"
                        : "bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]"
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-widest opacity-80">Nomor</div>
                    <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight">
                      {String(q.queue_number).padStart(3, "0")}
                    </div>
                    {q.customer_name && (
                      <div className="mt-1 truncate text-xs font-extrabold">{q.customer_name}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Footer Instructions */}
      <footer className="flex items-center justify-between text-xs text-blue-200/60 border-t border-white/10 pt-4">
        <div>Mohon perhatikan nomor antrean Anda saat berubah menjadi HIJAU.</div>
        <div className="font-bold">GEN CB Kasir &bull; Panggilan Suara Otomatis</div>
      </footer>
    </div>
  );
}
