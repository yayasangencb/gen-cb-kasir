import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Monitor, Save, Store, Image as ImageIcon, Sparkles, Upload, Info, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth.functions";
import { getStoreSettings, resetQueueNumbers, updateStoreSettings } from "@/lib/pos.functions";

export const Route = createFileRoute("/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan & Promo Display — Kasir Outlet" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    if (staff.role !== "admin") throw redirect({ to: "/kasir" });
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: PengaturanPage,
});

function PengaturanPage() {
  const staff = Route.useLoaderData();
  const fetchSettings = useServerFn(getStoreSettings);
  const saveSettings = useServerFn(updateStoreSettings);
  const resetQueue = useServerFn(resetQueueNumbers);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-store-settings"],
    queryFn: () => fetchSettings({}),
  });

  const [form, setForm] = useState({
    store_name: staff.outletName || "Kopi Kenangan",
    logo_url: "",
    promo_image_1: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1600&auto=format&fit=crop",
    promo_title_1: "PROMO KOPI SPESIAL HARI INI",
    promo_image_2: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1600&auto=format&fit=crop",
    promo_title_2: "HAPPY HOUR DISKON 25%",
    promo_image_3: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?q=80&w=1600&auto=format&fit=crop",
    promo_title_3: "FRESHLY BAKED PASTRIES",
    address: "",
    phone: "",
    receipt_footer: "Terima kasih telah berbelanja.",
    receipt_paper: "80mm" as "58mm" | "80mm",
    display_header: "STATUS PESANAN",
    display_footer: "Mohon menunggu hingga nomor antrean Anda dipanggil.",
    display_pin: "9999",
    queue_reset_mode: "harian" as "harian" | "manual",
    sound_enabled: true,
    sound_volume: 1,
    completed_display_duration: 300,
    max_display_items: 10,
    show_customer_name: true,
    show_clock: true,
  });

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        store_name: data.store_name || staff.outletName || "Kopi Kenangan",
        logo_url: data.logo_url || "",
        promo_image_1: data.promo_image_1 || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1600&auto=format&fit=crop",
        promo_title_1: data.promo_title_1 || "PROMO KOPI SPESIAL HARI INI",
        promo_image_2: data.promo_image_2 || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1600&auto=format&fit=crop",
        promo_title_2: data.promo_title_2 || "HAPPY HOUR DISKON 25%",
        promo_image_3: data.promo_image_3 || "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?q=80&w=1600&auto=format&fit=crop",
        promo_title_3: data.promo_title_3 || "FRESHLY BAKED PASTRIES",
        address: data.address || "",
        phone: data.phone || "",
        receipt_footer: data.receipt_footer || "Terima kasih telah berbelanja.",
        receipt_paper: (data.receipt_paper as "58mm" | "80mm") || "80mm",
        display_header: data.display_header || "STATUS PESANAN",
        display_footer: data.display_footer || "Mohon menunggu hingga nomor antrean Anda dipanggil.",
        display_pin: data.display_pin || "9999",
        queue_reset_mode: (data.queue_reset_mode as "harian" | "manual") || "harian",
        sound_enabled: data.sound_enabled ?? true,
        sound_volume: Number(data.sound_volume ?? 1),
        completed_display_duration: Number(data.completed_display_duration ?? 300),
        max_display_items: Number(data.max_display_items ?? 10),
        show_customer_name: data.show_customer_name ?? true,
        show_clock: data.show_clock ?? true,
      });
    }
  }, [data, staff.outletName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveSettings({ data: form });
      toast.success("Pengaturan logo & banner promo berhasil disimpan!");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pengaturan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Pengaturan Toko & Promo Display</h1>
            <p className="text-xs text-slate-500">
              Atur logo outlet Anda, gambar banner promosi layar depan, dan profil struk kasir.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={busy || isLoading}
            className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-3 text-sm font-black shadow-lg transition disabled:opacity-50"
          >
            <Save className="h-5 w-5" /> {busy ? "Memproses..." : "Simpan Semua Pengaturan"}
          </button>
        </div>

        {isLoading ? (
          <div className="h-96 animate-pulse rounded-3xl bg-white" />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* BRANDING OUTLET: LOGO & PROMO MANAGER */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Branding Outlet & Promo Display Depan</h2>
                  <p className="text-xs text-slate-500">
                    Pengaturan logo toko dan gambar-gambar spanduk promosi yang diputar pada layar display pelanggan (70% area).
                  </p>
                </div>
              </div>

              {/* Logo Outlet Upload / URL */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <Store className="h-4 w-4 text-amber-600" /> LOGO RESMI OUTLET
                  </label>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Rekomendasi Ukuran: 512 x 512 px (Format PNG Transparan / JPG, Rasio 1:1)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-4 items-center">
                  <div className="h-24 w-24 rounded-2xl bg-white border border-slate-300 grid place-items-center overflow-hidden shadow-inner relative group">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="Logo Outlet" className="h-full w-full object-contain p-2" />
                    ) : (
                      <div className="text-center p-2">
                        <Store className="mx-auto h-8 w-8 text-slate-400 mb-1" />
                        <div className="text-[9px] font-extrabold text-slate-400 uppercase">Logo Outlet</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      URL Gambar Logo Outlet:
                    </label>
                    <input
                      type="url"
                      value={form.logo_url}
                      onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                      placeholder="https://domain-anda.com/logo-outlet.png"
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-mono outline-none focus:border-amber-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      *Jika dikosongkan, sistem akan menampilkan badge nama toko {form.store_name}. Tanpa logo Gen-CB.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Promo Banners Settings */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" /> SPANDUK / BANNER PROMOSI (70% DISPLAY LAYAR)
                  </h3>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Rekomendasi Ukuran Gambar Promo: 1920 x 1080 px (Aspect Ratio 16:9 - Landscape Full HD)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Promo Banner 1 */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-xs font-black text-slate-900">PROMO 1 (Banner Utama)</div>
                    <div className="h-28 rounded-xl bg-slate-900 overflow-hidden relative border border-slate-300">
                      <img src={form.promo_image_1} alt="Promo 1" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                        <span className="text-[10px] font-bold text-white truncate">{form.promo_title_1}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Judul Promo 1</label>
                      <input
                        type="text"
                        value={form.promo_title_1}
                        onChange={(e) => setForm({ ...form, promo_title_1: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">URL Gambar (16:9)</label>
                      <input
                        type="url"
                        value={form.promo_image_1}
                        onChange={(e) => setForm({ ...form, promo_image_1: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-[11px] font-mono"
                      />
                    </div>
                  </div>

                  {/* Promo Banner 2 */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-xs font-black text-slate-900">PROMO 2 (Happy Hour)</div>
                    <div className="h-28 rounded-xl bg-slate-900 overflow-hidden relative border border-slate-300">
                      <img src={form.promo_image_2} alt="Promo 2" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                        <span className="text-[10px] font-bold text-white truncate">{form.promo_title_2}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Judul Promo 2</label>
                      <input
                        type="text"
                        value={form.promo_title_2}
                        onChange={(e) => setForm({ ...form, promo_title_2: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">URL Gambar (16:9)</label>
                      <input
                        type="url"
                        value={form.promo_image_2}
                        onChange={(e) => setForm({ ...form, promo_image_2: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-[11px] font-mono"
                      />
                    </div>
                  </div>

                  {/* Promo Banner 3 */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-xs font-black text-slate-900">PROMO 3 (Produk Baru / Pastry)</div>
                    <div className="h-28 rounded-xl bg-slate-900 overflow-hidden relative border border-slate-300">
                      <img src={form.promo_image_3} alt="Promo 3" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-2">
                        <span className="text-[10px] font-bold text-white truncate">{form.promo_title_3}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Judul Promo 3</label>
                      <input
                        type="text"
                        value={form.promo_title_3}
                        onChange={(e) => setForm({ ...form, promo_title_3: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">URL Gambar (16:9)</label>
                      <input
                        type="url"
                        value={form.promo_image_3}
                        onChange={(e) => setForm({ ...form, promo_image_3: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-[11px] font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profil Usaha & Struk */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700 font-bold">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Profil Usaha & Format Struk</h2>
                  <p className="text-xs text-slate-500">Informasi toko yang akan tercetak pada struk thermal kasir.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-600">
                  Nama Toko / Outlet *
                  <input
                    required
                    value={form.store_name}
                    onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-bold mt-1"
                  />
                </label>

                <label className="block text-xs font-bold text-slate-600">
                  Nomor Telepon / WhatsApp Toko
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="0812-0000-0000"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 mt-1"
                  />
                </label>
              </div>

              <label className="block text-xs font-bold text-slate-600">
                Alamat Lengkap Toko
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Jl. Sudirman No. 12..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 mt-1"
                />
              </label>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
