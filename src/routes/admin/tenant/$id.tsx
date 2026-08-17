import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Store,
  Smartphone,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getCurrentSuperAdmin } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { getTenantDetailAdmin, resetTenantPin } from "@/lib/pos.functions";

export const Route = createFileRoute("/admin/tenant/$id")({
  head: () => ({ meta: [{ title: "Detail UKM & PIN Akses — GEN-CB Kasir" }] }),
  beforeLoad: async () => {
    const adminSession = await getCurrentSuperAdmin();
    if (!adminSession) throw redirect({ to: "/admin/login" });
    return { adminSession };
  },
  component: SuperAdminTenantDetailPage,
});

function SuperAdminTenantDetailPage() {
  const { id } = Route.useParams();
  const fetchDetail = useServerFn(getTenantDetailAdmin);
  const doResetPin = useServerFn(resetTenantPin);

  const { data: detailData, isLoading, refetch } = useQuery({
    queryKey: ["superadmin-tenant-detail", id],
    queryFn: () => fetchDetail({ data: { tenant_id: id } }),
  });

  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  const togglePinVisibility = (role: string) => {
    setVisiblePins((prev) => ({ ...prev, [role]: !prev[role] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} berhasil disalin ke clipboard!`);
  };

  const handleResetPin = async (role: "tenant_admin" | "cashier" | "customer_display" | "queue_display", roleLabel: string) => {
    if (!confirm(`Yakin ingin membuat PIN baru untuk ${roleLabel}? PIN lama akan langsung tidak berlaku.`)) return;

    try {
      const res = await doResetPin({ data: { tenant_id: id, role } });
      toast.success(`PIN ${roleLabel} berhasil diperbarui: ${res.newPin}`);
      refetch();
    } catch (err) {
      toast.error("Gagal memperbarui PIN");
    }
  };

  if (isLoading || !detailData) {
    return (
      <div className="min-h-screen grid place-items-center bg-[color:var(--bg-soft,#F7F9FC)] font-bold text-muted-foreground">
        Memuat detail UKM...
      </div>
    );
  }

  const { tenant, pins, devices, productCount, totalTxn, totalOmzet } = detailData;

  const getPinByRole = (role: string) => {
    const p = pins.find((x: any) => x.role === role);
    return p ? p.pin_raw : "••••••";
  };

  return (
    <div className="min-h-screen bg-[color:var(--bg-soft,#F7F9FC)] font-sans pb-12">
      {/* Top Header */}
      <header
        className="sticky top-0 z-30 text-white shadow-md border-b border-white/10"
        style={{ background: "linear-gradient(135deg, #002B7F 0%, #0047B3 100%)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition active:scale-95 border border-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="text-xs uppercase tracking-wider text-blue-200 font-extrabold flex items-center gap-1">
                <Store className="h-3.5 w-3.5 text-[#FFB000]" /> Pengelolaan Detail Tenant
              </div>
              <h1 className="text-lg sm:text-xl font-black">{tenant.business_name} ({tenant.tenant_code})</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
        {/* Info Banner Card */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-border/80 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase">Status Langganan</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                {tenant.status.toUpperCase()}
              </span>
              <span className="text-xs font-bold text-[color:var(--brand)]">{tenant.packages?.name || "Standard"}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase">Masa Aktif Berlaku</span>
            <div className="mt-1 font-black text-sm text-[color:var(--brand-deep)]">
              {new Date(tenant.expired_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase">Pemilik & Kontak</span>
            <div className="mt-1 font-bold text-sm text-foreground">{tenant.owner_name}</div>
            <div className="text-xs text-muted-foreground font-mono">{tenant.phone}</div>
          </div>

          <div>
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase">Total Omzet</span>
            <div className="mt-1 font-black text-xl text-amber-600">{rupiah(totalOmzet)}</div>
            <div className="text-[11px] text-muted-foreground font-semibold">{totalTxn} Transaksi • {productCount} Produk</div>
          </div>
        </div>

        {/* 4 ACCESS PINS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-black text-[color:var(--brand-deep)]">
            <KeyRound className="h-5 w-5 text-[color:var(--brand)]" />
            <h2>MANAJEMEN PIN HAK AKSES PERANGKAT (6 DIGIT)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PinCard
              roleTitle="Admin Kasir / Owner"
              roleCode="tenant_admin"
              pin={getPinByRole("tenant_admin")}
              desc="Akses Penuh Pengelolaan Produk, Stok, Promo, QRIS & Laporan"
              color="border-blue-500/40 bg-blue-50/20"
              isVisible={Boolean(visiblePins["tenant_admin"])}
              onToggle={() => togglePinVisibility("tenant_admin")}
              onCopy={() => copyToClipboard(getPinByRole("tenant_admin"), "PIN Admin Kasir")}
              onReset={() => handleResetPin("tenant_admin", "Admin Kasir")}
            />

            <PinCard
              roleTitle="Kasir POS"
              roleCode="cashier"
              pin={getPinByRole("cashier")}
              desc="Akses Transaksi Penjualan & Cetak Struk Kasir"
              color="border-purple-500/40 bg-purple-50/20"
              isVisible={Boolean(visiblePins["cashier"])}
              onToggle={() => togglePinVisibility("cashier")}
              onCopy={() => copyToClipboard(getPinByRole("cashier"), "PIN Kasir POS")}
              onReset={() => handleResetPin("cashier", "Kasir POS")}
            />

            <PinCard
              roleTitle="Customer Display"
              roleCode="customer_display"
              pin={getPinByRole("customer_display")}
              desc="Monitor Depan Pelanggan (Slideshow Signage & QRIS)"
              color="border-amber-500/40 bg-amber-50/20"
              isVisible={Boolean(visiblePins["customer_display"])}
              onToggle={() => togglePinVisibility("customer_display")}
              onCopy={() => copyToClipboard(getPinByRole("customer_display"), "PIN Customer Display")}
              onReset={() => handleResetPin("customer_display", "Customer Display")}
            />

            <PinCard
              roleTitle="Display Antrean"
              roleCode="queue_display"
              pin={getPinByRole("queue_display")}
              desc="TV Monitor Antrean & Suara Panggilan Bahasa Indonesia"
              color="border-emerald-500/40 bg-emerald-50/20"
              isVisible={Boolean(visiblePins["queue_display"])}
              onToggle={() => togglePinVisibility("queue_display")}
              onCopy={() => copyToClipboard(getPinByRole("queue_display"), "PIN Display Antrean")}
              onReset={() => handleResetPin("queue_display", "Display Antrean")}
            />
          </div>
        </div>

        {/* ACTIVE DEVICES */}
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-border/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-extrabold text-sm text-[color:var(--brand-deep)] flex items-center gap-2">
              <Laptop className="h-4 w-4 text-[color:var(--brand)]" />
              Perangkat &amp; Sesi Aktif ({devices.length})
            </div>
          </div>

          <div className="divide-y divide-border/40">
            {devices.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground font-semibold">
                Belum ada sesi perangkat terhubung.
              </div>
            ) : (
              devices.map((d: any) => (
                <div key={d.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-foreground">{d.device_name || "Perangkat Kasir"}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">Role: {d.role} • IP: {d.ip_address || "Tersambung"}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                      Online
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function PinCard({
  roleTitle,
  roleCode,
  pin,
  desc,
  color,
  isVisible,
  onToggle,
  onCopy,
  onReset,
}: {
  roleTitle: string;
  roleCode: string;
  pin: string;
  desc: string;
  color: string;
  isVisible: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onReset: () => void;
}) {
  return (
    <div className={`rounded-3xl p-5 shadow-xs border-2 ${color} flex flex-col justify-between space-y-4`}>
      <div>
        <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">{roleTitle}</span>
        <div className="mt-2 flex items-center justify-between rounded-2xl bg-white p-3 border border-border/60 shadow-xs">
          <div className="font-mono text-2xl font-black tracking-widest text-[color:var(--brand-deep)]">
            {isVisible ? pin : "••••••"}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onToggle} className="rounded-xl p-1.5 hover:bg-secondary text-muted-foreground" title="Lihat/Sembunyikan PIN">
              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button onClick={onCopy} className="rounded-xl p-1.5 hover:bg-secondary text-muted-foreground" title="Salin PIN">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground font-medium leading-relaxed">{desc}</p>
      </div>

      <button
        onClick={onReset}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-[color:var(--brand)] border border-border hover:bg-secondary transition active:scale-95"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Generate PIN Baru
      </button>
    </div>
  );
}
