import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getDisplayContext, unlockDisplay } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/gen-cb-logo.png.asset.json";

export const Route = createFileRoute("/display-pesanan")({
  head: () => ({ meta: [{ title: "Display Pesanan — Gen CB Kasir" }] }),
  component: DisplayPesananPage,
});

type QueueItem = {
  id: string;
  queue_number: number;
  status: "baru" | "diproses" | "selesai" | "diambil" | "dibatalkan";
  customer_name: string | null;
  announced_at: string | null;
  updated_at: string;
};

function DisplayPesananPage() {
  const fetchContext = useServerFn(getDisplayContext);
  const doUnlock = useServerFn(unlockDisplay);

  const [contextData, setContextData] = useState<Awaited<ReturnType<typeof fetchContext>> | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nowStr, setNowStr] = useState("");

  const announcedIdsRef = useRef<Set<string>>(new Set());

  // Load display context & store settings
  useEffect(() => {
    fetchContext({}).then((ctx) => {
      setContextData(ctx);
      if (ctx.unlocked && ctx.settings) {
        setSoundEnabled(ctx.settings.sound_enabled ?? true);
      }
    });
  }, [fetchContext]);

  // Real-time clock update
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setNowStr(
        d.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    };
    updateTime();
    const t = setInterval(updateTime, 1000);
    return () => clearInterval(t);
  }, []);

  const tenantId = contextData?.tenantId || "00000000-0000-0000-0000-000000000001";

  // Fetch initial queues & setup Supabase Realtime
  useEffect(() => {
    if (!contextData?.unlocked) return;

    const todayStr = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

    const loadQueues = async () => {
      const { data } = await supabase
        .from("queues")
        .select("id, queue_number, status, customer_name, announced_at, updated_at")
        .eq("tenant_id", tenantId)
        .eq("queue_date", todayStr)
        .in("status", ["diproses", "selesai"])
        .order("updated_at", { ascending: false });

      const items = (data ?? []) as QueueItem[];
      setQueues(items);

      // Trigger TTS ONLY if status = 'selesai' AND announced_at IS NULL AND not announced yet in state
      for (const item of items) {
        if (item.status === "selesai" && !item.announced_at && !announcedIdsRef.current.has(item.id)) {
          announcedIdsRef.current.add(item.id);
          playChime();
          announceSpeech(item.queue_number);
          // Mark announced_at in DB atomically so refresh NEVER repeats call
          supabase.from("queues").update({ announced_at: new Date().toISOString() }).eq("id", item.id).then();
        }
      }
    };

    loadQueues();

    // Supabase Realtime postgres_changes subscription
    const channel = supabase
      .channel(`tenant:${tenantId}:queues-display`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queues",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          loadQueues();
        },
      )
      .on("broadcast", { event: "recall_queue" }, ({ payload }) => {
        if (payload?.queue_number) {
          playChime();
          announceSpeech(payload.queue_number);
          toast.info(`Panggil Ulang Nomor Antrean #${String(payload.queue_number).padStart(3, "0")}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contextData?.unlocked, tenantId]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await doUnlock({ data: { pin } });
      if (!res.ok) {
        toast.error(res.error || "PIN Display Salah");
        return;
      }
      toast.success("Display Berhasil Dibuka");
      const ctx = await fetchContext({});
      setContextData(ctx);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuka display");
    } finally {
      setBusy(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  };

  if (!contextData) {
    return (
      <div className="grid h-screen place-items-center bg-[#F7F9FC] font-sans">
        <div className="text-center font-bold text-[color:var(--brand-deep)]">Memuat Display Pesanan...</div>
      </div>
    );
  }

  // PIN Unlock Screen if locked
  if (!contextData.unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-[color:var(--bg-soft,#F7F9FC)] font-sans">
        <form onSubmit={handleUnlock} className="glass-card max-w-md w-full rounded-3xl p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white p-2 shadow-md">
            <img src={logoAsset.url} alt="Logo GEN-CB" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold text-[color:var(--brand-deep)]">Display Pesanan</h1>
          <p className="mt-1 text-xs text-muted-foreground">Masukkan PIN Display untuk membuka tampilan antrean.</p>

          <input
            type="password"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Masukkan PIN..."
            className="mt-6 w-full rounded-2xl border-2 border-border p-4 text-center text-2xl font-bold tracking-widest outline-none focus:border-[color:var(--brand)]"
            autoFocus
          />

          <button
            type="submit"
            disabled={busy || pin.length < 4}
            className="btn-brand mt-6 w-full rounded-2xl py-4 text-sm font-extrabold shadow-md disabled:opacity-50"
          >
            {busy ? "Memeriksa..." : "Buka Display"}
          </button>
        </form>
      </div>
    );
  }

  const processingQueues = queues.filter((q) => q.status === "diproses");
  const completedQueues = queues.filter((q) => q.status === "selesai");
  const settings = contextData.settings;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F7F9FC] font-sans selection:bg-none">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-border/60 bg-[#002B7F] px-8 py-5 text-white shadow-md">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white p-1.5 shadow-lg">
            <img src={logoAsset.url} alt="Logo GEN-CB" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-white/80 font-bold">
              {settings?.store_name || "GEN-CB KASIR"}
            </div>
            <div className="text-2xl font-black tracking-tight">{settings?.display_header || "STATUS PESANAN"}</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {settings?.show_clock !== false && (
            <div className="rounded-2xl bg-white/10 px-5 py-2 text-2xl font-black tracking-wider text-white backdrop-blur border border-white/20">
              {nowStr}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
              title="Suara Notifikasi"
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 opacity-50" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
              title="Layar Penuh"
            >
              {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Column Board */}
      <main className="grid flex-1 grid-cols-2 gap-6 p-6 min-h-0">
        {/* Left Column: SEDANG DIPROSES (#FFB000) */}
        <section className="flex flex-col rounded-3xl bg-white shadow-xl border-4 border-[#FFB000] overflow-hidden">
          <div className="flex items-center justify-between bg-[#FFB000] px-8 py-5 text-[color:var(--brand-deep,#002B7F)] shadow-sm">
            <div className="flex items-center gap-3">
              <Bell className="h-7 w-7 animate-bounce" />
              <h2 className="text-3xl font-black tracking-wide">SEDANG DIPROSES</h2>
            </div>
            <span className="rounded-full bg-white/30 px-4 py-1 text-lg font-black backdrop-blur">
              {processingQueues.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {processingQueues.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-[#FF7A00] opacity-50 font-bold text-xl">
                Tidak ada pesanan sedang dibuat
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {processingQueues.map((q) => (
                  <div
                    key={q.id}
                    className="flex flex-col items-center justify-center rounded-3xl bg-[#FFB000]/15 p-6 border-2 border-[#FFB000]/40 text-center shadow-xs transition"
                  >
                    <div className="text-6xl sm:text-7xl font-black text-[#002B7F] tracking-tight">
                      {String(q.queue_number).padStart(3, "0")}
                    </div>
                    {settings?.show_customer_name !== false && q.customer_name && (
                      <div className="mt-2 truncate max-w-full text-base font-extrabold text-[#FF7A00]">
                        {q.customer_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: PESANAN SELESAI (#22C55E) */}
        <section className="flex flex-col rounded-3xl bg-white shadow-xl border-4 border-[#22C55E] overflow-hidden">
          <div className="flex items-center justify-between bg-[#22C55E] px-8 py-5 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 rounded-full bg-white animate-ping" />
              <h2 className="text-3xl font-black tracking-wide">PESANAN SELESAI</h2>
            </div>
            <span className="rounded-full bg-white/30 px-4 py-1 text-lg font-black backdrop-blur">
              {completedQueues.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {completedQueues.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-emerald-600 opacity-50 font-bold text-xl">
                Belum ada pesanan selesai
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {completedQueues.map((q, idx) => {
                  const isTopNew = idx === 0;
                  return (
                    <div
                      key={q.id}
                      className={`flex flex-col items-center justify-center rounded-3xl bg-[#22C55E] p-6 text-center text-white shadow-lg transition-all ${
                        isTopNew ? "animate-pulse ring-4 ring-emerald-300 scale-102" : ""
                      }`}
                    >
                      <div className="text-6xl sm:text-7xl font-black tracking-tight drop-shadow-md">
                        {String(q.queue_number).padStart(3, "0")}
                      </div>
                      {settings?.show_customer_name !== false && q.customer_name && (
                        <div className="mt-2 truncate max-w-full text-base font-extrabold text-emerald-100">
                          {q.customer_name}
                        </div>
                      )}
                      <div className="mt-1 text-xs font-bold text-emerald-200 uppercase tracking-widest">
                        Siap Diambil
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer Banner */}
      <footer className="bg-[#002B7F] py-3.5 text-center text-white text-sm font-bold tracking-wide">
        {settings?.display_footer || "Mohon menunggu hingga nomor antrean Anda berwarna hijau."}
      </footer>
    </div>
  );
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

function announceSpeech(queueNo: number) {
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const formatted = String(queueNo).padStart(3, "0");
      const text = `Nomor antrean ${formatted}, pesanan Anda telah selesai dan siap diambil.`;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "id-ID";
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    } catch {}
  }
}
