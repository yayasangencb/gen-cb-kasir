import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  Image as ImageIcon,
  Layers,
  LogOut,
  Package,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  Tag,
  Trash2,
  Tv,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ImageDropzone } from "@/components/ImageDropzone";
import { getCurrentTenantSession, logoutSession } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import {
  adjustStock,
  deleteProduct,
  getAdminDashboardData,
  listCatalog,
  listStockMovements,
  upsertProduct,
} from "@/lib/pos.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/admin")({
  head: () => ({ meta: [{ title: "Admin UKM — GEN-CB Kasir" }] }),
  beforeLoad: async () => {
    const session = await getCurrentTenantSession();
    if (!session) throw redirect({ to: "/login" });
    if (session.tenantRole !== "tenant_admin") throw redirect({ to: "/app/kasir" });
    return { session };
  },
  component: TenantAdminPage,
});

function TenantAdminPage() {
  const { session } = Route.useLoaderData();
  const navigate = useNavigate();

  const fetchDashboard = useServerFn(getAdminDashboardData);
  const fetchCatalog = useServerFn(listCatalog);
  const fetchMovements = useServerFn(listStockMovements);
  const saveProduct = useServerFn(upsertProduct);
  const removeProduct = useServerFn(deleteProduct);
  const doAdjustStock = useServerFn(adjustStock);
  const doLogout = useServerFn(logoutSession);

  const { data: dashData, refetch: refetchDash } = useQuery({
    queryKey: ["tenant-admin-dash", session.tenantId],
    queryFn: () => fetchDashboard({}),
  });

  const { data: catalogData, refetch: refetchCatalog } = useQuery({
    queryKey: ["tenant-catalog", session.tenantId],
    queryFn: () => fetchCatalog({}),
  });

  const { data: movementsData, refetch: refetchMovements } = useQuery({
    queryKey: ["tenant-movements", session.tenantId],
    queryFn: () => fetchMovements({}),
  });

  const [activeTab, setActiveTab] = useState<"dash" | "products" | "stock">("dash");
  const [q, setQ] = useState("");
  const [editProduct, setEditProduct] = useState<any>(null);
  const [adjustingProd, setAdjustingProd] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [busy, setBusy] = useState(false);

  const products = catalogData?.products ?? [];

  const filteredProducts = useMemo(() => {
    if (!q) return products;
    const term = q.toLowerCase();
    return products.filter(
      (p: any) => p.name.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term),
    );
  }, [products, q]);

  const handleLogout = async () => {
    await doLogout({});
    toast.success("Berhasil keluar");
    navigate({ to: "/login" });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct || !editProduct.name.trim()) {
      toast.error("Nama produk wajib diisi");
      return;
    }

    setBusy(true);
    try {
      await saveProduct({
        data: {
          id: editProduct.id,
          name: editProduct.name.trim(),
          category_id: editProduct.category_id || undefined,
          selling_price: Number(editProduct.selling_price) || 0,
          cost_price: Number(editProduct.cost_price) || 0,
          minimum_stock: Number(editProduct.minimum_stock) || 5,
          unit: editProduct.unit?.trim() || "pcs",
          sku: editProduct.sku?.trim() || undefined,
          barcode: editProduct.barcode?.trim() || undefined,
          description: editProduct.description?.trim() || undefined,
          image_url: editProduct.image_url || undefined,
          is_available: editProduct.is_available ?? true,
          is_active: editProduct.is_active ?? true,
          initial_stock: editProduct.id ? undefined : Number(editProduct.initial_stock) || 0,
        },
      });

      toast.success(editProduct.id ? "Produk diperbarui" : "Produk baru ditambahkan");
      setEditProduct(null);
      refetchCatalog();
      refetchDash();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan produk");
    } finally {
      setBusy(false);
    }
  };

  const handleStockAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProd || !adjustReason.trim()) {
      toast.error("Alasan penyesuaian wajib diisi");
      return;
    }

    setBusy(true);
    try {
      await doAdjustStock({
        data: {
          product_id: adjustingProd.id,
          movement_type: adjustQty >= 0 ? "masuk" : "penyesuaian",
          quantity_change: adjustQty,
          reason: adjustReason.trim(),
        },
      });

      toast.success(`Stok "${adjustingProd.name}" berhasil disesuaikan!`);
      setAdjustingProd(null);
      setAdjustQty(0);
      setAdjustReason("");
      refetchCatalog();
      refetchDash();
      refetchMovements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyesuaikan stok");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteProd = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus produk "${name}"?`)) return;
    try {
      await removeProduct({ data: { id } });
      toast.success("Produk dihapus");
      refetchCatalog();
      refetchDash();
    } catch (err) {
      toast.error("Gagal menghapus produk");
    }
  };

  const stats = dashData?.stats;

  return (
    <div className="min-h-screen bg-[color:var(--bg-soft,#F7F9FC)] font-sans pb-12">
      {/* Header */}
      <header
        className="sticky top-0 z-30 text-white shadow-md border-b border-white/10"
        style={{ background: "linear-gradient(135deg, #002B7F 0%, #0047B3 100%)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-[#FF7A00] to-[#FFB000] text-white font-black text-lg">
              {session.tenantCode.substring(0, 2)}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-blue-200 font-extrabold flex items-center gap-1">
                <Store className="h-3.5 w-3.5 text-[#FFB000]" /> Admin Kasir / Owner UKM
              </div>
              <h1 className="text-lg font-black">{session.businessName} ({session.tenantCode})</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/app/kasir"
              className="btn-orange rounded-xl px-3.5 py-2 text-xs font-black shadow-sm"
            >
              Buka Kasir POS
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-red-500/20 text-white border border-white/20 transition active:scale-95"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-sm border border-border/80">
          <div className="flex rounded-2xl bg-secondary/80 p-1 font-bold text-xs">
            <button
              onClick={() => setActiveTab("dash")}
              className={`rounded-xl px-4 py-2 transition ${
                activeTab === "dash" ? "bg-[color:var(--brand)] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dashboard Usaha
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`rounded-xl px-4 py-2 transition ${
                activeTab === "products" ? "bg-[color:var(--brand)] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Katalog Produk ({products.length})
            </button>
            <button
              onClick={() => setActiveTab("stock")}
              className={`rounded-xl px-4 py-2 transition ${
                activeTab === "stock" ? "bg-[color:var(--brand)] text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Riwayat Stok &amp; Pergerakan
            </button>
          </div>

          {activeTab === "products" && (
            <button
              onClick={() =>
                setEditProduct({
                  name: "",
                  selling_price: 0,
                  cost_price: 0,
                  minimum_stock: 5,
                  unit: "pcs",
                  is_available: true,
                  is_active: true,
                  initial_stock: 0,
                })
              }
              className="btn-orange inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black shadow-md transition active:scale-95"
            >
              <Plus className="h-4 w-4" /> Tambah Produk
            </button>
          )}
        </div>

        {/* TAB 1: DASHBOARD USAHA */}
        {activeTab === "dash" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <StatCard label="Omzet Hari Ini" val={rupiah(stats?.todayOmzet ?? 0)} icon={DollarSign} color="bg-emerald-500/10 text-emerald-600" />
              <StatCard label="Transaksi Hari Ini" val={stats?.todayTxnCount ?? 0} icon={ShoppingCart} color="bg-blue-500/10 text-blue-600" />
              <StatCard label="Total Produk" val={stats?.totalProducts ?? 0} icon={Package} color="bg-purple-500/10 text-purple-600" />
              <StatCard label="Stok Menipis" val={stats?.lowStockCount ?? 0} icon={AlertTriangle} color="bg-amber-500/10 text-amber-600" />
            </div>

            {/* Low Stock Warning */}
            {dashData?.lowStockProducts && dashData.lowStockProducts.length > 0 && (
              <div className="rounded-3xl bg-amber-50 border-2 border-amber-300 p-5 space-y-3">
                <div className="flex items-center gap-2 font-black text-sm text-amber-900">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  PERINGATAN STOK MENIPIS ({dashData.lowStockProducts.length} Produk)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {dashData.lowStockProducts.map((p: any) => (
                    <div key={p.id} className="rounded-2xl bg-white p-3 border border-amber-200 flex justify-between items-center shadow-xs">
                      <div>
                        <div className="font-bold text-foreground">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">Min: {p.minimum_stock} {p.unit}</div>
                      </div>
                      <span className="font-black text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">
                        Sisa: {p.stock}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANAJEMEN PRODUK */}
        {activeTab === "products" && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari produk atau SKU..."
                className="w-full rounded-2xl border border-border bg-white py-2.5 pl-10 pr-4 text-xs font-semibold outline-none shadow-xs focus:border-[color:var(--brand)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((p: any) => (
                <div key={p.id} className="rounded-3xl bg-white p-4 shadow-sm border border-border/80 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="relative mb-3 h-32 w-full overflow-hidden rounded-2xl bg-secondary flex items-center justify-center">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-gradient-to-tr from-[#002B7F] to-[#0047B3] text-white font-black text-2xl">
                          {p.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="font-extrabold text-sm text-[color:var(--brand-deep)] line-clamp-1">{p.name}</div>
                    <div className="text-base font-black text-[color:var(--brand)]">{rupiah(Number(p.selling_price))}</div>
                    <div className="mt-1 text-[11px] font-semibold text-muted-foreground">
                      Stok: <b className={p.stock <= p.minimum_stock ? "text-amber-600" : "text-emerald-700"}>{p.stock} {p.unit}</b>
                    </div>
                  </div>

                  <div className="flex gap-1.5 pt-2 border-t border-border/60">
                    <button
                      onClick={() => setEditProduct(p)}
                      className="flex-1 rounded-xl bg-secondary py-2 text-xs font-extrabold text-[color:var(--brand-deep)] hover:bg-[color:var(--brand)]/10 transition"
                    >
                      <Pencil className="h-3.5 w-3.5 inline mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => setAdjustingProd(p)}
                      className="rounded-xl bg-emerald-50 px-2.5 py-2 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100 transition"
                      title="Adjust Stok"
                    >
                      ± Stok
                    </button>
                    <button
                      onClick={() => handleDeleteProd(p.id, p.name)}
                      className="rounded-xl bg-red-50 p-2 text-xs font-extrabold text-red-600 hover:bg-red-100 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: RIWAYAT STOK */}
        {activeTab === "stock" && (
          <div className="overflow-hidden rounded-3xl bg-white p-5 shadow-sm border border-border/80 space-y-3">
            <div className="font-extrabold text-sm text-[color:var(--brand-deep)]">Riwayat Pergerakan Stok (stock_movements)</div>
            <div className="divide-y divide-border/40 max-h-[600px] overflow-y-auto pr-1">
              {(movementsData ?? []).map((m: any) => (
                <div key={m.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-foreground">{m.products?.name ?? "Produk"}</div>
                    <div className="text-[11px] text-muted-foreground">{m.reason} • Oleh: {m.created_by_name}</div>
                  </div>
                  <div className="text-right">
                    <span className={`font-black text-sm ${m.quantity_change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {m.quantity_change >= 0 ? `+${m.quantity_change}` : m.quantity_change}
                    </span>
                    <div className="text-[10px] text-muted-foreground">Sebelum: {m.quantity_before} &rarr; Setelah: {m.quantity_after}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal Edit/Add Product */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="font-black text-lg text-[color:var(--brand-deep)]">
                {editProduct.id ? "Edit Produk" : "Tambah Produk Baru"}
              </div>
              <button onClick={() => setEditProduct(null)} className="rounded-xl p-1 text-muted-foreground hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs font-semibold">
              <ImageDropzone
                imageUrl={editProduct.image_url}
                onImageSelected={(url) => setEditProduct({ ...editProduct, image_url: url })}
              />

              <div>
                <label className="block text-muted-foreground mb-1">Nama Produk *</label>
                <input
                  required
                  value={editProduct.name || ""}
                  onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                  placeholder="Contoh: Es Kopi Gula Aren"
                  className="w-full rounded-xl border border-border p-3 outline-none focus:border-[color:var(--brand)] font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-muted-foreground mb-1">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={editProduct.selling_price || ""}
                    onChange={(e) => setEditProduct({ ...editProduct, selling_price: e.target.value })}
                    className="w-full rounded-xl border border-border p-3 font-bold text-sm outline-none focus:border-[color:var(--brand)] text-[color:var(--brand)]"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Harga Modal (Rp)</label>
                  <input
                    type="number"
                    value={editProduct.cost_price || ""}
                    onChange={(e) => setEditProduct({ ...editProduct, cost_price: e.target.value })}
                    className="w-full rounded-xl border border-border p-3 font-bold text-sm outline-none focus:border-[color:var(--brand)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-muted-foreground mb-1">Stok Awal (Khusus Produk Baru)</label>
                  <input
                    type="number"
                    disabled={Boolean(editProduct.id)}
                    value={editProduct.initial_stock || 0}
                    onChange={(e) => setEditProduct({ ...editProduct, initial_stock: e.target.value })}
                    className="w-full rounded-xl border border-border p-3 font-bold outline-none focus:border-[color:var(--brand)] disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Batas Stok Menipis</label>
                  <input
                    type="number"
                    value={editProduct.minimum_stock || 5}
                    onChange={(e) => setEditProduct({ ...editProduct, minimum_stock: e.target.value })}
                    className="w-full rounded-xl border border-border p-3 font-bold outline-none focus:border-[color:var(--brand)] text-amber-700"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditProduct(null)}
                  className="rounded-2xl bg-secondary px-5 py-3 font-bold text-muted-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-orange rounded-2xl px-6 py-3 font-black shadow-md disabled:opacity-50"
                >
                  {busy ? "Memproses..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adjust Stock */}
      {adjustingProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="font-black text-lg text-[color:var(--brand-deep)]">Penyesuaian Stok Produk</div>
              <button onClick={() => setAdjustingProd(null)} className="rounded-xl p-1 text-muted-foreground hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustmentSubmit} className="space-y-3.5 text-xs font-semibold">
              <div className="rounded-2xl bg-secondary/70 p-3 font-extrabold text-sm text-[color:var(--brand-deep)]">
                {adjustingProd.name} (Stok Saat Ini: {adjustingProd.stock} {adjustingProd.unit})
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Jumlah Perubahan (+ / -)</label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  placeholder="Contoh: +10 atau -2"
                  className="w-full rounded-xl border border-border p-3 text-lg font-black outline-none focus:border-[color:var(--brand)]"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Alasan Penyesuaian Stok *</label>
                <input
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Contoh: Tambah stok pasokan supplier / Barang rusak"
                  className="w-full rounded-xl border border-border p-3 font-semibold outline-none focus:border-[color:var(--brand)]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProd(null)}
                  className="rounded-2xl bg-secondary px-5 py-3 font-bold text-muted-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-orange rounded-2xl px-6 py-3 font-black shadow-md disabled:opacity-50"
                >
                  {busy ? "Memproses..." : "Simpan Penyesuaian Stok"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, val, icon: Icon, color }: { label: string; val: any; icon: any; color: string }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm border border-border/80 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-muted-foreground uppercase">{label}</span>
        <div className={`grid h-8 w-8 place-items-center rounded-2xl ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-xl sm:text-2xl font-black text-[color:var(--brand-deep)]">{val}</div>
    </div>
  );
}
