import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Lock, Pencil, Plus, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth.functions";
import { deleteStaff, listCashiers, upsertStaff } from "@/lib/pos.functions";

export const Route = createFileRoute("/pengguna")({
  head: () => ({ meta: [{ title: "Kelola Pengguna — Gen CB Kasir" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    if (staff.role !== "admin") throw redirect({ to: "/kasir" });
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: PenggunaPage,
});

type EditState = {
  id?: string;
  name: string;
  pin: string;
  role: "admin" | "kasir";
  is_active: boolean;
};

function emptyForm(): EditState {
  return { name: "", pin: "", role: "kasir", is_active: true };
}

function PenggunaPage() {
  const staff = Route.useLoaderData();
  const fetchStaff = useServerFn(listCashiers);
  const saveStaff = useServerFn(upsertStaff);
  const removeStaff = useServerFn(deleteStaff);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => fetchStaff({}),
  });

  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    if (!edit.name.trim()) {
      toast.error("Nama petugas wajib diisi");
      return;
    }
    if (!/^\d{4,8}$/.test(edit.pin)) {
      toast.error("PIN harus berupa 4-8 angka");
      return;
    }

    setBusy(true);
    try {
      await saveStaff({
        data: {
          id: edit.id,
          name: edit.name.trim(),
          pin: edit.pin,
          role: edit.role,
          is_active: edit.is_active,
        },
      });
      toast.success(edit.id ? "Akun pengguna diperbarui" : "Akun pengguna baru dibuat");
      setEdit(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan akun");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (id === staff.id) {
      toast.error("Tidak dapat menghapus akun yang sedang Anda gunakan saat ini");
      return;
    }
    if (!confirm("Nonaktifkan akun pengguna ini?")) return;
    try {
      await removeStaff({ data: { id } });
      toast.success("Akun dinonaktifkan");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    }
  };

  const users = data ?? [];

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[color:var(--brand-deep)]">Manajemen Akun Pengguna</h1>
            <p className="text-sm text-muted-foreground">Kelola PIN dan hak akses Administrator & Kasir.</p>
          </div>
          <button
            onClick={() => setEdit(emptyForm())}
            className="btn-brand inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold shadow-md"
          >
            <Plus className="h-5 w-5" /> Tambah Pengguna Baru
          </button>
        </div>

        {/* User Table */}
        <div className="glass-card overflow-hidden rounded-3xl shadow-md border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-[color:var(--brand-deep)] text-white font-extrabold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Nama Petugas</th>
                <th className="px-5 py-3.5">Peran (Role)</th>
                <th className="px-5 py-3.5 text-center">PIN Auth</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white font-semibold">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground font-bold">
                    Memuat pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    <Users className="mx-auto mb-2 h-10 w-10 opacity-30 text-[color:var(--brand)]" />
                    Belum ada akun pengguna.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-secondary/40 transition">
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-sm text-[color:var(--brand-deep)]">{u.name}</div>
                      {u.id === staff.id && (
                        <span className="text-[10px] text-[color:var(--brand)] font-bold">(Akun Anda saat ini)</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                          u.role === "admin"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        <ShieldCheck className="h-3 w-3" />
                        {u.role === "admin" ? "Administrator" : "Kasir"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-mono font-bold text-muted-foreground">
                      •••• (Rahasia)
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                          u.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() =>
                            setEdit({
                              id: u.id,
                              name: u.name,
                              pin: "",
                              role: u.role as "admin" | "kasir",
                              is_active: u.is_active,
                            })
                          }
                          className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-[color:var(--brand)] transition"
                          title="Edit Pengguna"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {u.id !== staff.id && (
                          <button
                            onClick={() => onDelete(u.id)}
                            className="rounded-xl p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition"
                            title="Nonaktifkan"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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
                {edit.id ? "Edit Pengguna" : "Tambah Pengguna Baru"}
              </h2>
              <button type="button" onClick={() => setEdit(null)} className="rounded-xl p-1 hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="block text-xs font-bold text-muted-foreground">
              Nama Petugas *
              <input
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                placeholder="Contoh: Budi Kasir 1"
                className="input mt-1"
                autoFocus
              />
            </label>

            <label className="block text-xs font-bold text-muted-foreground">
              PIN Otentikasi (4 - 8 Angka) *
              <input
                type="password"
                required
                maxLength={8}
                value={edit.pin}
                onChange={(e) => setEdit({ ...edit, pin: e.target.value })}
                placeholder={edit.id ? "Masukkan PIN baru jika ingin mengubah" : "Contoh: 1234"}
                className="input mt-1 font-mono font-bold tracking-widest text-center text-lg"
              />
            </label>

            <label className="block text-xs font-bold text-muted-foreground">
              Peran Hak Akses *
              <select
                value={edit.role}
                onChange={(e) => setEdit({ ...edit, role: e.target.value as "admin" | "kasir" })}
                className="input mt-1 font-bold"
              >
                <option value="kasir">Kasir (Hanya Akses POS Kasir & Pesanan Aktif)</option>
                <option value="admin">Administrator (Akses Penuh Seluruh Sistem)</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={edit.is_active}
                onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })}
              />
              Akun Aktif (Dapat Login)
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
                {busy ? "Memproses..." : "Simpan Pengguna"}
              </button>
            </div>
          </form>
          <style>{`.input{width:100%;border-radius:1rem;border:1px solid var(--border);padding:0.65rem 0.9rem;font-size:0.8rem;background:white;outline:none}.input:focus{border-color:var(--brand)}`}</style>
        </div>
      )}
    </AppShell>
  );
}
