import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { clearOutletCatalog, deleteProduct, listCatalog, upsertProduct } from "@/lib/pos.functions";

export const Route = createFileRoute("/produk")({
  head: () => ({ meta: [{ title: "Stok Produk — Gen CB Kasir" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: ProdukPage,
});

type EditState = {
  id?: string;
  name: string;
  price: string;
  stock: string;
  category_id: string | null;
  is_active: boolean;
};

function empty(): EditState {
  return { name: "", price: "", stock: "0", category_id: null, is_active: true };
}

function ProdukPage() {
  const staff = Route.useLoaderData();
  const isAdmin = staff.role === "admin" || staff.role === "super_admin";
  const fetchCatalog = useServerFn(listCatalog);
  const save = useServerFn(upsertProduct);
  const remove = useServerFn(deleteProduct);
  const doClearCatalog = useServerFn(clearOutletCatalog);

  const { data, isLoading, refetch } = useQuery({ queryKey: ["catalog"], queryFn: () => fetchCatalog({}) });
  const [edit, setEdit] = useState<EditState | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    if (!edit.name.trim()) {
      toast.error("Nama produk wajib diisi");
      return;
    }
    try {
      await save({
        data: {
          id: edit.id,
          name: edit.name.trim(),
          selling_price: Number(edit.price) || 0,
          initial_stock: Number(edit.stock) || 0,
          category_id: edit.category_id,
          is_active: edit.is_active,
        },
      });
      toast.success("Produk disimpan");
      setEdit(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Hapus produk ini?")) return;
    try {
      await remove({ data: { id } });
      toast.success("Produk dihapus");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await doClearCatalog({});
      toast.success("Seluruh katalog produk & kategori toko telah dikosongkan!");
      setShowClearConfirm(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengosongkan katalog");
    } finally {
      setClearing(false);
    }
  };

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                {staff.outletName ?? "Outlet Kasir"}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest">ADMIN STOK</span>
            </div>
            <h1 className="text-3xl font-extrabold text-[color:var(--brand-deep)]">Manajemen Stok Produk</h1>
            <p className="text-sm text-muted-foreground">Kelola katalog produk & stok khusus outlet Anda.</p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive hover:bg-destructive/20 transition"
              >
                <Trash2 className="h-4 w-4" /> CLEAR ALL (Hapus Semua)
              </button>

              <button
                onClick={() => setEdit(empty())}
                className="btn-brand flex items-center gap-2 rounded-2xl px-5 py-3 font-bold"
              >
                <Plus className="h-5 w-5" /> Tambah Produk Baru
              </button>
            </div>
          )}
        </div>

        <div className="glass-card overflow-hidden rounded-3xl">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--brand-deep)] text-white">
              <tr>
                <th className="px-4 py-3 text-left">Nama Produk</th>
                <th className="px-4 py-3 text-left">Kategori</th>
                <th className="px-4 py-3 text-right">Harga Jual</th>
                <th className="px-4 py-3 text-right">Stok</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Memuat katalog...
                  </td>
                </tr>
              ) : (data?.products ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    Belum ada produk di outlet ini. Klik <b>Tambah Produk Baru</b> di atas untuk membuat produk.
                  </td>
                </tr>
              ) : (
                (data?.products ?? []).map((p) => {
                  const cat = data?.categories.find((c) => c.id === p.category_id);
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/40">
                      <td className="px-4 py-3 font-semibold text-foreground">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{cat?.name ?? "Umum"}</td>
                      <td className="px-4 py-3 text-right font-bold text-[color:var(--brand-deep)]">
                        {rupiah(Number(p.selling_price ?? p.price))}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${p.stock <= 5 ? "text-destructive" : ""}`}>
                        {p.stock}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            p.is_active
                              ? "bg-[color:var(--status-done)]/20 text-[color:var(--status-done)]"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {p.is_active ? "Tampil" : "Disembunyikan"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() =>
                                setEdit({
                                  id: p.id,
                                  name: p.name,
                                  price: String(p.selling_price ?? p.price),
                                  stock: String(p.stock),
                                  category_id: p.category_id,
                                  is_active: p.is_active,
                                })
                              }
                              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-[color:var(--brand)]"
                              title="Edit Produk"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDelete(p.id)}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              title="Hapus Produk"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit Product */}
      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
          <form onSubmit={onSubmit} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-extrabold text-[color:var(--brand-deep)]">
              {edit.id ? "Edit Produk" : "Tambah Produk Baru"}
            </h2>
            <div className="mt-4 space-y-3">
              <Field label="Nama Produk">
                <input
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  className="input"
                  placeholder="Contoh: Kopi Susu Aren"
                  autoFocus
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Harga Jual (Rp)">
                  <input
                    type="number"
                    value={edit.price}
                    onChange={(e) => setEdit({ ...edit, price: e.target.value })}
                    className="input"
                    placeholder="15000"
                  />
                </Field>
                <Field label="Stok Barang">
                  <input
                    type="number"
                    value={edit.stock}
                    onChange={(e) => setEdit({ ...edit, stock: e.target.value })}
                    className="input"
                    placeholder="50"
                  />
                </Field>
              </div>
              <Field label="Kategori Produk">
                <select
                  value={edit.category_id ?? ""}
                  onChange={(e) => setEdit({ ...edit, category_id: e.target.value || null })}
                  className="input"
                >
                  <option value="">Umum / Tanpa Kategori</option>
                  {(data?.categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={edit.is_active}
                  onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })}
                />
                Tampilkan di kasir untuk transaksi
              </label>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setEdit(null)}
                className="flex-1 rounded-xl bg-secondary py-3 font-bold text-[color:var(--brand-deep)]"
              >
                Batal
              </button>
              <button type="submit" className="btn-brand flex-1 rounded-xl py-3 font-bold">
                Simpan Produk
              </button>
            </div>
          </form>
          <style>{`.input{width:100%;border-radius:0.75rem;border:1px solid var(--border);padding:0.65rem 0.9rem;background:white;outline:none}.input:focus{border-color:var(--brand)}`}</style>
        </div>
      )}

      {/* Modal Clear All Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-extrabold text-destructive">Hapus Semua Produk & Kategori?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tindakan ini akan mengosongkan **SELURUH** produk dan kategori di toko <b>{staff.outletName}</b> agar Anda
              dapat membuat produk dari nol. Data transaksi sebelumnya tetap aman.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 rounded-xl bg-secondary py-3 font-bold text-foreground"
              >
                Batal
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="flex-1 rounded-xl bg-destructive py-3 font-bold text-white hover:bg-destructive/90 disabled:opacity-50"
              >
                {clearing ? "Mengosongkan..." : "Ya, Kosongkan Semua"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
