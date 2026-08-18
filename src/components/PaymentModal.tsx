import { rupiah } from "@/lib/format";
import { Banknote, Delete, QrCode, Smartphone, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";

export type PaymentMethod = "tunai" | "qris" | "transfer" | "ewallet" | "lainnya";
export type OrderType = "dine_in" | "take_away";

export type PaymentPayload = {
  amount_paid: number;
  payment_method: PaymentMethod;
  customer_name: string;
  order_type: OrderType;
  discount: number;
  notes: string;
};

const METHODS: { key: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "tunai", label: "Tunai", icon: Banknote },
  { key: "qris", label: "QRIS", icon: QrCode },
  { key: "transfer", label: "Transfer", icon: Wallet },
  { key: "ewallet", label: "E-Wallet", icon: Smartphone },
];

function roundUp(n: number, step: number) {
  if (n <= 0) return 0;
  return Math.ceil(n / step) * step;
}

export function PaymentModal({
  subtotal: propSubtotal,
  total: propTotal,
  onClose,
  onSubmit,
}: {
  subtotal?: number;
  total?: number;
  onClose: () => void;
  onSubmit: (v: PaymentPayload) => Promise<void> | void;
}) {
  const subtotal = Math.max(0, Number(propSubtotal ?? propTotal ?? 0));
  const [method, setMethod] = useState<PaymentMethod>("tunai");
  const [discountStr, setDiscountStr] = useState("0");
  const [paidStr, setPaidStr] = useState("");
  const [customer, setCustomer] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const discount = Math.min(Number(discountStr) || 0, subtotal);
  const total = Math.max(0, subtotal - discount);

  // Default paidStr when method changes or when initially opening
  useEffect(() => {
    if (method !== "tunai" || !paidStr) {
      setPaidStr(String(total));
    }
  }, [method, total]);

  const paid = Number(paidStr) || 0;
  const change = paid - total;
  const enough = paid >= total;

  const quick = [
    { label: "Uang Pas", val: total },
    { label: rupiah(roundUp(total + 1, 5000)), val: roundUp(total + 1, 5000) },
    { label: rupiah(roundUp(total + 1, 10000)), val: roundUp(total + 1, 10000) },
    { label: "Rp50.000", val: 50000 },
    { label: "Rp100.000", val: 100000 },
    { label: "Rp200.000", val: 200000 },
  ];

  const press = (n: string) => setPaidStr((p) => (p === "0" || !p ? n : p + n));

  const submit = async () => {
    const finalPaid = paid <= 0 && enough ? total : paid;
    if (finalPaid < total || busy) return;
    setBusy(true);
    try {
      await onSubmit({
        amount_paid: finalPaid,
        payment_method: method,
        customer_name: customer.trim(),
        order_type: orderType,
        discount,
        notes: notes.trim(),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-3">
      <div className="max-h-[95vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between p-5 text-white"
          style={{ background: "linear-gradient(135deg,#003B8F,#1E6FD9)" }}
        >
          <div>
            <div className="text-xs uppercase tracking-widest text-white/70">Total Tagihan</div>
            <div className="text-4xl font-extrabold">{rupiah(total)}</div>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/10 p-2 hover:bg-white/20" aria-label="Tutup">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="space-y-4 border-b border-border p-5 lg:border-b-0 lg:border-r">
            <div>
              <div className="mb-2 text-sm font-bold text-muted-foreground">Metode Pembayaran</div>
              <div className="grid grid-cols-2 gap-3">
                {METHODS.map((m) => {
                  const active = method === m.key;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.key}
                      onClick={() => {
                        setMethod(m.key);
                        setPaidStr(String(total));
                      }}
                      className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left font-semibold transition ${
                        active
                          ? "border-[color:var(--brand)] bg-[color:var(--brand)]/5 text-[color:var(--brand-deep)]"
                          : "border-border bg-white text-muted-foreground hover:border-[color:var(--brand)]/50"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-muted-foreground">Nama Pelanggan</span>
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Opsional"
                  className="mt-1 w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-[color:var(--brand)]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-muted-foreground">Diskon (Rp)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={discountStr}
                  onChange={(e) => setDiscountStr(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border p-3 text-right text-sm font-bold outline-none focus:border-[color:var(--brand)]"
                />
              </label>
            </div>

            <div>
              <div className="mb-2 text-xs font-bold text-muted-foreground">Tipe Pesanan</div>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { key: "dine_in", label: "Makan di Tempat" },
                    { key: "take_away", label: "Bawa Pulang" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setOrderType(o.key)}
                    className={`rounded-xl border-2 py-3 text-sm font-semibold transition ${
                      orderType === o.key
                        ? "border-[color:var(--orange)] bg-[color:var(--orange)]/10 text-[color:var(--brand-deep)]"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-bold text-muted-foreground">Catatan</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: tanpa gula"
                className="mt-1 w-full rounded-xl border border-border p-3 text-sm outline-none focus:border-[color:var(--brand)]"
              />
            </label>
          </div>

          <div className="p-5">
            <div className="mb-2 text-sm font-bold text-muted-foreground">Uang Diterima</div>
            <input
              type="number"
              inputMode="numeric"
              value={paidStr}
              onChange={(e) => setPaidStr(e.target.value)}
              disabled={method !== "tunai"}
              placeholder="0"
              className="w-full rounded-2xl border-2 border-border bg-white p-4 text-right text-3xl font-extrabold text-[color:var(--brand-deep)] outline-none focus:border-[color:var(--brand)] disabled:opacity-60"
            />

            {method === "tunai" && (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {quick.map((q) => (
                    <button
                      key={q.label}
                      onClick={() => setPaidStr(String(q.val))}
                      className="rounded-xl bg-secondary py-3 text-xs font-bold text-[color:var(--brand-deep)] hover:bg-[color:var(--brand)]/10 active:scale-95"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "000"].map((n) => (
                    <button
                      key={n}
                      onClick={() => press(n)}
                      className="rounded-xl bg-white py-4 text-lg font-bold ring-1 ring-border active:scale-95"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setPaidStr((p) => p.slice(0, -1))}
                    className="grid place-items-center rounded-xl bg-white ring-1 ring-border active:scale-95"
                    aria-label="Hapus angka"
                  >
                    <Delete className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </>
            )}

            <div className="mt-4 rounded-2xl bg-secondary p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Kembalian</span>
                <span
                  className={`text-2xl font-extrabold ${enough ? "text-[color:var(--status-done)]" : "text-destructive"}`}
                >
                  {rupiah(Math.max(0, change))}
                </span>
              </div>
              {!enough && <div className="mt-1 text-right text-xs text-destructive">Kurang {rupiah(total - paid)}</div>}
            </div>

            <button
              onClick={submit}
              disabled={!enough || busy}
              className="btn-orange mt-4 w-full rounded-2xl py-5 text-lg font-extrabold disabled:cursor-not-allowed disabled:opacity-50 transition active:scale-98"
            >
              {busy ? "Memproses..." : "Selesaikan Pembayaran"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
