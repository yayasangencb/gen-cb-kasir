import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Monitor, Printer, RefreshCw, Save, Settings, Store, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth.functions";
import { getStoreSettings, resetQueueNumbers, updateStoreSettings } from "@/lib/pos.functions";

export const Route = createFileRoute("/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan — Gen CB Kasir" }] }),
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
    store_name: "GEN-CB Kasir",
    address: "",
    phone: "",
    receipt_footer: "Terima kasih telah berbelanja. Silakan menunggu nomor antrean Anda.",
    receipt_paper: "80mm" as "58mm" | "80mm",
    display_header: "STATUS PESANAN",
    display_footer: "Mohon menunggu hingga nomor antrean Anda berwarna hijau.",
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
        store_name: data.store_name || "GEN-CB Kasir",
        address: data.address || "",
        phone: data.phone || "",
        receipt_footer: data.receipt_footer || "Terima kasih telah berbelanja.",
        receipt_paper: (data.receipt_paper as "58mm" | "80mm") || "80mm",
        display_header: data.display_header || "STATUS PESANAN",
        display_footer: data.display_footer || "Mohon menunggu hingga nomor antrean Anda berwarna hijau.",
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
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveSettings({ data: form });
      toast.success("Pengaturan toko & display berhasil disimpan");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pengaturan");
    } finally {
      setBusy(false);
    }
  };

  const handleResetQueue = async () => {
    if (!confirm("Reset nomor antrean aktif hari ini? Semua antrean aktif akan ditandai selesai/diambil.")) return;
    try {
      await resetQueue({});
      toast.success("Nomor antrean berhasil di-reset");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal me-reset antrean");
    }
  };

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[color:var(--brand-deep)]">Pengaturan Sistem & Toko</h1>
            <p className="text-sm text-muted-foreground">
              Atur profil usaha, format cetak struk thermal, dan tampilan Display Pesanan.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={busy || isLoading}
            className="btn-brand inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold shadow-md disabled:opacity-50"
          >
            <Save className="h-5 w-5" /> {busy ? "Memproses..." : "Simpan Pengaturan"}
          </button>
        </div>

        {isLoading ? (
          <div className="h-96 animate-pulse rounded-3xl bg-white" />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profil Usaha & Struk */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--brand)]/10 text-[color:var(--brand)] font-bold">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[color:var(--brand-deep)]">Profil Usaha & Struk</h2>
                  <p className="text-xs text-muted-foreground">Informasi toko yang akan tercetak pada struk thermal.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-muted-foreground">
                  Nama Toko / Usaha *
                  <input
                    required
                    value={form.store_name}
                    onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                    className="input mt-1"
                  />
                </label>

                <label className="block text-xs font-bold text-muted-foreground">
                  Nomor Telepon / WhatsApp Toko
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="0812-0000-0000"
                    className="input mt-1"
                  />
                </label>
              </div>

              <label className="block text-xs font-bold text-muted-foreground">
                Alamat Lengkap Toko
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Jl. Contoh Usaha No. 123, Kota..."
                  className="input mt-1"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-muted-foreground">
                  Pesan Penutup Struk
                  <input
                    value={form.receipt_footer}
                    onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
                    className="input mt-1"
                  />
                </label>

                <label className="block text-xs font-bold text-muted-foreground">
                  Ukuran Kertas Thermal Printer
                  <select
                    value={form.receipt_paper}
                    onChange={(e) => setForm({ ...form, receipt_paper: e.target.value as "58mm" | "80mm" })}
                    className="input mt-1 font-bold"
                  >
                    <option value="80mm">Standard 80 mm</option>
                    <option value="58mm">Kecil / Mobile 58 mm</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Display Pesanan & Antrean */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-600 font-bold">
                  <Monitor className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[color:var(--brand-deep)]">Display Pesanan & Antrean</h2>
                  <p className="text-xs text-muted-foreground">Tampilan monitor/TV antrean pelanggan.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-muted-foreground">
                  Judul Header Display
                  <input
                    value={form.display_header}
                    onChange={(e) => setForm({ ...form, display_header: e.target.value })}
                    className="input mt-1"
                  />
                </label>

                <label className="block text-xs font-bold text-muted-foreground">
                  Teks Running Footer Display
                  <input
                    value={form.display_footer}
                    onChange={(e) => setForm({ ...form, display_footer: e.target.value })}
                    className="input mt-1"
                  />
                </label>

                <label className="block text-xs font-bold text-muted-foreground">
                  PIN Akses Pembuka Display (4 - 8 Angka)
                  <input
                    type="password"
                    maxLength={8}
                    value={form.display_pin}
                    onChange={(e) => setForm({ ...form, display_pin: e.target.value })}
                    className="input mt-1 font-mono font-bold text-center tracking-widest"
                  />
                </label>

                <label className="block text-xs font-bold text-muted-foreground">
                  Reset Antrean Otomatis
                  <select
                    value={form.queue_reset_mode}
                    onChange={(e) => setForm({ ...form, queue_reset_mode: e.target.value as "harian" | "manual" })}
                    className="input mt-1 font-bold"
                  >
                    <option value="harian">Reset Otomatis Setiap Hari (Jam 00:00)</option>
                    <option value="manual">Manual oleh Admin</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-4 rounded-2xl bg-secondary/50 p-4 border border-border">
                <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sound_enabled}
                    onChange={(e) => setForm({ ...form, sound_enabled: e.target.checked })}
                    className="rounded text-[color:var(--brand)]"
                  />
                  Bunyikan Suara & Panggilan Bel Saat Pesanan Selesai
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.show_customer_name}
                    onChange={(e) => setForm({ ...form, show_customer_name: e.target.checked })}
                    className="rounded text-[color:var(--brand)]"
                  />
                  Tampilkan Nama Pelanggan di Display
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.show_clock}
                    onChange={(e) => setForm({ ...form, show_clock: e.target.checked })}
                    className="rounded text-[color:var(--brand)]"
                  />
                  Tampilkan Jam Real-time di Display
                </label>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-[color:var(--brand-deep)]">Reset Nomor Antrean Hari Ini</h3>
                <p className="text-xs text-muted-foreground">
                  Paksa tandai semua antrean aktif sebagai selesai / diambil untuk memulai nomor antrean baru.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetQueue}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2.5 text-xs font-extrabold text-red-600 hover:bg-red-100 transition"
              >
                <RefreshCw className="h-4 w-4" /> Reset Antrean Sekarang
              </button>
            </div>
          </form>
        )}
      </div>
      <style>{`.input{width:100%;border-radius:1rem;border:1px solid var(--border);padding:0.65rem 0.9rem;font-size:0.8rem;background:white;outline:none}.input:focus{border-color:var(--brand)}`}</style>
    </AppShell>
  );
}
