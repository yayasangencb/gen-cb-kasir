import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Key,
  Layers,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Smartphone,
  Store,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { rupiah } from "@/lib/format";
import { getCurrentStaff, loginSuperAdmin, logout } from "@/lib/auth.functions";
import {
  createTenantAccount,
  getSuperAdminDashboardMetrics,
  getTenantDetailsSuperAdmin,
  resetAccessPin,
  updateTenantStatus,
} from "@/lib/tenant.server";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Super Admin Platform — Gen CB Kasir" }] }),
  loader: async () => {
    const staff = await getCurrentStaff();
    return { staff };
  },
  component: SuperAdminPage,
});

function SuperAdminPage() {
  const staff = Route.useLoaderData().staff;
  const doLoginSuperAdmin = useServerFn(loginSuperAdmin);
  const doLogout = useServerFn(logout);
  const fetchMetrics = useServerFn(getSuperAdminDashboardMetrics);
  const createTenant = useServerFn(createTenantAccount);
  const fetchTenantDetails = useServerFn(getTenantDetailsSuperAdmin);
  const updateStatus = useServerFn(updateTenantStatus);
  const doResetPin = useServerFn(resetAccessPin);

  // Auth form state
  const [email, setEmail] = useState("yayasangencb@gmail.com");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  // Modal & Search state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "pins" | "transactions" | "logs">("overview");
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");

  // New Tenant Form State
  const [newTenant, setNewTenant] = useState({
    name: "",
    slug: "",
    owner_name: "",
    owner_email: "",
    owner_whatsapp: "",
    address: "",
    city: "",
    duration_days: 30,
  });
  const [createdPins, setCreatedPins] = useState<any | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  // Queries: Allow both Super Admin and Admin Kasir (PIN 1234) to access platform management
  const isSuperAdmin = Boolean(
    staff?.isSuperAdmin || staff?.role === "super_admin" || staff?.role === "admin" || staff?.role === "tenant_admin",
  );

  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: ["super-admin-metrics"],
    queryFn: () => fetchMetrics({}),
    enabled: isSuperAdmin,
    refetchInterval: 5000,
  });

  const { data: tenantDetail, refetch: refetchDetail } = useQuery({
    queryKey: ["super-admin-tenant-detail", selectedTenantId],
    queryFn: () => fetchTenantDetails({ data: { tenant_id: selectedTenantId! } }),
    enabled: Boolean(isSuperAdmin && selectedTenantId),
  });

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email dan password wajib diisi");
      return;
    }
    setLoginBusy(true);
    try {
      const res = await doLoginSuperAdmin({ data: { email, password } });
      if (res.ok) {
        toast.success("Login Super Admin Berhasil!");
        window.location.reload();
      } else {
        toast.error(res.error || "Login gagal: Email atau password tidak sesuai");
      }
    } catch (err: any) {
      let msg = "Gagal login Super Admin";
      if (typeof err?.message === "string") {
        if (err.message.includes("6 character")) {
          msg = "Password Super Admin minimal 6 karakter";
        } else {
          msg = err.message;
        }
      }
      toast.error(msg);
    } finally {
      setLoginBusy(false);
    }
  };

  const handleCreateTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenant.name || !newTenant.slug || !newTenant.owner_name) {
      toast.error("Nama toko, slug, dan nama pemilik wajib diisi");
      return;
    }
    setCreateBusy(true);
    try {
      const res = await createTenant({
        data: {
          name: newTenant.name,
          slug: newTenant.slug,
          owner_name: newTenant.owner_name,
          owner_email: newTenant.owner_email || undefined,
          owner_whatsapp: newTenant.owner_whatsapp || undefined,
          address: newTenant.address || undefined,
          city: newTenant.city || undefined,
          duration_days: Number(newTenant.duration_days) || 30,
        },
      });
      if (res.ok) {
        toast.success("Tenant UKM Baru Berhasil Dibuat!");
        setCreatedPins(res.pins);
        refetch();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat tenant");
    } finally {
      setCreateBusy(false);
    }
  };

  const handleStatusToggle = async (tenantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await updateStatus({ data: { tenant_id: tenantId, status: nextStatus as any } });
      toast.success(`Status tenant diperbarui ke ${nextStatus}`);
      refetch();
      if (selectedTenantId) refetchDetail();
    } catch (err) {
      toast.error("Gagal mengubah status tenant");
    }
  };

  const handleResetPin = async (type: "member" | "device", id: string, name: string) => {
    if (!confirm(`Reset PIN untuk ${name}? PIN lama tidak akan berlaku lagi.`)) return;
    try {
      const res = await doResetPin({ data: { type, id } });
      toast.success(`PIN ${name} berhasil di-reset: ${res.newPin}`);
      if (selectedTenantId) refetchDetail();
    } catch (err) {
      toast.error("Gagal mereset PIN");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} berhasil disalin!`);
  };

  // 1. Render Login Screen if not Super Admin
  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[color:var(--brand)] text-white shadow-lg">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black text-[color:var(--brand-deep)]">Portal Super Admin</h1>
            <p className="mt-1 text-xs text-muted-foreground font-medium">Platform POS Multi-Tenant Gen CB Kasir</p>
          </div>

          <form onSubmit={handleSuperAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">Email Super Admin</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yayasangencb@gmail.com"
                className="w-full rounded-2xl border border-border bg-secondary/30 p-3.5 text-sm font-semibold outline-none focus:border-[color:var(--brand)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1">Password Super Admin</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-2xl border border-border bg-secondary/30 p-3.5 text-sm font-semibold outline-none focus:border-[color:var(--brand)]"
              />
            </div>
            <button
              type="submit"
              disabled={loginBusy}
              className="btn-brand w-full rounded-2xl py-4 text-sm font-extrabold shadow-md disabled:opacity-50"
            >
              {loginBusy ? "Memverifikasi..." : "Masuk ke Dashboard Platform"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/login" className="text-xs font-bold text-muted-foreground hover:text-[color:var(--brand)] transition">
              ← Kembali ke Login PIN Petugas Kasir
            </a>
          </div>
        </div>
      </div>
    );
  }

  const filteredTenants = (metrics?.tenants ?? []).filter(
    (t) =>
      t.name.toLowerCase().includes(q.toLowerCase()) ||
      t.slug.toLowerCase().includes(q.toLowerCase()) ||
      t.status.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell staff={{ id: "super_admin", name: "Super Admin Platform", role: "admin" }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-border/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-[color:var(--brand)]/10 px-2.5 py-1 text-[11px] font-extrabold text-[color:var(--brand)]">
                SUPER ADMIN
              </span>
              <h1 className="text-2xl font-black text-[color:var(--brand-deep)]">Platform Dashboard SaaS</h1>
            </div>
            <p className="mt-1 text-xs text-muted-foreground font-medium">
              Pengelolaan tenant UKM, perangkat POS, dan lisensi subscription seluruh platform.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setNewTenant({
                  name: "",
                  slug: "",
                  owner_name: "",
                  owner_email: "",
                  owner_whatsapp: "",
                  address: "",
                  city: "",
                  duration_days: 30,
                });
                setCreatedPins(null);
                setShowCreateModal(true);
              }}
              className="btn-brand inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-extrabold shadow-sm transition active:scale-95"
            >
              <Plus className="h-4 w-4" /> Tambah UKM / Tenant Baru
            </button>
            <button
              onClick={async () => {
                await doLogout({});
                window.location.href = "/admin";
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-secondary px-4 py-3 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-red-50 transition"
            >
              <LogOut className="h-4 w-4" /> Keluar
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-xs ring-1 ring-border/80">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Total Tenant UKM</span>
              <Building2 className="h-5 w-5 text-[color:var(--brand)]" />
            </div>
            <div className="mt-2 text-3xl font-black text-[color:var(--brand-deep)]">{metrics?.totalTenants ?? 0}</div>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> {metrics?.activeTenants ?? 0} Aktif
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-xs ring-1 ring-border/80">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Perangkat Aktif</span>
              <Smartphone className="h-5 w-5 text-[color:var(--orange)]" />
            </div>
            <div className="mt-2 text-3xl font-black text-[color:var(--brand-deep)]">{metrics?.activeDevices ?? 0}</div>
            <div className="mt-1 text-[11px] font-semibold text-muted-foreground">
              Kasir: {metrics?.cashierCount ?? 0} | Admin: {metrics?.adminCount ?? 0}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-xs ring-1 ring-border/80">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Omzet Platform</span>
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700">{rupiah(metrics?.totalRevenue ?? 0)}</div>
            <div className="mt-1 text-[11px] font-semibold text-muted-foreground">
              Total {metrics?.totalTransactions ?? 0} Transaksi
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-xs ring-1 ring-border/80">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase tracking-wider">Transaksi Hari Ini</span>
              <Activity className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="mt-2 text-3xl font-black text-indigo-900">{metrics?.todayTransactions ?? 0}</div>
            <div className="mt-1 text-[11px] font-semibold text-muted-foreground">Realtime platform</div>
          </div>
        </div>

        {/* Tenant Management Table */}
        <div className="rounded-3xl bg-white p-6 shadow-xs ring-1 ring-border/80">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[color:var(--brand-deep)]">Daftar Tenant UKM / Toko</h2>
              <p className="text-xs text-muted-foreground">Semua toko beroperasi terisolasi dengan database Supabase RLS.</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari tenant..."
                className="w-full rounded-2xl border border-border bg-secondary/50 py-2 pl-9 pr-3 text-xs font-semibold outline-none focus:border-[color:var(--brand)]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-bold">
                  <th className="px-4 py-3">Nama UKM & Slug</th>
                  <th className="px-4 py-3">Pemilik & Kontak</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Masa Aktif</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Memuat data tenant...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Belum ada tenant terdaftar
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-secondary/20 transition">
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-sm text-[color:var(--brand-deep)]">{t.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">slug: {t.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{t.owner_name || "-"}</div>
                        <div className="text-[11px] text-muted-foreground">{t.owner_whatsapp || t.owner_email || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            t.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {t.status === "active" ? "Aktif" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t.valid_until ? new Date(t.valid_until).toLocaleDateString("id-ID") : "Selamanya"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedTenantId(t.id);
                              setActiveTab("overview");
                            }}
                            className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-[color:var(--brand-deep)] hover:bg-[color:var(--brand)]/10 transition"
                          >
                            Detail & PIN
                          </button>
                          <button
                            onClick={() => handleStatusToggle(t.id, t.status)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                              t.status === "active"
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {t.status === "active" ? "Bekukan" : "Aktifkan"}
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

        {/* Activity Logs */}
        <div className="rounded-3xl bg-white p-6 shadow-xs ring-1 ring-border/80">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-[color:var(--brand-deep)] flex items-center gap-2">
              <Activity className="h-4 w-4 text-[color:var(--brand)]" /> Activity Log Platform Terbaru
            </h3>
            <button onClick={() => refetch()} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
            {(metrics?.recentLogs ?? []).map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl bg-secondary/50 p-2.5 border border-border/40">
                <div>
                  <span className="font-bold text-foreground">{l.action}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground font-mono">actor: {l.actor_type}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(l.created_at).toLocaleTimeString("id-ID")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CREATE TENANT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-black text-[color:var(--brand-deep)]">Tambah Tenant UKM Baru</h2>
              <button onClick={() => setShowCreateModal(false)} className="rounded-xl p-1.5 hover:bg-secondary text-muted-foreground">
                ✕
              </button>
            </div>

            {createdPins ? (
              <div className="space-y-4 py-2">
                <div className="rounded-2xl bg-emerald-50 p-4 text-center border border-emerald-200">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                  <div className="text-base font-extrabold text-emerald-900">Tenant Berhasil Dibuat!</div>
                  <p className="text-xs text-emerald-700 mt-1">Salin PIN akses perangkat di bawah ini untuk tenant:</p>
                </div>

                <div className="space-y-2 rounded-2xl bg-secondary/60 p-4 border border-border text-xs">
                  <div className="flex items-center justify-between p-2 bg-white rounded-xl shadow-2xs">
                    <div>
                      <div className="font-bold text-foreground">Admin Kasir (Manager)</div>
                      <div className="text-[11px] text-muted-foreground">PIN: <b className="font-mono text-emerald-700">{createdPins.adminPin}</b></div>
                    </div>
                    <button onClick={() => copyToClipboard(createdPins.adminPin, "PIN Admin Kasir")} className="btn-brand p-1.5 rounded-lg text-[10px]">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-white rounded-xl shadow-2xs">
                    <div>
                      <div className="font-bold text-foreground">Kasir POS</div>
                      <div className="text-[11px] text-muted-foreground">PIN: <b className="font-mono text-emerald-700">{createdPins.cashierPin}</b></div>
                    </div>
                    <button onClick={() => copyToClipboard(createdPins.cashierPin, "PIN Kasir")} className="btn-brand p-1.5 rounded-lg text-[10px]">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-white rounded-xl shadow-2xs">
                    <div>
                      <div className="font-bold text-foreground">Display Depan Kasir</div>
                      <div className="text-[11px] text-muted-foreground">PIN: <b className="font-mono text-emerald-700">{createdPins.customerPin}</b></div>
                    </div>
                    <button onClick={() => copyToClipboard(createdPins.customerPin, "PIN Display Depan")} className="btn-brand p-1.5 rounded-lg text-[10px]">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-white rounded-xl shadow-2xs">
                    <div>
                      <div className="font-bold text-foreground">Display Nomor Antrean</div>
                      <div className="text-[11px] text-muted-foreground">PIN: <b className="font-mono text-emerald-700">{createdPins.queuePin}</b></div>
                    </div>
                    <button onClick={() => copyToClipboard(createdPins.queuePin, "PIN Display Antrean")} className="btn-brand p-1.5 rounded-lg text-[10px]">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatedPins(null);
                  }}
                  className="btn-brand w-full rounded-2xl py-3.5 text-xs font-extrabold shadow-sm"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateTenantSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Nama UKM / Toko *</label>
                  <input
                    required
                    value={newTenant.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
                      setNewTenant({ ...newTenant, name, slug });
                    }}
                    placeholder="Contoh: Kopi Kenangan"
                    className="w-full rounded-2xl border border-border p-3 text-xs font-semibold outline-none focus:border-[color:var(--brand)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Slug URL *</label>
                  <input
                    required
                    value={newTenant.slug}
                    onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
                    placeholder="kopi-kenangan"
                    className="w-full rounded-2xl border border-border p-3 text-xs font-mono outline-none focus:border-[color:var(--brand)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">Nama Pemilik *</label>
                    <input
                      required
                      value={newTenant.owner_name}
                      onChange={(e) => setNewTenant({ ...newTenant, owner_name: e.target.value })}
                      placeholder="Budi Santoso"
                      className="w-full rounded-2xl border border-border p-3 text-xs outline-none focus:border-[color:var(--brand)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1">No. WhatsApp</label>
                    <input
                      value={newTenant.owner_whatsapp}
                      onChange={(e) => setNewTenant({ ...newTenant, owner_whatsapp: e.target.value })}
                      placeholder="08123456789"
                      className="w-full rounded-2xl border border-border p-3 text-xs outline-none focus:border-[color:var(--brand)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">Masa Aktif Subscription (Hari)</label>
                  <select
                    value={newTenant.duration_days}
                    onChange={(e) => setNewTenant({ ...newTenant, duration_days: Number(e.target.value) })}
                    className="w-full rounded-2xl border border-border p-3 text-xs font-semibold outline-none focus:border-[color:var(--brand)]"
                  >
                    <option value={30}>30 Hari (1 Bulan)</option>
                    <option value={90}>90 Hari (3 Bulan)</option>
                    <option value={365}>365 Hari (1 Tahun)</option>
                    <option value={3650}>3650 Hari (10 Tahun / Permanen)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={createBusy}
                    className="btn-brand w-full rounded-2xl py-3.5 text-xs font-extrabold shadow-sm disabled:opacity-50"
                  >
                    {createBusy ? "Membuat Tenant..." : "Buat Tenant Baru"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TENANT DETAIL & ACCESS PIN MODAL */}
      {selectedTenantId && tenantDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-xl font-black text-[color:var(--brand-deep)]">{tenantDetail.tenant?.name}</h2>
                <div className="text-xs text-muted-foreground font-mono">slug: {tenantDetail.tenant?.slug}</div>
              </div>
              <button onClick={() => setSelectedTenantId(null)} className="rounded-xl p-1.5 hover:bg-secondary text-muted-foreground">
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-2 border-b border-border/60 pb-2">
              <button
                onClick={() => setActiveTab("overview")}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                  activeTab === "overview" ? "bg-[color:var(--brand-deep)] text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                Ringkasan Toko
              </button>
              <button
                onClick={() => setActiveTab("pins")}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                  activeTab === "pins" ? "bg-[color:var(--brand-deep)] text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                Access & Device PINs
              </button>
              <button
                onClick={() => setActiveTab("transactions")}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                  activeTab === "transactions" ? "bg-[color:var(--brand-deep)] text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                Transaksi Terbaru
              </button>
            </div>

            {activeTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="rounded-2xl bg-secondary/50 p-4 border border-border space-y-2">
                  <div className="font-bold text-foreground">Info Pemilik</div>
                  <div>Pemilik: <b className="text-foreground">{tenantDetail.tenant?.owner_name}</b></div>
                  <div>WhatsApp: <b className="text-foreground">{tenantDetail.tenant?.owner_whatsapp || "-"}</b></div>
                  <div>Email: <b className="text-foreground">{tenantDetail.tenant?.owner_email || "-"}</b></div>
                </div>
                <div className="rounded-2xl bg-secondary/50 p-4 border border-border space-y-2">
                  <div className="font-bold text-foreground">Katalog & Stok</div>
                  <div>Total Produk: <b className="text-foreground">{tenantDetail.products?.length ?? 0} item</b></div>
                  <div>Total Transaksi: <b className="text-foreground">{tenantDetail.transactions?.length ?? 0} kali</b></div>
                </div>
              </div>
            )}

            {activeTab === "pins" && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>PIN ini digunakan oleh staf / perangkat tenant untuk login ke sistem POS.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tenantDetail.members.map((m) => {
                    const pinKey = `m-${m.id}`;
                    const isVisible = visiblePins[pinKey];
                    const rawPin = m.encrypted_pin || m.pin_hash || "******";
                    return (
                      <div key={m.id} className="rounded-2xl bg-white p-4 border border-border shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-[color:var(--brand-deep)]">{m.name}</span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                            {m.role === "tenant_admin" ? "Admin Kasir" : "Kasir"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-2.5 text-xs font-mono font-bold">
                          <span>{isVisible ? rawPin : "••••••"}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setVisiblePins({ ...visiblePins, [pinKey]: !isVisible })}
                              className="p-1 text-muted-foreground hover:text-foreground"
                              title="Tampilkan PIN"
                            >
                              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(rawPin, `PIN ${m.name}`)}
                              className="p-1 text-muted-foreground hover:text-foreground"
                              title="Salin PIN"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleResetPin("member", m.id, m.name)}
                          className="w-full rounded-xl bg-secondary py-2 text-xs font-bold text-[color:var(--brand)] hover:bg-[color:var(--brand)]/10 transition"
                        >
                          Reset PIN
                        </button>
                      </div>
                    );
                  })}

                  {tenantDetail.devices.map((d) => {
                    const pinKey = `d-${d.id}`;
                    const isVisible = visiblePins[pinKey];
                    const rawPin = d.encrypted_pin || d.access_pin_hash || "******";
                    return (
                      <div key={d.id} className="rounded-2xl bg-white p-4 border border-border shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-[color:var(--brand-deep)]">{d.name}</span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                            {d.device_type === "customer_display" ? "Customer Display" : "Queue Display"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-2.5 text-xs font-mono font-bold">
                          <span>{isVisible ? rawPin : "••••••"}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setVisiblePins({ ...visiblePins, [pinKey]: !isVisible })}
                              className="p-1 text-muted-foreground hover:text-foreground"
                              title="Tampilkan PIN"
                            >
                              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(rawPin, `PIN ${d.name}`)}
                              className="p-1 text-muted-foreground hover:text-foreground"
                              title="Salin PIN"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleResetPin("device", d.id, d.name)}
                          className="w-full rounded-xl bg-secondary py-2 text-xs font-bold text-[color:var(--brand)] hover:bg-[color:var(--brand)]/10 transition"
                        >
                          Reset PIN
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "transactions" && (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-bold">
                      <th className="p-2.5">No. Transaksi</th>
                      <th className="p-2.5">Kasir</th>
                      <th className="p-2.5">Total</th>
                      <th className="p-2.5">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {tenantDetail.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="p-2.5 font-bold font-mono text-[color:var(--brand-deep)]">{tx.transaction_number}</td>
                        <td className="p-2.5">{tx.cashier_name}</td>
                        <td className="p-2.5 font-bold">{rupiah(Number(tx.grand_total))}</td>
                        <td className="p-2.5 text-muted-foreground">{new Date(tx.created_at).toLocaleString("id-ID")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
