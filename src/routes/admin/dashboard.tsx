import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Store, Key, Shield, LogOut, RefreshCw, Users, ShieldCheck, Phone, MapPin, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getCurrentStaff, logout } from "@/lib/auth.functions";
import { createOutlet, createStaffUser, listAllUsers, listOutlets, updateStaffPin } from "@/lib/superadmin.functions";

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
  const fetchUsers = useServerFn(listAllUsers);
  const doCreateOutlet = useServerFn(createOutlet);
  const doCreateUser = useServerFn(createStaffUser);
  const doUpdatePin = useServerFn(updateStaffPin);
  const doLogout = useServerFn(logout);

  const [activeTab, setActiveTab] = useState<"users" | "outlets">("users");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: outlets, isLoading: loadingOutlets, refetch: refetchOutlets } = useQuery({
    queryKey: ["superadmin_outlets"],
    queryFn: () => fetchOutlets(),
  });

  const { data: users, isLoading: loadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["superadmin_users"],
    queryFn: () => fetchUsers(),
  });

  // Modal Add Outlet State
  const [showAddOutletModal, setShowAddOutletModal] = useState(false);
  const [outletName, setOutletName] = useState("");
  const [outletCode, setOutletCode] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [kasirPin, setKasirPin] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [savingOutlet, setSavingOutlet] = useState(false);

  // Modal Add User State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "kasir">("kasir");
  const [userPin, setUserPin] = useState("");
  const [userOutletId, setUserOutletId] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  // Modal Edit PIN State
  const [editStaff, setEditStaff] = useState<{ id: string; name: string; currentPin: string } | null>(null);
  const [newPinVal, setNewPinVal] = useState("");
  const [updatingPin, setUpdatingPin] = useState(false);

  const handleRefreshAll = () => {
    refetchOutlets();
    refetchUsers();
    toast.success("Data berhasil diperbarui");
  };

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOutlet(true);
    try {
      await doCreateOutlet({
        data: {
          name: outletName,
          code: outletCode,
          adminPin,
          kasirPin,
          address: address || undefined,
          phone: phone || undefined,
        },
      });
      toast.success(`Outlet ${outletName} berhasil dibuat!`);
      setOutletName("");
      setOutletCode("");
      setAdminPin("");
      setKasirPin("");
      setAddress("");
      setPhone("");
      setShowAddOutletModal(false);
      handleRefreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat outlet");
    } finally {
      setSavingOutlet(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userOutletId) {
      toast.error("Pilih outlet untuk user ini");
      return;
    }
    setSavingUser(true);
    try {
      await doCreateUser({
        data: {
          name: userName,
          role: userRole,
          pin: userPin,
          outletId: userOutletId,
        },
      });
      toast.success(`User ${userName} berhasil ditambahkan! PIN: ${userPin}`);
      setUserName("");
      setUserPin("");
      setShowAddUserModal(false);
      handleRefreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat user");
    } finally {
      setSavingUser(false);
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
      handleRefreshAll();
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

  const filteredUsers = (users ?? []).filter((u) => {
    if (u.role === "super_admin") return false; // hide super admin from pin table
    const outletName = Array.isArray(u.outlets) ? u.outlets[0]?.name : u.outlets?.name;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.pin && u.pin.includes(q)) ||
      (outletName && outletName.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

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
            <h1 className="text-2xl font-extrabold text-white">Kelola User & Outlet Terhubung</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition border border-slate-700"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>

          <button
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl text-sm font-extrabold transition shadow-lg"
          >
            <UserPlus className="h-5 w-5" /> Tambah User Baru
          </button>

          <button
            onClick={() => setShowAddOutletModal(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl text-sm font-extrabold transition shadow-lg"
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
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === "users"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <Users className="h-4 w-4" /> Kelola Seluruh User & PIN ({(users ?? []).filter((u) => u.role !== "super_admin").length})
            </button>
            <button
              onClick={() => setActiveTab("outlets")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === "outlets"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <Store className="h-4 w-4" /> Daftar Outlet Terdaftar ({(outlets ?? []).length})
            </button>
          </div>

          {activeTab === "users" && (
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, PIN, atau outlet..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}
        </div>

        {/* TAB 1: USERS & PIN TABLE */}
        {activeTab === "users" && (
          <div className="bg-slate-800 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-700/80 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Daftar Seluruh User & PIN Login</h2>
                <p className="text-xs text-slate-400">
                  Super Admin menentukan PIN unik untuk menghubungkan antara Admin Kasir (Stok) dan Kasir (POS) di setiap outlet.
                </p>
              </div>
            </div>

            {loadingUsers ? (
              <div className="p-8 text-center text-slate-400">Memuat data user...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Users className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <p>Tidak ada user ditemukan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-200">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[11px] tracking-wider font-extrabold border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4">Nama User</th>
                      <th className="px-6 py-4">Peran (Role)</th>
                      <th className="px-6 py-4">Outlet Terhubung</th>
                      <th className="px-6 py-4">PIN Login (Unik)</th>
                      <th className="px-6 py-4 text-right">Aksi Super Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60 font-medium">
                    {filteredUsers.map((u) => {
                      const outletData = Array.isArray(u.outlets) ? u.outlets[0] : u.outlets;
                      const isAdminRole = u.role === "admin";

                      return (
                        <tr key={u.id} className="hover:bg-slate-700/40 transition">
                          <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                            <div
                              className={`h-9 w-9 rounded-xl grid place-items-center font-black text-sm ${
                                isAdminRole
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            {u.name}
                          </td>

                          <td className="px-6 py-4">
                            {isAdminRole ? (
                              <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-extrabold px-3 py-1 rounded-full">
                                <ShieldCheck className="h-3.5 w-3.5" /> Admin Kasir (Kelola Stok)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold px-3 py-1 rounded-full">
                                <Users className="h-3.5 w-3.5" /> Kasir (POS & Display)
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-slate-300 font-semibold">
                            {outletData?.name ? (
                              <span className="flex items-center gap-1.5">
                                <Store className="h-4 w-4 text-amber-400 shrink-0" />
                                {outletData.name} ({outletData.code})
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Belum terhubung outlet</span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <span className="font-mono bg-slate-900 text-amber-300 font-extrabold px-3 py-1.5 rounded-xl border border-amber-500/40 text-base">
                              {u.pin ?? "—"}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setEditStaff({ id: u.id, name: u.name, currentPin: u.pin ?? "" })}
                              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-amber-400 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition border border-slate-700"
                            >
                              <Key className="h-3.5 w-3.5" /> Edit PIN
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OUTLETS GRID */}
        {activeTab === "outlets" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Daftar Toko / Outlet Terhubung</h2>
                <p className="text-xs text-slate-400">
                  Setiap outlet terisolasi penuh. Admin Kasir mengelola stok outlet, Kasir melayani POS & Display.
                </p>
              </div>
              <button
                onClick={() => setShowAddOutletModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-xs shadow-lg"
              >
                + Tambah Outlet
              </button>
            </div>

            {loadingOutlets ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 bg-slate-800/50 animate-pulse rounded-3xl border border-slate-800" />
                ))}
              </div>
            ) : (outlets ?? []).length === 0 ? (
              <div className="text-center py-16 bg-slate-800/40 rounded-3xl border border-slate-800">
                <Store className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <p className="text-slate-400">Belum ada outlet terdaftar.</p>
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
                                >
                                  <Key className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Add User */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Tambah User / Petugas Baru</h3>
            <p className="text-xs text-slate-400 mb-6">
              Buatkan user dan PIN unik untuk dihubungkan ke outlet tertentu.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama User</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Contoh: Budi Kenangan"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Pilih Outlet</label>
                <select
                  value={userOutletId}
                  onChange={(e) => setUserOutletId(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Pilih Toko / Outlet --</option>
                  {(outlets ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Peran (Role)</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as "admin" | "kasir")}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="admin">Admin Kasir (Stok)</option>
                    <option value="kasir">Kasir (POS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1">PIN Login (Unik)</label>
                  <input
                    type="text"
                    value={userPin}
                    onChange={(e) => setUserPin(e.target.value)}
                    placeholder="Contoh: 5555"
                    required
                    className="w-full bg-slate-900 border border-amber-500/40 rounded-xl py-2.5 px-3.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl text-sm shadow-lg disabled:opacity-50"
                >
                  {savingUser ? "Menyimpan..." : "Simpan User & PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Outlet */}
      {showAddOutletModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-xl font-extrabold text-white mb-1">Tambah Outlet Baru</h3>
            <p className="text-xs text-slate-400 mb-6">
              Sistem akan otomatis membuatkan Admin Kasir & Kasir beserta PIN unik untuk outlet ini.
            </p>

            <form onSubmit={handleCreateOutlet} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Outlet / Toko</label>
                <input
                  type="text"
                  value={outletName}
                  onChange={(e) => setOutletName(e.target.value)}
                  placeholder="Contoh: Kopi Kenangan"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Kode Unik Outlet</label>
                <input
                  type="text"
                  value={outletCode}
                  onChange={(e) => setOutletCode(e.target.value.toUpperCase())}
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

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddOutletModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingOutlet}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl text-sm shadow-lg disabled:opacity-50"
                >
                  {savingOutlet ? "Menyimpan..." : "Simpan Outlet"}
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
