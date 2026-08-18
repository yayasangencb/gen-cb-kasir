import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Store, Key, Shield, LogOut, RefreshCw, CheckCircle2, UserCheck, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getCurrentStaff, logout } from "@/lib/auth.functions";
import { createOutlet, listOutlets, updateStaffPin } from "@/lib/superadmin.functions";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Super Admin Dashboard — Gen CB Kasir" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff || staff.role !== "super_admin") {
      throw redirect({ to: "/admin/login" });
    }
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: SuperAdminDashboardPage,
});

function SuperAdminDashboardPage() {
  const staff = Route.useLoaderData();
  const router = useRouter();
  const fetchOutlets = useServerFn(listOutlets);
  const doCreateOutlet = useServerFn(createOutlet);
  const doUpdatePin = useServerFn(updateStaffPin);
  const doLogout = useServerFn(logout);

  const { data: outlets, isLoading, refetch } = useQuery({
    queryKey: ["superadmin_outlets"],
    queryFn: () => fetchOutlets(),
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [kasirPin, setKasirPin] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const [editStaff, setEditStaff] = useState<{ id: string; name: string; currentPin: string } | null>(null);
  const [newPinVal, setNewPinVal] = useState("");
  const [updatingPin, setUpdatingPin] = useState(false);

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await doCreateOutlet({
        data: {
          name,
          code,
          adminPin,
          kasirPin,
          address: address || undefined,
          phone: phone || undefined,
        },
      });
      toast.success(`Outlet ${name} berhasil dibuat!`);
      setName("");
      setCode("");
      setAdminPin("");
      setKasirPin("");
      setAddress("");
      setPhone("");
      setShowAddModal(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat outlet");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaff) return;
    setUpdatingPin(true);
    try {
      await doUpdatePin({ data: { staffId: editStaff.id, newPin: newPinVal } });
      toast.success(`PIN untuk ${editStaff.name} berhasil diperbarui menjadi ${newPinVal}`);
      setEditStaff(null);
      setNewPinVal("");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui PIN");
    } finally {
      setUpdatingPin(false);
    }
  };

  const handleLogout = async () => {
    await doLogout();
    toast.info("Telah keluar");
    await router.navigate({ to: "/admin/login" });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-500 text-slate-950 font-black grid place-items-center text-xl shadow-lg">
            SA
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-amber-400">PANEL SUPER ADMIN</div>
            <h1 className="text-2xl font-extrabold text-white">Kelola Outlet & Hubungkan Kasir</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition border border-slate-700"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl text-sm font-extrabold transition shadow-lg"
          >
            <Plus className="h-5 w-5" /> Tambah Outlet Baru
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 px-4 py-2.5 rounded-xl text-sm font-semibold transition border border-rose-500/30"
          >
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto mt-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-200">Daftar Toko / Outlet Terhubung</h2>
            <p className="text-xs text-slate-400">
              Setiap outlet terisolasi penuh. Admin Kasir mengelola stok outlet, Kasir melayani POS & Display.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Total Outlet: <b className="text-amber-400 text-base">{(outlets ?? []).length}</b>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-800/50 animate-pulse rounded-3xl border border-slate-800" />
            ))}
          </div>
        ) : (outlets ?? []).length === 0 ? (
          <div className="text-center py-16 bg-slate-800/40 rounded-3xl border border-slate-800">
            <Store className="mx-auto h-12 w-12 text-slate-600 mb-3" />
            <p className="text-slate-400">Belum ada outlet terdaftar.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm"
            >
              Buat Outlet Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(outlets ?? []).map((out) => {
              const adminStaff = out.staff?.find((s) => s.role === "admin");
              const kasirStaff = out.staff?.find((s) => s.role === "kasir");

              return (
                <div
                  key={out.id}
                  className="bg-slate-800 border border-slate-700 rounded-3xl p-6 flex flex-col justify-between hover:border-amber-500/50 transition shadow-xl relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-400 font-extrabold text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl border-l border-b border-amber-500/20">
                    KODE: {out.code}
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 grid place-items-center font-black text-xl">
                        {out.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white">{out.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          {out.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {out.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {out.address && (
                      <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" /> {out.address}
                      </p>
                    )}

                    <div className="space-y-3 border-t border-slate-700/60 pt-4 mt-2">
                      {/* Admin Kasir PIN */}
                      <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-700/80 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">
                            ADMIN KASIR (STOK)
                          </div>
                          <div className="text-sm font-bold text-white">
                            {adminStaff ? adminStaff.name : "Belum terhubung"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-amber-500/20 text-amber-300 font-bold px-2.5 py-1 rounded-lg text-sm border border-amber-500/30">
                            PIN: {adminStaff?.pin ?? "—"}
                          </span>
                          {adminStaff && (
                            <button
                              onClick={() =>
                                setEditStaff({
                                  id: adminStaff.id,
                                  name: adminStaff.name,
                                  currentPin: adminStaff.pin,
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
                              title="Ubah PIN Admin Kasir"
                            >
                              <Key className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Kasir PIN */}
                      <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-700/80 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">
                            KASIR (POS & DISPLAY)
                          </div>
                          <div className="text-sm font-bold text-white">
                            {kasirStaff ? kasirStaff.name : "Belum terhubung"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-1 rounded-lg text-sm border border-emerald-500/30">
                            PIN: {kasirStaff?.pin ?? "—"}
                          </span>
                          {kasirStaff && (
                            <button
                              onClick={() =>
                                setEditStaff({
                                  id: kasirStaff.id,
                                  name: kasirStaff.name,
                                  currentPin: kasirStaff.pin,
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
                              title="Ubah PIN Kasir"
                            >
                              <Key className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Data Terisolasi
                    </span>
                    <span>Multi-Tenant Active</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Add Outlet */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Tambah Outlet Baru</h3>
            <p className="text-xs text-slate-400 mb-6">
              Sistem akan otomatis menghubungkan Admin Kasir & Kasir beserta PIN unik untuk outlet ini.
            </p>

            <form onSubmit={handleCreateOutlet} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Outlet / Toko</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kopi Kenangan"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Kode Unik Outlet</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: KENANGAN"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">PIN Admin Kasir (Stok)</label>
                  <input
                    type="text"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="Misal: 1234"
                    required
                    className="w-full bg-slate-900 border border-amber-500/40 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1">PIN Kasir (POS)</label>
                  <input
                    type="text"
                    value={kasirPin}
                    onChange={(e) => setKasirPin(e.target.value)}
                    placeholder="Misal: 2222"
                    required
                    className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Alamat (Opsional)</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Sudirman No. 12"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">No. HP / Telepon (Opsional)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl text-sm shadow-lg disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Outlet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit PIN */}
      {editStaff && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Ubah PIN Login</h3>
            <p className="text-xs text-slate-400 mb-4">
              Petugas: <b className="text-amber-400">{editStaff.name}</b>
            </p>

            <form onSubmit={handleUpdatePin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">PIN Baru (Unik)</label>
                <input
                  type="text"
                  value={newPinVal}
                  onChange={(e) => setNewPinVal(e.target.value)}
                  placeholder={`PIN Lama: ${editStaff.currentPin}`}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditStaff(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingPin}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-5 py-2 rounded-xl text-xs shadow-lg disabled:opacity-50"
                >
                  {updatingPin ? "Memperbarui..." : "Update PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
