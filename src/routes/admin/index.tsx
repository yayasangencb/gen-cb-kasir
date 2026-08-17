import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Eye,
  Key,
  Layers,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getCurrentSuperAdmin, logoutSession } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import {
  createTenant,
  extendTenantExpiry,
  getSuperAdminDashboardData,
  listAuditLogs,
  listPackages,
  listTenants,
  resetTenantPin,
  softDeleteTenant,
} from "@/lib/pos.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Super Admin Dashboard — GEN-CB Kasir" }] }),
  beforeLoad: async () => {
    const adminSession = await getCurrentSuperAdmin();
    if (!adminSession) throw redirect({ to: "/admin/login" });
    return { adminSession };
  },
  component: SuperAdminDashboardPage,
});

function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const fetchDashboard = useServerFn(getSuperAdminDashboardData);
  const fetchTenants = useServerFn(listTenants);
  const fetchPackages = useServerFn(listPackages);
  const fetchLogs = useServerFn(listAuditLogs);

  const doLogout = useServerFn(logoutSession);
  const doCreateTenant = useServerFn(createTenant);
  const doExtendExpiry = useServerFn(extendTenantExpiry);
  const doResetPin = useServerFn(resetTenantPin);
  const doDeleteTenant = useServerFn(softDeleteTenant);

  const { data: dashData, isLoading: loadingDash, refetch: refetchDash } = useQuery({
    queryKey: ["superadmin-dash"],
    queryFn: () => fetchDashboard({}),
  });

  const { data: tenantList, refetch: refetchTenants } = useQuery({
    queryKey: ["superadmin-tenants"],
    queryFn: () => fetchTenants({}),
  });

  const { data: packages } = useQuery({
    queryKey: ["superadmin-packages"],
    queryFn: () => fetchPackages({}),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ["superadmin-audit"],
    queryFn: () => fetchLogs({}),
  });

  const [activeTab, setActiveTab] = useState<"tenants" | "packages" | "audit">("tenants");
  const [q, setQ] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTenantResult, setNewTenantResult] = useState<any>(null);

  // Form State for Add Tenant
  const [bName, setBName] = useState("");
  const [oName, setOName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [bType, setBType] = useState("Coffee Shop");
  const [pkgId, setPkgId] = useState("");
  const [duration, setDuration] = useState(12);
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    await doLogout({});
    toast.success("Berhasil keluar dari Super Admin");
    navigate({ to: "/admin/login" });
  };

  const handleAddTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bName.trim() || !oName.trim() || !phone.trim()) {
      toast.error("Nama Usaha, Nama Pemilik, dan No. WhatsApp wajib diisi");
      return;
    }

    setBusy(true);
    try {
      const res = await doCreateTenant({
        data: {
          business_name: bName,
          owner_name: oName,
          phone,
          email: email || undefined,
          address: address || undefined,
          city: city || undefined,
          business_type: bType,
          package_id: pkgId || undefined,
          duration_months: duration,
        },
      });

      toast.success(`UKM "${bName}" Berhasil Dibuat!`);
      setNewTenantResult(res);
      setShowAddModal(false);
      // Reset form
      setBName("");
      setOName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setCity("");
      refetchDash();
      refetchTenants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat UKM baru");
    } finally {
      setBusy(false);
    }
  };

  const handleExtend = async (id: string, name: string) => {
    if (!confirm(`Perpanjang masa aktif "${name}" selama 12 bulan (+1 tahun)?`)) return;
    try {
      await doExtendExpiry({ data: { tenant_id: id, add_months: 12 } });
      toast.success(`Masa aktif "${name}" berhasil diperpanjang +1 tahun`);
      refetchDash();
      refetchTenants();
    } catch (err) {
      toast.error("Gagal memperpanjang masa aktif");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`YAKIN INGIN MENONAKTIFKAN/MENGHAPUS TENANT "${name}"?\nData transaksi tidak akan terhapus permanen.`)) return;
    try {
      await doDeleteTenant({ data: { tenant_id: id } });
      toast.success(`UKM "${name}" dinonaktifkan`);
      refetchDash();
      refetchTenants();
    } catch (err) {
      toast.error("Gagal menghapus tenant");
    }
  };

  const filteredTenants = (tenantList ?? []).filter((t: any) => {
    if (!q) return true;
    const term = q.toLowerCase();
    return (
      t.business_name.toLowerCase().includes(term) ||
      t.tenant_code.toLowerCase().includes(term) ||
      t.owner_name.toLowerCase().includes(term) ||
      t.phone.includes(term)
    );
  });

  const stats = dashData?.stats;

  return (
    <div className="min-h-screen bg-[color:var(--bg-soft,#F7F9FC)] font-sans">
      {/* Super Admin Topbar Header */}
      <header
        className="sticky top-0 z-30 shadow-md text-white border-b border-white/10"
        style={{ background: "linear-gradient(135deg, #002B7F 0%, #0047B3 100%)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-[#FF7A00] to-[#FFB000] text-white font-black text-lg shadow-md">
              GEN
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-blue-200 font-extrabold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#FFB000]" /> Super Admin SaaS Suite
              </div>
              <div className="text-lg font-black tracking-tight">GEN CB KASIR MULTI-TENANT</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold hover:bg-red-500/20 hover:text-red-200 transition active:scale-95 border border-white/20"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-6">
          <StatCard
            label="Total UKM"
            val={stats?.totalTenants ?? 0}
            icon={Store}
            color="bg-blue-500/10 text-blue-600"
          />
          <StatCard
            label="UKM Aktif"
            val={stats?.activeTenantsCount ?? 0}
            icon={CheckCircle2}
            color="bg-emerald-500/10 text-emerald-600"
          />
          <StatCard
            label="UKM Nonaktif"
            val={stats?.inactiveTenantsCount ?? 0}
            icon={AlertTriangle}
            color="bg-red-500/10 text-red-600"
          />
          <StatCard
            label="Kasir Terdaftar"
            val={stats?.totalKasir ?? 0}
            icon={Users}
            color="bg-purple-500/10 text-purple-600"
          />
          <StatCard
            label="Total Omzet Sistem"
            val={rupiah(stats?.totalOmzet ?? 0)}
            icon={DollarSign}
            color="bg-amber-500/10 text-amber-600"
            isWide
          />
          <StatCard
            label="Device / Display"
            val={stats?.activeDevicesCount ?? 0}
            icon={Layers}
            color="bg-cyan-500/10 text-cyan-600"
          />
        </div>

        {/* Expiring Soon Alert Banner */}
        {dashData?.expiringSoonTenants && dashData.expiringSoonTenants.length > 0 && (
          <div className="rounded-3xl bg-amber-50 border-2 border-amber-300 p-4 sm:p-5 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-extrabold text-sm text-amber-900">
                Peringatan: {dashData.expiringSoonTenants.length} UKM Masa Aktif Hampir Habis (&lt; 7 Hari)
              </div>
              <p className="text-xs text-amber-800 font-medium">
                Tenant berikut membutuhkan perpanjangan masa aktif agar operasional kasir tetap dapat digunakan:{" "}
                {dashData.expiringSoonTenants.map((t: any) => `${t.business_name} (${t.tenant_code})`).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Header Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-sm border border-border/80">
          {/* Navigation Tabs */}
          <div className="flex rounded-2xl bg-secondary/80 p-1 font-bold text-xs">
            <button
              onClick={() => setActiveTab("tenants")}
              className={`rounded-xl px-4 py-2 transition ${
                activeTab === "tenants" ? "bg-[color:var(--brand)] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Manajemen UKM / Tenant ({tenantList?.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("packages")}
              className={`rounded-xl px-4 py-2 transition ${
                activeTab === "packages" ? "bg-[color:var(--brand)] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Paket Berlangganan ({packages?.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`rounded-xl px-4 py-2 transition ${
                activeTab === "audit" ? "bg-[color:var(--brand)] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Audit Log ({auditLogs?.length ?? 0})
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-orange inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black shadow-md transition active:scale-95"
          >
            <Plus className="h-4 w-4" /> Tambah UKM Baru
          </button>
        </div>

        {/* TAB 1: MANAJEMEN UKM / TENANTS */}
        {activeTab === "tenants" && (
          <div className="space-y-4">
            {/* Search Filter */}
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama usaha, kode tenant, atau pemilik..."
                className="w-full rounded-2xl border border-border bg-white py-2.5 pl-10 pr-4 text-xs font-semibold outline-none shadow-xs focus:border-[color:var(--brand)]"
              />
            </div>

            {/* Tenant Table */}
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-border/80">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground font-extrabold uppercase tracking-wider border-b border-border/60">
                    <tr>
                      <th className="px-4 py-3.5">Kode & Nama UKM</th>
                      <th className="px-4 py-3.5">Pemilik & WA</th>
                      <th className="px-4 py-3.5">Paket</th>
                      <th className="px-4 py-3.5">Masa Aktif</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground font-bold">
                          Belum ada UKM terdaftar dalam sistem.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((t: any) => {
                        const isExpired = new Date(t.expired_at) < new Date();
                        const isActive = t.status === "active" && !isExpired;

                        return (
                          <tr key={t.id} className="hover:bg-secondary/30 transition">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color:var(--brand)]/10 text-[color:var(--brand)] font-black text-xs">
                                  {t.tenant_code}
                                </div>
                                <div>
                                  <div className="font-extrabold text-sm text-[color:var(--brand-deep)]">{t.business_name}</div>
                                  <div className="text-[10px] text-muted-foreground font-semibold">{t.business_type} {t.city ? `• ${t.city}` : ""}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-foreground">{t.owner_name}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">{t.phone}</div>
                            </td>
                            <td className="px-4 py-3.5 font-bold text-[color:var(--brand)]">
                              {t.packages?.name ?? "Standard"}
                            </td>
                            <td className="px-4 py-3.5 font-semibold">
                              <div className={isExpired ? "text-red-600 font-bold" : "text-emerald-700"}>
                                {new Date(t.expired_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                  isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                                }`}
                              >
                                {isActive ? "Aktif" : isExpired ? "Expired" : "Nonaktif"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Link
                                  to="/admin/tenant/$id"
                                  params={{ id: t.id }}
                                  className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-1.5 text-[11px] font-extrabold text-[color:var(--brand-deep)] hover:bg-[color:var(--brand)]/10 transition"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Detail & PIN
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => handleExtend(t.id, t.business_name)}
                                  className="rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[11px] font-extrabold text-emerald-700 hover:bg-emerald-100 transition"
                                  title="+1 Tahun Masa Aktif"
                                >
                                  +1 Thn
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(t.id, t.business_name)}
                                  className="rounded-xl bg-red-50 p-1.5 text-red-600 hover:bg-red-100 transition"
                                  title="Hapus / Nonaktifkan Tenant"
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
        )}

        {/* TAB 2: PAKET BERLANGGANAN */}
        {activeTab === "packages" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(packages ?? []).map((p: any) => (
              <div key={p.id} className="rounded-3xl bg-white p-5 shadow-sm border border-border/80 space-y-3">
                <div className="text-xs uppercase font-extrabold tracking-wider text-[color:var(--brand)]">{p.name}</div>
                <div className="text-3xl font-black text-[color:var(--brand-deep)]">{rupiah(p.price)} <span className="text-xs text-muted-foreground font-normal">/bulan</span></div>
                <ul className="text-xs space-y-1.5 text-muted-foreground font-semibold border-t border-border pt-3">
                  <li>• Maksimal {p.max_cashiers} Kasir</li>
                  <li>• Maksimal {p.max_customer_displays} Display Depan Kasir</li>
                  <li>• Maksimal {p.max_queue_displays} Display Nomor Antrean</li>
                  <li>• Fitur: {JSON.stringify(p.features)}</li>
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: AUDIT LOG */}
        {activeTab === "audit" && (
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm border border-border/80 p-4">
            <div className="font-extrabold text-sm mb-3">Catatan Aktivitas Super Admin</div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {(auditLogs ?? []).map((l: any) => (
                <div key={l.id} className="rounded-2xl bg-secondary/50 p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-foreground">{l.action}</span> - <span className="text-muted-foreground">{l.actor_email}</span>
                    <div className="text-[10px] text-muted-foreground font-mono">{JSON.stringify(l.metadata)}</div>
                  </div>
                  <div className="text-[10px] font-semibold text-muted-foreground">{new Date(l.created_at).toLocaleString("id-ID")}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal Result PINs when a new UKM is created */}
      {newTenantResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-black text-[color:var(--brand-deep)]">UKM Berhasil Didaftarkan!</h2>
              <p className="text-xs text-muted-foreground font-medium">
                Salin PIN akses berikut dan berikan kepada pengelola {newTenantResult.tenant.business_name}.
              </p>
            </div>

            <div className="rounded-2xl bg-secondary/70 p-4 space-y-2.5 text-xs font-bold">
              <div className="flex justify-between items-center border-b border-border/60 pb-2">
                <span className="text-muted-foreground">Kode Tenant:</span>
                <span className="text-sm font-black text-[color:var(--brand)] font-mono">{newTenantResult.tenant.tenant_code}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">PIN Admin Kasir:</span>
                <span className="font-mono text-sm font-black text-foreground">{newTenantResult.pins.admin_pin}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">PIN Kasir POS:</span>
                <span className="font-mono text-sm font-black text-foreground">{newTenantResult.pins.cashier_pin}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">PIN Display Depan Kasir:</span>
                <span className="font-mono text-sm font-black text-foreground">{newTenantResult.pins.customer_display_pin}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">PIN Display Antrean:</span>
                <span className="font-mono text-sm font-black text-foreground">{newTenantResult.pins.queue_display_pin}</span>
              </div>
            </div>

            <button
              onClick={() => setNewTenantResult(null)}
              className="w-full btn-brand rounded-2xl py-3.5 text-xs font-black shadow-md"
            >
              Tutup &amp; Simpan Data
            </button>
          </div>
        </div>
      )}

      {/* Modal Add UKM */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="font-black text-lg text-[color:var(--brand-deep)]">Tambah UKM / Tenant Baru</div>
              <button onClick={() => setShowAddModal(false)} className="rounded-xl p-1 text-muted-foreground hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddTenantSubmit} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block text-muted-foreground mb-1">Nama Usaha / Toko *</label>
                <input
                  required
                  value={bName}
                  onChange={(e) => setBName(e.target.value)}
                  placeholder="Contoh: Kopi Kenangan Cabang A"
                  className="w-full rounded-xl border border-border p-3 outline-none focus:border-[color:var(--brand)] font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-muted-foreground mb-1">Nama Pemilik / Owner *</label>
                  <input
                    required
                    value={oName}
                    onChange={(e) => setOName(e.target.value)}
                    placeholder="Contoh: Bu Ani"
                    className="w-full rounded-xl border border-border p-3 outline-none focus:border-[color:var(--brand)]"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">No. WhatsApp *</label>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full rounded-xl border border-border p-3 outline-none focus:border-[color:var(--brand)] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-muted-foreground mb-1">Email Pemilik (Opsional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@gmail.com"
                    className="w-full rounded-xl border border-border p-3 outline-none focus:border-[color:var(--brand)]"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Jenis Usaha</label>
                  <select
                    value={bType}
                    onChange={(e) => setBType(e.target.value)}
                    className="w-full rounded-xl border border-border p-3 outline-none focus:border-[color:var(--brand)] font-bold"
                  >
                    <option value="Coffee Shop">Coffee Shop</option>
                    <option value="Warung / Kantin">Warung / Kantin</option>
                    <option value="Resto / Cafe">Resto / Cafe</option>
                    <option value="Toko Kelontong">Toko Kelontong</option>
                    <option value="UMKM Kuliner">UMKM Kuliner</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Kota / Lokasi</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Contoh: Jakarta Selatan"
                  className="w-full rounded-xl border border-border p-3 outline-none focus:border-[color:var(--brand)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-muted-foreground mb-1">Paket Berlangganan</label>
                  <select
                    value={pkgId}
                    onChange={(e) => setPkgId(e.target.value)}
                    className="w-full rounded-xl border border-border p-3 outline-none focus:border-[color:var(--brand)] font-bold text-[color:var(--brand)]"
                  >
                    <option value="">Pilih Paket...</option>
                    {(packages ?? []).map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({rupiah(p.price)}/bln)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Masa Aktif Awal</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-border p-3 outline-none focus:border-[color:var(--brand)] font-bold"
                  >
                    <option value={1}>1 Bulan</option>
                    <option value={3}>3 Bulan</option>
                    <option value={6}>6 Bulan</option>
                    <option value={12}>12 Bulan (1 Tahun)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-2xl bg-secondary px-5 py-3 font-bold text-muted-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-orange rounded-2xl px-6 py-3 font-black shadow-md disabled:opacity-50"
                >
                  {busy ? "Memproses..." : "Buat &amp; Generate PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, val, icon: Icon, color, isWide = false }: { label: string; val: any; icon: any; color: string; isWide?: boolean }) {
  return (
    <div className={`rounded-3xl bg-white p-4 shadow-sm border border-border/80 space-y-1 ${isWide ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`grid h-8 w-8 place-items-center rounded-2xl ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-xl sm:text-2xl font-black text-[color:var(--brand-deep)]">{val}</div>
    </div>
  );
}
