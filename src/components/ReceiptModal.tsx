import { Printer, X } from "lucide-react";
import { useState } from "react";
import { rupiah } from "@/lib/format";

export type ReceiptData = {
  transaction_id?: string;
  transaction_number?: string;
  invoice_no?: string;
  queue_number?: number;
  queue_no?: number;
  cashier_name?: string | null;
  customer_name?: string | null;
  order_type?: string;
  created_at: string;
  subtotal: number;
  discount?: number;
  total?: number;
  grand_total?: number;
  paid?: number;
  amount_paid?: number;
  change_amount?: number;
  payment_method: string;
  notes?: string | null;
  items: {
    name?: string;
    product_name?: string;
    quantity?: number;
    qty?: number;
    price: number;
    subtotal: number;
    notes?: string | null;
  }[];
  store?: {
    store_name: string;
    address?: string | null;
    phone?: string | null;
    receipt_footer?: string;
    receipt_paper?: string;
    logo_url?: string | null;
  } | null;
};

const METHOD_LABEL: Record<string, string> = {
  tunai: "TUNAI",
  qris: "QRIS",
  transfer: "TRANSFER",
  ewallet: "E-WALLET",
  lainnya: "LAINNYA",
};

export function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const [paper, setPaper] = useState<"58mm" | "80mm">(data.store?.receipt_paper === "58mm" ? "58mm" : "80mm");
  const widthPx = paper === "58mm" ? 220 : 300;

  const txnNumber = data.transaction_number || data.invoice_no || "INV-000";
  const queueNum = data.queue_number ?? data.queue_no ?? 0;
  const cashierName = data.cashier_name || "Kasir Bertugas";
  const grandTotal = data.grand_total ?? data.total ?? 0;
  const amountPaid = data.amount_paid ?? data.paid ?? grandTotal;
  const changeAmt = data.change_amount ?? (amountPaid - grandTotal);
  const storeName = data.store?.store_name ?? "Outlet Kasir";
  const logoUrl = data.store?.logo_url;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4 print:static print:bg-white print:p-0">
      <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        {/* Modal Toolbar */}
        <div className="mb-3 flex items-center justify-between print:hidden">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
            {(["58mm", "80mm"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPaper(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  paper === p ? "bg-[#003B8F] text-white shadow" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-white shadow transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #FF7A00, #FFB000)" }}
            >
              <Printer className="h-4 w-4" /> Cetak Struk
            </button>
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-100 hover:bg-slate-200 p-2 text-slate-700 transition"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Thermal Receipt Print Area */}
        <div
          id="receipt-print-area"
          className="mx-auto bg-white font-mono text-[11px] leading-tight text-black p-2 border border-slate-200 shadow-sm print:border-none print:shadow-none"
          style={{ width: widthPx }}
        >
          {/* Header Store */}
          <div className="text-center">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="mx-auto mb-1 h-12 w-12 object-contain" />
            ) : (
              <div className="mx-auto mb-1 grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white font-black text-lg">
                {storeName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-sm font-extrabold uppercase">{storeName}</div>
            {data.store?.address && <div className="text-[10px] text-slate-700">{data.store.address}</div>}
            {data.store?.phone && <div className="text-[10px] text-slate-700">{data.store.phone}</div>}
          </div>

          <Divider />
          <Row left="No. Transaksi" right={txnNumber} />
          <Row
            left="Waktu"
            right={new Date(data.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
          />
          {/* NAMA KASIR BERTUGAS (REVISI 2) */}
          <Row left="Kasir Bertugas" right={cashierName} />
          {data.customer_name && <Row left="Pelanggan" right={data.customer_name} />}
          <Row left="Tipe" right={data.order_type === "take_away" ? "Bawa Pulang" : "Makan di Tempat"} />
          
          <div className="mt-2 text-center text-base font-black border-y border-dashed border-black py-1">
            ANTREAN #{String(queueNum).padStart(3, "0")}
          </div>

          <div className="mt-2 space-y-1">
            {data.items.map((it, i) => {
              const itemName = it.product_name || it.name || "Produk";
              const itemQty = it.quantity ?? it.qty ?? 1;
              return (
                <div key={i} className="mb-1">
                  <div className="font-bold">{itemName}</div>
                  <div className="flex justify-between text-[10px]">
                    <span>
                      {itemQty} x {rupiah(it.price)}
                    </span>
                    <span className="font-semibold">{rupiah(it.subtotal)}</span>
                  </div>
                  {it.notes && <div className="italic text-[9px]">* {it.notes}</div>}
                </div>
              );
            })}
          </div>

          <Divider />
          <Row left="Subtotal" right={rupiah(data.subtotal)} />
          {data.discount && data.discount > 0 ? <Row left="Diskon" right={`-${rupiah(data.discount)}`} /> : null}
          <div className="flex justify-between text-sm font-extrabold my-1 pt-1 border-t border-black">
            <span>TOTAL</span>
            <span>{rupiah(grandTotal)}</span>
          </div>
          <Row left={METHOD_LABEL[data.payment_method] ?? data.payment_method.toUpperCase()} right={rupiah(amountPaid)} />
          <Row left="Kembali" right={rupiah(changeAmt)} />

          {data.notes && (
            <>
              <Divider />
              <div className="italic text-[10px]">Catatan: {data.notes}</div>
            </>
          )}

          <Divider />
          <div className="whitespace-pre-line text-center text-[10px]">
            {data.store?.receipt_footer ?? "Terima kasih telah berbelanja."}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
          #receipt-print-area { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </div>
  );
}

function Divider() {
  return <div className="my-1.5 border-t border-dashed border-black" />;
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex justify-between gap-2 text-[10px]">
      <span className="text-slate-700 font-medium">{left}:</span>
      <span className="font-extrabold text-black text-right">{right}</span>
    </div>
  );
}
