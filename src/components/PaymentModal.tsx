import { rupiah } from "@/lib/format";
import { Banknote, CreditCard, QrCode, Smartphone, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";

export type PaymentMethod = "tunai" | "qris" | "transfer" | "ewallet" | "debit" | "lainnya";

const METHODS: { key: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "tunai", label: "Tunai", icon: Banknote },
  { key: "qris", label: "QRIS", icon: QrCode },
  { key: "transfer", label: "Transfer", icon: Wallet },
  { key: "ewallet", label: "E-Wallet", icon: Smartphone },
  { key: "debit", label: "Debit", icon: CreditCard },
];

function roundUp(n: number, step: number) {
  return Math.ceil(n / step) * step;
}

export function PaymentModal({
  total,
  onClose,
  onSubmit,
}: {
  total: number;
  onClose: () => void;
  onSubmit: (v: { paid: number; method: PaymentMethod }) => Promise<void> | void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("tunai");
  const [paidStr, setPaidStr] = useState<string>(String(total));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (method !== "tunai") setPaidStr(String(total));
  }, [method, total]);

  const paid = Number(paidStr) || 0;
  const change = paid - total;
  const enough = paid >= total;

  const quick = [
    { label: "Uang Pas", val: total },
    { label: rupiah(roundUp(total, 5000)), val: roundUp(total, 5000) },
    { label: rupiah(roundUp(total + 1, 10000)), val: roundUp(total + 1, 10000) },
    { label: "Rp50.000", val: 50000 },
    { label: "Rp100.000", val: 100000 },
  ];

  const submit = async () => {
    if (!enough) return;
    setBusy(true);
    try {
      await onSubmit({ paid, method });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between p-5 text-white" style={{ background: "linear-gradient(135deg,#002B7F,#0047B3)" }}>
          <div>
            <div className="text-xs uppercase tracking-widest text-white/70">Total Tagihan</div>
            <div className="text-4xl font-extrabold">{rupiah(total)}</div>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/10 p-2 hover:bg-white/20">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="border-r border-border p-6">
            <div className="mb-3 text-sm font-bold text-muted-foreground">Metode Pembayaran</div>
            <div className="grid grid-cols-2 gap-3">
              {METHODS.map((m) => {
                const active = method === m.key;
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMethod(m.key)}
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

          <div className="p-6">
            <div className="mb-3 text-sm font-bold text-muted-foreground">Uang Diterima</div>
            <input
              type="number"
              inputMode="numeric"
              value={paidStr}
              onChange={(e) => setPaidStr(e.target.value)}
              disabled={method !== "tunai"}
              className="w-full rounded-2xl border-2 border-border bg-white p-4 text-right text-3xl font-extrabold text-[color:var(--brand-deep)] outline-none focus:border-[color:var(--brand)] disabled:opacity-60"
            />

            {method === "tunai" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {quick.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => setPaidStr(String(q.val))}
                    className="rounded-xl bg-secondary py-3 text-sm font-bold text-[color:var(--brand-deep)] hover:bg-[color:var(--brand)]/10"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-2xl bg-secondary p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Kembalian</span>
                <span
                  className={`text-2xl font-extrabold ${
                    enough ? "text-[color:var(--status-done)]" : "text-destructive"
                  }`}
                >
                  {rupiah(Math.max(0, change))}
                </span>
              </div>
              {!enough && (
                <div className="mt-1 text-right text-xs text-destructive">
                  Kurang {rupiah(total - paid)}
                </div>
              )}
            </div>

            <button
              onClick={submit}
              disabled={!enough || busy}
              className="btn-orange mt-4 w-full rounded-2xl py-4 text-lg font-extrabold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Memproses..." : "Selesaikan Pembayaran"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
