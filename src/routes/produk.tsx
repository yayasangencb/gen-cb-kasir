import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Camera, Image, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ImageDropzone } from "@/components/ImageDropzone";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import {
  deleteProduct,
  listCatalog,
  removeProductImage,
  uploadProductImage,
  upsertProduct,
} from "@/lib/pos.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/produk")({
  head: () => ({ meta: [{ title: "Kelola Produk — Gen CB Kasir" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    if (staff.role !== "admin") throw redirect({ to: "/kasir" });
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: ProdukPage,
});

type EditState = {
  id?: string;
  name: string;
  selling_price: string;
  cost_price: string;
  stock: string;
  minimum_stock: string;
  unit: string;
  sku: string;
  barcode: string;
  description: string;
  category_id: string | null;
  image_url: string | null;
  is_available: boolean;
  is_active: boolean;
  initial_stock?: string;
};

function emptyForm(): EditState {
  return {
    name: "",
    selling_price: "",
    cost_price: "",
    stock: "0",
    minimum_stock: "5",
    unit: "pcs",
    sku: "",
    barcode: "",
    description: "",
    category_id: null,
    image_url: null,
    is_available: true,
    is_active: true,
    initial_stock: "0",
  };
}

function ProdukPage() {
  const staff = Route.useLoaderData();
  const fetchCatalog = useServerFn(listCatalog);
  const saveProduct = useServerFn(upsertProduct);
  const removeProduct = useServerFn(deleteProduct);
  const uploadImg = useServerFn(uploadProductImage);
  const removeImg = useServerFn(removeProductImage);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-catalog"],
    queryFn: () => fetchCatalog({}),
  });

  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string | "all">("all");
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const products = useMemo(() => {
    const list = data?.products ?? [];
    return list.filter((p) => {
      if (catFilter !== "all" && p.category_id !== catFilter) return false;
      if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !p.sku?.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [data, q, catFilter]);

  // Handle Photo File Selection / Camera Capture
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !edit) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file foto maksimal 5 MB");
      return;
    }

    setUploading(true);
    try {
      // Compress and crop square client-side canvas
      const base64 = await processImageSquareBase64(file);
      const mimeType = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";

      const res = await uploadImg({ data: { file_base64: base64, content_type: mimeType } });

      // Get public URL from Supabase storage
      const { data: pubData } = supabase.storage.from("product-images").getPublicUrl(res.path);
      setEdit({ ...edit, image_url: pubData.publicUrl });
      toast.success("Foto berhasil diunggah");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah foto");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!edit?.image_url) return;
    try {
      const urlParts = edit.image_url.split("/");
      const path = urlParts[urlParts.length - 1];
      await removeImg({ data: { path } });
    } catch {}
    setEdit({ ...edit, image_url: null });
    toast.success("Foto dihapus");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    if (!edit.name.trim()) {
      toast.error("Nama produk wajib diisi");
      return;
    }

    setBusy(true);
    try {
      await saveProduct({
        data: {
          id: edit.id,
          name: edit.name.trim(),
          category_id: edit.category_id,
          selling_price: Number(edit.selling_price) || 0,
          cost_price: Number(edit.cost_price) || 0,
          minimum_stock: Number(edit.minimum_stock) || 5,
          unit: edit.unit.trim() || "pcs",
          sku: edit.sku.trim() || undefined,
          barcode: edit.barcode.trim() || undefined,
          description: edit.description.trim() || undefined,
          image_url: edit.image_url,
          is_available: edit.is_available,
          is_active: edit.is_active,
          initial_stock: edit.id ? undefined : Number(edit.initial_stock) || 0,
        },
      });
      toast.success(edit.id ? "Produk diperbarui" : "Produk baru ditambahkan");
      setEdit(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan produk");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus produk ini? Produk yang sudah pernah terjual tidak akan terhapus demi keutuhan data transaksi.")) return;
    try {
      await removeProduct({ data: { id } });
      toast.success("Produk dihapus");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    }
  };

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[color:var(--brand-deep)]">Manajemen Produk</h1>
            <p className="text-sm text-muted-foreground">Tambah, ubah foto, edit harga, dan kelola ketersediaan produk.</p>
          </div>
          <button
            onClick={() => setEdit(emptyForm())}
            className="btn-brand inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold shadow-md"
          >
            <Plus className="h-5 w-5" /> Tambah Produk Baru
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-border">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama produk atau SKU..."
              className="w-full rounded-2xl border border-border bg-secondary/50 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none focus:border-[color:var(--brand)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">Kategori:</span>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="rounded-2xl border border-border bg-white px-3 py-2 text-xs font-bold text-foreground outline-none"
            >
              <option value="all">Semua Kategori</option>
              {(data?.categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Table / Cards */}
        <div className="glass-card overflow-hidden rounded-3xl shadow-md border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[color:var(--brand-deep)] text-white font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Foto</th>
                  <th className="px-4 py-3.5">Nama Produk</th>
                  <th className="px-4 py-3.5">Kategori</th>
                  <th className="px-4 py-3.5 text-right">Harga Jual</th>
                  <th className="px-4 py-3.5 text-right">Harga Modal</th>
                  <th className="px-4 py-3.5 text-right">Stok</th>
                  <th className="px-4 py-3.5 text-center">Ketersediaan</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-white font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground font-bold">
                      Memuat daftar produk...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-muted-foreground">
                      <Image className="mx-auto mb-2 h-10 w-10 opacity-30 text-[color:var(--brand)]" />
                      Belum ada produk. Tambahkan produk pertama Anda melalui tombol <b>Tambah Produk Baru</b>.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const cat = data?.categories.find((c) => c.id === p.category_id);
                    return (
                      <tr key={p.id} className="hover:bg-secondary/40 transition">
                        <td className="px-4 py-3">
                          <div className="h-11 w-11 overflow-hidden rounded-xl bg-secondary border border-border flex items-center justify-center">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center bg-[color:var(--brand)] text-white font-black text-sm">
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-sm text-[color:var(--brand-deep)]">{p.name}</div>
                          {p.sku && <div className="text-[10px] text-muted-foreground font-mono">SKU: {p.sku}</div>}
                        </td>
                        <td className="px-4 py-3 font-semibold text-muted-foreground">{cat?.name ?? "-"}</td>
                        <td className="px-4 py-3 text-right font-black text-sm text-[color:var(--brand-deep)]">
                          {rupiah(Number(p.selling_price))}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-muted-foreground">
                          {rupiah(Number(p.cost_price))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-extrabold ${
                              p.stock <= 0
                                ? "text-red-600 font-black"
                                : p.stock <= p.minimum_stock
                                ? "text-amber-600"
                                : "text-emerald-700"
                            }`}
                          >
                            {p.stock} {p.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                              p.is_available ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {p.is_available ? "Tersedia" : "Habis"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                              p.is_active ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {p.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() =>
                                setEdit({
                                  id: p.id,
                                  name: p.name,
                                  selling_price: String(p.selling_price),
                                  cost_price: String(p.cost_price),
                                  stock: String(p.stock),
                                  minimum_stock: String(p.minimum_stock),
                                  unit: p.unit,
                                  sku: p.sku || "",
                                  barcode: p.barcode || "",
                                  description: p.description || "",
                                  category_id: p.category_id,
                                  image_url: p.image_url,
                                  is_available: p.is_available,
                                  is_active: p.is_active,
                                })
                              }
                              className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-[color:var(--brand)] transition"
                              title="Edit Produk"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDelete(p.id)}
                              className="rounded-xl p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition"
                              title="Hapus Produk"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-xl font-extrabold text-[color:var(--brand-deep)]">
                {edit.id ? "Edit Produk" : "Tambah Produk Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setEdit(null)}
                className="rounded-xl p-1.5 hover:bg-secondary text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

              <ImageDropzone
                imageUrl={edit.image_url}
                uploading={uploading}
                onImageSelected={async (file) => {
                  if (file.size > 15 * 1024 * 1024) {
                    toast.error("Ukuran berkas foto maksimal 15 MB");
                    return;
                  }
                  setUploading(true);

                  try {
                    // 1. Convert & compress image to 400x400 square JPEG data URL (~30KB)
                    const dataUrl = await processImageSquareDataUrl(file);

                    // 2. Instantly attach dataUrl to state so image is immediately ready for save
                    setEdit((prev) => (prev ? { ...prev, image_url: dataUrl } : null));

                    // 3. Try uploading to Supabase Storage bucket in background
                    try {
                      const fileName = `${crypto.randomUUID()}.jpg`;
                      const base64Data = dataUrl.split(",")[1];
                      const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

                      const { data: uploadResult, error: uploadError } = await supabase.storage
                        .from("product-images")
                        .upload(fileName, bytes, { contentType: "image/jpeg", upsert: true });

                      if (!uploadError && uploadResult?.path) {
                        const { data: pubData } = supabase.storage.from("product-images").getPublicUrl(uploadResult.path);
                        if (pubData?.publicUrl) {
                          setEdit((prev) => (prev ? { ...prev, image_url: pubData.publicUrl } : null));
                        }
                      }
                    } catch (storageErr) {
                      console.warn("Storage upload optional upgrade skipped:", storageErr);
                    }

                    toast.success("Foto produk siap disimpan!");
                  } catch (err) {
                    console.error("Image upload error:", err);
                    toast.error("Gagal membaca berkas gambar");
                  } finally {
                    setUploading(false);
                  }
                }}
                onImageRemoved={handleRemovePhoto}
              />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nama Produk *">
                <input
                  required
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  placeholder="Contoh: Kopi Susu Aren"
                  className="input"
                />
              </Field>

              <Field label="Kategori">
                <select
                  value={edit.category_id ?? ""}
                  onChange={(e) => setEdit({ ...edit, category_id: e.target.value || null })}
                  className="input"
                >
                  <option value="">Tanpa Kategori</option>
                  {(data?.categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Harga Jual (Rp) *">
                <input
                  type="number"
                  required
                  min={0}
                  value={edit.selling_price}
                  onChange={(e) => setEdit({ ...edit, selling_price: e.target.value })}
                  placeholder="15000"
                  className="input"
                />
              </Field>

              <Field label="Harga Modal (Rp)">
                <input
                  type="number"
                  min={0}
                  value={edit.cost_price}
                  onChange={(e) => setEdit({ ...edit, cost_price: e.target.value })}
                  placeholder="8000"
                  className="input"
                />
              </Field>

              {!edit.id && (
                <Field label="Stok Awal">
                  <input
                    type="number"
                    min={0}
                    value={edit.initial_stock ?? "0"}
                    onChange={(e) => setEdit({ ...edit, initial_stock: e.target.value })}
                    className="input"
                  />
                </Field>
              )}

              <Field label="Stok Minimum Peringatan">
                <input
                  type="number"
                  min={0}
                  value={edit.minimum_stock}
                  onChange={(e) => setEdit({ ...edit, minimum_stock: e.target.value })}
                  className="input"
                />
              </Field>

              <Field label="Satuan">
                <input
                  value={edit.unit}
                  onChange={(e) => setEdit({ ...edit, unit: e.target.value })}
                  placeholder="pcs / porsi / cup"
                  className="input"
                />
              </Field>

              <Field label="SKU / Kode Produk">
                <input
                  value={edit.sku}
                  onChange={(e) => setEdit({ ...edit, sku: e.target.value })}
                  placeholder="KPS-001"
                  className="input"
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-4 rounded-2xl bg-secondary/40 p-3 border border-border">
              <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={edit.is_available}
                  onChange={(e) => setEdit({ ...edit, is_available: e.target.checked })}
                  className="rounded text-[color:var(--brand)]"
                />
                Tersedia untuk Dipesan
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={edit.is_active}
                  onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })}
                  className="rounded text-[color:var(--brand)]"
                />
                Tampilkan di Kasir (Aktif)
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEdit(null)}
                className="flex-1 rounded-2xl bg-secondary py-3 text-xs font-extrabold text-[color:var(--brand-deep)]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="btn-brand flex-1 rounded-2xl py-3 text-xs font-extrabold shadow-md disabled:opacity-50"
              >
                {busy ? "Memproses..." : "Simpan Produk"}
              </button>
            </div>
          </form>
          <style>{`.input{width:100%;border-radius:1rem;border:1px solid var(--border);padding:0.6rem 0.9rem;font-size:0.8rem;background:white;outline:none}.input:focus{border-color:var(--brand)}`}</style>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function processImageSquareDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = Math.min(img.width, img.height);
          canvas.width = 400;
          canvas.height = 400;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          resolve(dataUrl);
        } catch (err) {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => reject(new Error("Format berkas gambar tidak valid"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Gagal membaca berkas"));
    reader.readAsDataURL(file);
  });
}
