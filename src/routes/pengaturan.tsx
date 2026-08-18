import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Save, Store, Sparkles, Info, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ImageDropzone } from "@/components/ImageDropzone";
import { getCurrentStaff } from "@/lib/auth.functions";
import { getStoreSettings, resetQueueNumbers, updateStoreSettings } from "@/lib/pos.functions";

export const Route = createFileRoute("/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan Toko & Promo Display — Kasir Outlet" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    if (staff.role !== "admin") throw redirect({ to: "/kasir" });
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: PengaturanPage,
});

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PengaturanPage() {
  const staff = Route.useLoaderData();
  const fetchSettings = useServerFn(getStoreSettings);
  const saveSettings = useServerFn(updateStoreSettings);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-store-settings"],
    queryFn: () => fetchSettings({}),
  });

  const [form, setForm] = useState({
    store_name: staff.outletName || "Outlet Kasir",
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
        store_name: data.store_name || staff.outletName || "Outlet Kasir",
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
      toast.success("Pengaturan toko & gambar promo berhasil disimpan!");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pengaturan");
    } finally {
      setBusy(false);
    }
  };

  // Image Selection Handlers (Convert File to Data URL)
  const handleLogoFile = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((f) => ({ ...f, logo_url: dataUrl }));
      toast.success("Logo toko berhasil dimuat!");
    } catch (e) {
      toast.error("Gagal membaca file gambar logo");
    }
  };

  const handlePromo1File = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((f) => ({ ...f, promo_image_1: dataUrl }));
      toast.success("Gambar Promo 1 berhasil dimuat!");
    } catch (e) {
      toast.error("Gagal membaca gambar Promo 1");
    }
  };

  const handlePromo2File = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((f) => ({ ...f, promo_image_2: dataUrl }));
      toast.success("Gambar Promo 2 berhasil dimuat!");
    } catch (e) {
      toast.error("Gagal membaca gambar Promo 2");
    }
  };

  const handlePromo3File = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((f) => ({ ...f, promo_image_3: dataUrl }));
      toast.success("Gambar Promo 3 berhasil dimuat!");
    } catch (e) {
      toast.error("Gagal membaca gambar Promo 3");
    }
  };

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#003B8F]">Pengaturan Toko & Drag-and-Drop Gambar</h1>
            <p className="text-xs text-slate-500">
              Unggah logo outlet Anda dan gambar spanduk promosi dengan cara Tarik & Lepas (Drag & Drop) atau pilih foto.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={busy || isLoading}
            className="inline-flex items-center gap-2 rounded-2xl text-white px-6 py-3 text-sm font-extrabold shadow-lg transition disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #FF7A00, #FFB000)" }}
          >
            <Save className="h-5 w-5" /> {busy ? "Memproses..." : "Simpan Semua Pengaturan"}
          </button>
        </div>

        {isLoading ? (
          <div className="h-96 animate-pulse rounded-3xl bg-white border border-slate-200" />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* BRANDING OUTLET: LOGO DROPZONE */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100 text-[#FF7A00] font-bold border border-amber-300">
                    <Store className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-[#003B8F]">1. Logo Resmi Outlet (Drag & Drop)</h2>
                    <p className="text-xs text-slate-500">
                      Tarik foto logo outlet dari komputer/perangkat Anda langsung ke dalam area di bawah ini.
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-[#FF7A00]" /> Rekomendasi: 512 x 512 px (PNG Transparan / JPG, Rasio 1:1)
                </span>
              </div>

              {/* Drag and Drop Component for Outlet Logo */}
              <ImageDropzone
                imageUrl={form.logo_url || null}
                onImageSelected={handleLogoFile}
                onUrlDropped={(url) => setForm((f) => ({ ...f, logo_url: url }))}
                onImageRemoved={() => setForm((f) => ({ ...f, logo_url: "" }))}
                label="Foto / Gambar Logo Toko Resmi"
              />
            </div>

            {/* 3 PROMO BANNER DROPZONES */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-100 text-[#003B8F] font-bold border border-blue-300">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-[#003B8F]">2. Spanduk Promo Layar Pelanggan (70% Area)</h2>
                    <p className="text-xs text-slate-500">
                      Tarik & Lepas (Drag and Drop) gambar promo 16:9 yang akan otomatis diputar di layar depan pelanggan.
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-blue-900 bg-blue-100 px-3 py-1 rounded-full border border-blue-300 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-blue-700" /> Rekomendasi: 1920 x 1080 px (16:9 Full HD Landscape)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Promo Banner 1 Dropzone */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="text-xs font-black text-[#003B8F] uppercase tracking-wider">PROMO 1 (Banner Utama)</div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Judul Promo 1</label>
                    <input
                      type="text"
                      value={form.promo_title_1}
                      onChange={(e) => setForm({ ...form, promo_title_1: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 font-bold bg-white"
                    />
                  </div>

                  <ImageDropzone
                    imageUrl={form.promo_image_1 || null}
                    onImageSelected={handlePromo1File}
                    onUrlDropped={(url) => setForm((f) => ({ ...f, promo_image_1: url }))}
                    onImageRemoved={() => setForm((f) => ({ ...f, promo_image_1: "" }))}
                    label="Foto Spanduk Promo 1"
                  />
                </div>

                {/* Promo Banner 2 Dropzone */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="text-xs font-black text-[#003B8F] uppercase tracking-wider">PROMO 2 (Happy Hour)</div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Judul Promo 2</label>
                    <input
                      type="text"
                      value={form.promo_title_2}
                      onChange={(e) => setForm({ ...form, promo_title_2: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 font-bold bg-white"
                    />
                  </div>

                  <ImageDropzone
                    imageUrl={form.promo_image_2 || null}
                    onImageSelected={handlePromo2File}
                    onUrlDropped={(url) => setForm((f) => ({ ...f, promo_image_2: url }))}
                    onImageRemoved={() => setForm((f) => ({ ...f, promo_image_2: "" }))}
                    label="Foto Spanduk Promo 2"
                  />
                </div>

                {/* Promo Banner 3 Dropzone */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="text-xs font-black text-[#003B8F] uppercase tracking-wider">PROMO 3 (Produk Baru)</div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Judul Promo 3</label>
                    <input
                      type="text"
                      value={form.promo_title_3}
                      onChange={(e) => setForm({ ...form, promo_title_3: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 font-bold bg-white"
                    />
                  </div>

                  <ImageDropzone
                    imageUrl={form.promo_image_3 || null}
                    onImageSelected={handlePromo3File}
                    onUrlDropped={(url) => setForm((f) => ({ ...f, promo_image_3: url }))}
                    onImageRemoved={() => setForm((f) => ({ ...f, promo_image_3: "" }))}
                    label="Foto Spanduk Promo 3"
                  />
                </div>
              </div>
            </div>

            {/* Profil Usaha & Struk */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700 font-bold">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#003B8F]">3. Profil Usaha & Format Struk</h2>
                  <p className="text-xs text-slate-500">Informasi toko yang tercetak pada struk kasir.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">
                  Nama Toko / Outlet *
                  <input
                    required
                    value={form.store_name}
                    onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-bold mt-1"
                  />
                </label>

                <label className="block text-xs font-bold text-slate-700">
                  Nomor Telepon / WhatsApp Toko
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="0812-0000-0000"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 mt-1"
                  />
                </label>
              </div>

              <label className="block text-xs font-bold text-slate-700">
                Alamat Lengkap Toko
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Jl. Sudirman No. 12..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 mt-1"
                />
              </label>

              <label className="block text-xs font-bold text-slate-700">
                Pesan Kaki Struk (Footer)
                <input
                  value={form.receipt_footer}
                  onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
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
