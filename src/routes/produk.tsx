import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { deleteProduct, listCatalog, upsertProduct } from "@/lib/pos.functions";

export const Route = createFileRoute("/produk")({
  head: () => ({
    meta: [
      { title: "Produk — GEN-CB Kasir" },
      { name: "description", content: "Kelola produk GEN-CB: harga jual, stok minimum, kategori, dan ketersediaan." },
      { property: "og:title", content: "Produk — GEN-CB Kasir" },
      { property: "og:description", content: "Manajemen produk dan stok untuk operasional kasir GEN-CB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
  selling_price: string;
  cost_price: string;
  minimum_stock: string;
  unit: string;
  initial_stock: string;
  category_id: string | null;
  is_available: boolean;
  is_active: boolean;
};

function empty(): EditState {
  return {
    name: "",
    selling_price: "",
    cost_price: "0",
    minimum_stock: "5",
    unit: "pcs",
    initial_stock: "0",
    category_id: null,
    is_available: true,
    is_active: true,
  };
}

function ProdukPage() {
  const staff = Route.useLoaderData();
  const isAdmin = staff.role === "admin";
  const fetchCatalog = useServerFn(listCatalog);
  const save = useServerFn(upsertProduct);
  const remove = useServerFn(deleteProduct);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["catalog"], queryFn: () => fetchCatalog({}) });
  const [edit, setEdit] = useState<EditState | null>(null);

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
          category_id: edit.category_id,
          selling_price: Number(edit.selling_price) || 0,
          cost_price: Number(edit.cost_price) || 0,
          minimum_stock: Number(edit.minimum_stock) || 0,
          unit: edit.unit.trim() || "pcs",
          is_available: edit.is_available,
          is_active: edit.is_active,
          ...(edit.id ? {} : { initial_stock: Number(edit.initial_stock) || 0 }),
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

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[color:var(--brand-deep)]">Produk</h1>
            <p className="text-sm text-muted-foreground">Kelola daftar produk, harga, dan stok.</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setEdit(empty())}
              className="btn-brand flex items-center gap-2 rounded-2xl px-5 py-3 font-bold"
            >
              <Plus className="h-5 w-5" /> Tambah Produk
            </button>
          )}
        </div>

        <div className="glass-card overflow-hidden rounded-3xl">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--brand-deep)] text-white">
              <tr>
                <th className="px-4 py-3 text-left">Nama</th>
                <th className="px-4 py-3 text-left">Kategori</th>
                <th className="px-4 py-3 text-right">Harga</th>
                <th className="px-4 py-3 text-right">Stok</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Memuat...
                  </td>
                </tr>
              ) : (data?.products ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Belum ada produk.
                  </td>
                </tr>
              ) : (
                (data?.products ?? []).map((p) => {
                  const cat = data?.categories.find((c) => c.id === p.category_id);
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{cat?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-bold text-[color:var(--brand-deep)]">
                        {rupiah(Number(p.selling_price))}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          p.stock <= p.minimum_stock ? "text-destructive" : ""
                        }`}
                      >
                        {p.stock} {p.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            p.is_active && p.is_available
                              ? "bg-[color:var(--status-done)]/20 text-[color:var(--status-done)]"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {p.is_active ? (p.is_available ? "Tersedia" : "Kosong") : "Nonaktif"}
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
                                  selling_price: String(p.selling_price),
                                  cost_price: String(p.cost_price),
                                  minimum_stock: String(p.minimum_stock),
                                  unit: p.unit,
                                  initial_stock: "0",
                                  category_id: p.category_id,
                                  is_available: p.is_available,
                                  is_active: p.is_active,
                                })
                              }
                              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-[color:var(--brand)]"
                              aria-label="Edit produk"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDelete(p.id)}
                              className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Hapus produk"
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

      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/40 p-4">
          <form onSubmit={onSubmit} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-extrabold text-[color:var(--brand-deep)]">
              {edit.id ? "Edit Produk" : "Tambah Produk"}
            </h2>
            <div className="mt-4 space-y-3">
              <Field label="Nama produk">
                <input
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  className="input"
                  autoFocus
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Harga jual (Rp)">
                  <input
                    type="number"
                    value={edit.selling_price}
                    onChange={(e) => setEdit({ ...edit, selling_price: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Harga pokok (Rp)">
                  <input
                    type="number"
                    value={edit.cost_price}
                    onChange={(e) => setEdit({ ...edit, cost_price: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Stok minimum">
                  <input
                    type="number"
                    value={edit.minimum_stock}
                    onChange={(e) => setEdit({ ...edit, minimum_stock: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Satuan">
                  <input
                    value={edit.unit}
                    onChange={(e) => setEdit({ ...edit, unit: e.target.value })}
                    className="input"
                  />
                </Field>
                {!edit.id && (
                  <Field label="Stok awal">
                    <input
                      type="number"
                      value={edit.initial_stock}
                      onChange={(e) => setEdit({ ...edit, initial_stock: e.target.value })}
                      className="input"
                    />
                  </Field>
                )}
              </div>
              <Field label="Kategori">
                <select
                  value={edit.category_id ?? ""}
                  onChange={(e) => setEdit({ ...edit, category_id: e.target.value || null })}
                  className="input"
                >
                  <option value="">Tanpa kategori</option>
                  {(data?.categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={edit.is_available}
                    onChange={(e) => setEdit({ ...edit, is_available: e.target.checked })}
                  />
                  Tersedia dijual
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={edit.is_active}
                    onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })}
                  />
                  Aktif
                </label>
              </div>
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
                Simpan
              </button>
            </div>
          </form>

          <style>{`.input{width:100%;border-radius:0.75rem;border:1px solid var(--border);padding:0.65rem 0.9rem;background:white;outline:none}
                   .input:focus{border-color:var(--brand)}`}</style>
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
