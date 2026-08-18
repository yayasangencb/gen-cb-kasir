import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Boxes, History, Minus, Plus, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getCurrentStaff } from "@/lib/auth.functions";
import { rupiah } from "@/lib/format";
import { changeStock, listStock, listStockMovements } from "@/lib/pos.functions";

export const Route = createFileRoute("/stok")({
  head: () => ({ meta: [{ title: "Manajemen Stok — Gen CB Kasir" }] }),
  beforeLoad: async () => {
    const staff = await getCurrentStaff();
    if (!staff) throw redirect({ to: "/login" });
    if (staff.role !== "admin") throw redirect({ to: "/kasir" });
    return { staff };
  },
  loader: ({ context }) => context.staff,
  component: StokPage,
});

type StockModalState = {
  mode: "masuk" | "keluar" | "sesuaikan";
  product: { id: string; name: string; stock: number; cost_price: number; unit: string };
};

function StokPage() {
  const staff = Route.useLoaderData();
  const fetchStock = useServerFn(listStock);
  const fetchMovements = useServerFn(listStockMovements);
  const updateStock = useServerFn(changeStock);

  const [activeTab, setActiveTab] = useState<"inventory" | "history">("inventory");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "aman" | "menipis" | "habis">("all");
  const [catFilter, setCatFilter] = useState<string | "all">("all");

  const [modal, setModal] = useState<StockModalState | null>(null);
  const [qtyInput, setQtyInput] = useState("1");
  const [costInput, setCostInput] = useState("");
  const [supplierInput, setSupplierInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [movementType, setMovementType] = useState<"masuk" | "penyesuaian" | "rusak" | "koreksi" | "retur">("masuk");
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-stock"],
    queryFn: () => fetchStock({}),
  });

  const { data: movementsData, isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["admin-stock-movements"],
    queryFn: () => fetchMovements({}),
    enabled: activeTab === "history",
  });

  const products = useMemo(() => {
    const list = data?.products ?? [];
    return list.filter((p) => {
      if (catFilter !== "all" && p.category_id !== catFilter) return false;
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;

      const isOut = p.stock <= 0;
      const isLow = p.stock > 0 && p.stock <= p.minimum_stock;
      const isSafe = p.stock > p.minimum_stock;

      if (statusFilter === "habis" && !isOut) return false;
      if (statusFilter === "menipis" && !isLow) return false;
      if (statusFilter === "aman" && !isSafe) return false;

      return true;
    });
  }, [data, q, catFilter, statusFilter]);

  const openModal = (mode: "masuk" | "keluar" | "sesuaikan", p: { id: string; name: string; stock: number; cost_price: number; unit: string }) => {
    setModal({ mode, product: p });
    setQtyInput(mode === "sesuaikan" ? String(p.stock) : "1");
    setCostInput(String(p.cost_price || ""));
    setSupplierInput("");
    setReasonInput("");
    setMovementType(mode === "masuk" ? "masuk" : mode === "sesuaikan" ? "penyesuaian" : "rusak");
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;

    const qty = Number(qtyInput);
    if (isNaN(qty) || qty < 0) {
      toast.error("Jumlah stok tidak valid");
      return;
    }

    setBusy(true);
    try {
      await updateStock({
        data: {
          product_id: modal.product.id,
          mode: modal.mode,
          quantity: qty,
          reason: reasonInput.trim() || undefined,
          movement_type: movementType,
          cost_price: costInput ? Number(costInput) : undefined,
          supplier: supplierInput.trim() || undefined,
        },
      });

      toast.success("Stok berhasil diperbarui");
      setModal(null);
      refetch();
      if (activeTab === "history") refetchHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui stok");
    } finally {
      setBusy(false);
    }
  };

  const totalInventoryValue = (data?.products ?? []).reduce(
    (s, p) => s + (p.stock > 0 ? p.stock * Number(p.cost_price) : 0),
    0,
  );

  return (
    <AppShell staff={staff}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[color:var(--brand-deep)]">Manajemen Stok</h1>
            <p className="text-sm text-muted-foreground">
              Tambah stok masuk, catat barang rusak/habis, dan sesuaikan stok fisik.
            </p>
          </div>

          <div className="flex rounded-2xl bg-white p-1.5 ring-1 ring-border shadow-xs">
            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                activeTab === "inventory"
                  ? "bg-[color:var(--brand-deep)] text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Boxes className="h-4 w-4" /> Daftar Stok
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                activeTab === "history"
                  ? "bg-[color:var(--brand-deep)] text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <History className="h-4 w-4" /> Riwayat Movements
            </button>
          </div>
        </div>

        {activeTab === "inventory" ? (
          <>
            {/* Value Summary Card */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between rounded-3xl bg-gradient-to-r from-[#002B7F] to-[#0047B3] p-6 text-white shadow-md">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-white/80">Total Nilai Persediaan Stok</div>
                <div className="text-3xl font-black">{rupiah(totalInventoryValue)}</div>
              </div>
              <div className="text-xs text-white/80 font-semibold">
                Berdasarkan harga modal x sisa stok fisik
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-border">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari produk..."
                  className="w-full rounded-2xl border border-border bg-secondary/50 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none focus:border-[color:var(--brand)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "aman" | "menipis" | "habis")}
                  className="rounded-2xl border border-border bg-white px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="all">Semua Status Stok</option>
                  <option value="aman">Stok Aman</option>
                  <option value="menipis">Stok Menipis</option>
                  <option value="habis">Stok Habis</option>
                </select>

                <select
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className="rounded-2xl border border-border bg-white px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="all">Semua Kategori</option>
                  {(data?.categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stock Table */}
            <div className="glass-card overflow-hidden rounded-3xl shadow-md border border-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[color:var(--brand-deep)] text-white font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">Nama Produk</th>
                      <th className="px-4 py-3.5">Kategori</th>
                      <th className="px-4 py-3.5 text-right">Stok Fisik</th>
                      <th className="px-4 py-3.5 text-right">Stok Min</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-4 py-3.5 text-right">Harga Modal</th>
                      <th className="px-4 py-3.5 text-right">Nilai Stok</th>
                      <th className="px-4 py-3.5 text-center">Aksi Cepat Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 bg-white font-medium">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground font-bold">
                          Memuat data stok...
                        </td>
                      </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-muted-foreground">
                          Tidak ada produk ditemukan.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => {
                        const cat = data?.categories.find((c) => c.id === p.category_id);
                        const isOut = p.stock <= 0;
                        const isLow = p.stock > 0 && p.stock <= p.minimum_stock;
                        const val = p.stock > 0 ? p.stock * Number(p.cost_price) : 0;

                        return (
                          <tr key={p.id} className="hover:bg-secondary/40 transition">
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-sm text-[color:var(--brand-deep)]">{p.name}</div>
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-muted-foreground">{cat?.name ?? "-"}</td>
                            <td className="px-4 py-3.5 text-right font-black text-sm text-foreground">
                              {p.stock} {p.unit}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-muted-foreground">
                              {p.minimum_stock} {p.unit}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {isOut ? (
                                <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black text-red-700">
                                  Habis
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
                                  Menipis
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                  Aman
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right font-semibold text-muted-foreground">
                              {rupiah(Number(p.cost_price))}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-[color:var(--brand-deep)]">
                              {rupiah(val)}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex justify-center gap-1">
                                <button
                                  onClick={() =>
                                    openModal("masuk", {
                                      id: p.id,
                                      name: p.name,
                                      stock: p.stock,
                                      cost_price: Number(p.cost_price),
                                      unit: p.unit,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[11px] font-extrabold text-emerald-700 hover:bg-emerald-100"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Tambah
                                </button>
                                <button
                                  onClick={() =>
                                    openModal("keluar", {
                                      id: p.id,
                                      name: p.name,
                                      stock: p.stock,
                                      cost_price: Number(p.cost_price),
                                      unit: p.unit,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1.5 text-[11px] font-extrabold text-red-700 hover:bg-red-100"
                                >
                                  <Minus className="h-3.5 w-3.5" /> Kurangi
                                </button>
                                <button
                                  onClick={() =>
                                    openModal("sesuaikan", {
                                      id: p.id,
                                      name: p.name,
                                      stock: p.stock,
                                      cost_price: Number(p.cost_price),
                                      unit: p.unit,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-bold text-[color:var(--brand-deep)] hover:bg-secondary/80"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" /> Sesuaikan
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
          </>
        ) : (
          /* History Movements Tab */
          <div className="glass-card overflow-hidden rounded-3xl shadow-md border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[color:var(--brand-deep)] text-white font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Waktu</th>
                    <th className="px-4 py-3.5">Nama Produk</th>
                    <th className="px-4 py-3.5">Tipe Perubahan</th>
                    <th className="px-4 py-3.5 text-right">Sebelum</th>
                    <th className="px-4 py-3.5 text-right">Perubahan</th>
                    <th className="px-4 py-3.5 text-right">Sesudah</th>
                    <th className="px-4 py-3.5">Alasan / Catatan</th>
                    <th className="px-4 py-3.5">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 bg-white font-medium">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground font-bold">
                        Memuat riwayat pergerakan stok...
                      </td>
                    </tr>
                  ) : (movementsData ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-muted-foreground">
                        Belum ada riwayat pergerakan stok.
                      </td>
                    </tr>
                  ) : (
                    (movementsData ?? []).map((m) => {
                      const isPositive = m.quantity_change > 0;
                      return (
                        <tr key={m.id} className="hover:bg-secondary/40 transition">
                          <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                            {new Date(m.created_at).toLocaleString("id-ID", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="px-4 py-3.5 font-extrabold text-sm text-[color:var(--brand-deep)]">
                            {m.products?.name || "Produk"}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                              {m.movement_type}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-muted-foreground">
                            {m.quantity_before}
                          </td>
                          <td
                            className={`px-4 py-3.5 text-right font-black ${
                              isPositive ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {isPositive ? `+${m.quantity_change}` : m.quantity_change}
                          </td>
                          <td className="px-4 py-3.5 text-right font-black text-foreground">{m.quantity_after}</td>
                          <td className="px-4 py-3.5 text-muted-foreground max-w-xs truncate">
                            {m.reason || "-"}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground font-semibold">{m.created_by_name || "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Stock Change Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleStockSubmit} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground">
                  {modal.mode === "masuk"
                    ? "Tambah Stok Masuk"
                    : modal.mode === "keluar"
                    ? "Kurangi Stok (Kerusakan/Hilang)"
                    : "Penyesuaian Stok Fisik"}
                </span>
                <h2 className="text-xl font-extrabold text-[color:var(--brand-deep)]">{modal.product.name}</h2>
              </div>
              <button type="button" onClick={() => setModal(null)} className="rounded-xl p-1.5 hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-secondary/70 p-3 text-xs font-bold text-muted-foreground flex justify-between">
              <span>Stok Sistem Saat Ini:</span>
              <span className="text-foreground font-black">{modal.product.stock} {modal.product.unit}</span>
            </div>

            {modal.mode === "masuk" && (
              <>
                <label className="block text-xs font-bold text-muted-foreground">
                  Jumlah Stok Masuk *
                  <input
                    type="number"
                    min={1}
                    required
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    className="input mt-1"
                    autoFocus
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-bold text-muted-foreground">
                    Harga Modal per Unit (Rp)
                    <input
                      type="number"
                      min={0}
                      value={costInput}
                      onChange={(e) => setCostInput(e.target.value)}
                      className="input mt-1"
                    />
                  </label>
                  <label className="block text-xs font-bold text-muted-foreground">
                    Nama Pemasok / Supplier
                    <input
                      value={supplierInput}
                      onChange={(e) => setSupplierInput(e.target.value)}
                      placeholder="Opsional"
                      className="input mt-1"
                    />
                  </label>
                </div>
              </>
            )}

            {modal.mode === "keluar" && (
              <>
                <label className="block text-xs font-bold text-muted-foreground">
                  Jumlah Stok Keluar *
                  <input
                    type="number"
                    min={1}
                    required
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    className="input mt-1"
                    autoFocus
                  />
                </label>

                <label className="block text-xs font-bold text-muted-foreground">
                  Alasan Pengurangan
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as any)}
                    className="input mt-1 font-bold"
                  >
                    <option value="rusak">Produk Rusak / Kedaluwarsa</option>
                    <option value="koreksi">Hilang / Pemakaian Internal</option>
                    <option value="retur">Retur Pemasok</option>
                  </select>
                </label>
              </>
            )}

            {modal.mode === "sesuaikan" && (
              <label className="block text-xs font-bold text-muted-foreground">
                Jumlah Stok Fisik Sebenarnya *
                <input
                  type="number"
                  min={0}
                  required
                  value={qtyInput}
                  onChange={(e) => setQtyInput(e.target.value)}
                  className="input mt-1 text-lg font-black"
                  autoFocus
                />
                <span className="text-[11px] text-muted-foreground mt-1 block font-normal">
                  Selisih: <b>{(Number(qtyInput) || 0) - modal.product.stock} {modal.product.unit}</b>
                </span>
              </label>
            )}

            <label className="block text-xs font-bold text-muted-foreground">
              Catatan / Keterangan
              <input
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Alasan perubahan stok..."
                className="input mt-1"
              />
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 rounded-2xl bg-secondary py-3 text-xs font-extrabold text-[color:var(--brand-deep)]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="btn-brand flex-1 rounded-2xl py-3 text-xs font-extrabold shadow-md disabled:opacity-50"
              >
                {busy ? "Memproses..." : "Simpan Perubahan Stok"}
              </button>
            </div>
          </form>
          <style>{`.input{width:100%;border-radius:1rem;border:1px solid var(--border);padding:0.65rem 0.9rem;font-size:0.8rem;background:white;outline:none}.input:focus{border-color:var(--brand)}`}</style>
        </div>
      )}
    </AppShell>
  );
}
