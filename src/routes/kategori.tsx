import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { FolderTree, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth.functions";
import { deleteCategory, listCategories, upsertCategory } from "@/lib/pos.functions";

export const Route = createFileRoute("/kategori")({
  head: () => ({ meta: [{ title: "Kelola Kategori — Gen CB Kasir" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    if (staff.role !== "admin") throw redirect({ to: "/kasir" });
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: KategoriPage,
});

type EditState = {
  id?: string;
  name: string;
  sort_order: string;
  is_active: boolean;
};

function emptyForm(): EditState {
  return { name: "", sort_order: "0", is_active: true };
}

function KategoriPage() {
  const staff = Route.useLoaderData();
  const fetchCats = useServerFn(listCategories);
  const saveCat = useServerFn(upsertCategory);
  const removeCat = useServerFn(deleteCategory);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["categories-admin"],
    queryFn: () => fetchCats({}),
  });

  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    if (!edit.name.trim()) {
      toast.error("Nama kategori wajib diisi");
      return;
    }

    setBusy(true);
    try {
      await saveCat({
        data: {
          id: edit.id,
          name: edit.name.trim(),
          sort_order: Number(edit.sort_order) || 0,
          is_active: edit.is_active,
        },
      });
      toast.success(edit.id ? "Kategori diperbarui" : "Kategori baru ditambahkan");
      setEdit(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Hapus kategori ini? Kategori yang sedang digunakan oleh produk tidak dapat dihapus.")) return;
    try {
      await removeCat({ data: { id } });
      toast.success("Kategori dihapus");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    }
  };

  const categories = data ?? [];

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[color:var(--brand-deep)]">Kelola Kategori Produk</h1>
            <p className="text-sm text-muted-foreground">Kelompokkan produk untuk memudahkan pencarian di Kasir.</p>
          </div>
          <button
            onClick={() => setEdit(emptyForm())}
            className="btn-brand inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold shadow-md"
          >
            <Plus className="h-5 w-5" /> Tambah Kategori
          </button>
        </div>

        <div className="glass-card overflow-hidden rounded-3xl shadow-md border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-[color:var(--brand-deep)] text-white font-extrabold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Urutan</th>
                <th className="px-5 py-3.5">Nama Kategori</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white font-semibold">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    Memuat kategori...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-muted-foreground">
                    <FolderTree className="mx-auto mb-2 h-10 w-10 opacity-30 text-[color:var(--brand)]" />
                    Belum ada kategori.
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/40 transition">
                    <td className="px-5 py-4 font-mono font-bold text-muted-foreground">{c.sort_order}</td>
                    <td className="px-5 py-4 font-extrabold text-sm text-[color:var(--brand-deep)]">{c.name}</td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                          c.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() =>
                            setEdit({
                              id: c.id,
                              name: c.name,
                              sort_order: String(c.sort_order),
                              is_active: c.is_active,
                            })
                          }
                          className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-[color:var(--brand)]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(c.id)}
                          className="rounded-xl p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-extrabold text-[color:var(--brand-deep)]">
                {edit.id ? "Edit Kategori" : "Tambah Kategori Baru"}
              </h2>
              <button type="button" onClick={() => setEdit(null)} className="rounded-xl p-1 hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="block text-xs font-bold text-muted-foreground">
              Nama Kategori *
              <input
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                placeholder="Contoh: Minuman Dingin"
                className="input mt-1"
                autoFocus
              />
            </label>

            <label className="block text-xs font-bold text-muted-foreground">
              Urutan Tampilan
              <input
                type="number"
                value={edit.sort_order}
                onChange={(e) => setEdit({ ...edit, sort_order: e.target.value })}
                className="input mt-1"
              />
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={edit.is_active}
                onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })}
              />
              Kategori Aktif
            </label>

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
                {busy ? "Memproses..." : "Simpan Kategori"}
              </button>
            </div>
          </form>
          <style>{`.input{width:100%;border-radius:1rem;border:1px solid var(--border);padding:0.65rem 0.9rem;font-size:0.8rem;background:white;outline:none}.input:focus{border-color:var(--brand)}`}</style>
        </div>
      )}
    </AppShell>
  );
}
