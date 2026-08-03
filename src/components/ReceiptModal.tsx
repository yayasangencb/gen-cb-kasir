import { Printer, X } from "lucide-react";
import { useState } from "react";
import { rupiah } from "@/lib/format";
import logoAsset from "@/assets/gen-cb-logo.png.asset.json";

export type ReceiptData = {
  transaction_id: string;
  transaction_number: string;
  queue_number: number;
  cashier_name: string | null;
  customer_name: string | null;
  order_type: string;
  created_at: string;
  subtotal: number;
  discount: number;
  grand_total: number;
  amount_paid: number;
  change_amount: number;
  payment_method: string;
  notes: string | null;
  items: { name: string; quantity: number; price: number; subtotal: number; notes: string | null }[];
  store: {
    store_name: string;
    address: string | null;
    phone: string | null;
    receipt_footer: string;
    receipt_paper: string;
    logo_url: string | null;
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4 print:static print:bg-white print:p-0">
      <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <div className="flex gap-1 rounded-xl bg-secondary p-1">
            {(["58mm", "80mm"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPaper(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  paper === p ? "bg-white text-[color:var(--brand-deep)] shadow" : "text-muted-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="btn-brand inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
            >
              <Printer className="h-4 w-4" /> Cetak
            </button>
            <button onClick={onClose} className="rounded-xl bg-secondary p-2" aria-label="Tutup">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          id="receipt-print-area"
          className="mx-auto bg-white font-mono text-[11px] leading-tight text-black"
          style={{ width: widthPx }}
        >
          <div className="text-center">
            <img src={logoAsset.url} alt="Logo GEN-CB" className="mx-auto mb-1 h-12 w-12 object-contain" />
            <div className="text-sm font-bold uppercase">{data.store?.store_name ?? "GEN-CB Kasir"}</div>
            {data.store?.address && <div>{data.store.address}</div>}
            {data.store?.phone && <div>{data.store.phone}</div>}
          </div>

          <Divider />
          <Row left="No" right={data.transaction_number} />
          <Row
            left="Waktu"
            right={new Date(data.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
          />
          <Row left="Kasir" right={data.cashier_name ?? "-"} />
          {data.customer_name && <Row left="Pelanggan" right={data.customer_name} />}
          <Row left="Tipe" right={data.order_type === "take_away" ? "Bawa Pulang" : "Makan di Tempat"} />
          <div className="mt-1 text-center text-base font-bold">
            ANTREAN #{String(data.queue_number).padStart(3, "0")}
          </div>

          <Divider />
          {data.items.map((it, i) => (
            <div key={i} className="mb-1">
              <div className="font-bold">{it.name}</div>
              <div className="flex justify-between">
                <span>
                  {it.quantity} x {rupiah(it.price)}
                </span>
                <span>{rupiah(it.subtotal)}</span>
              </div>
              {it.notes && <div className="italic">* {it.notes}</div>}
            </div>
          ))}

          <Divider />
          <Row left="Subtotal" right={rupiah(data.subtotal)} />
          {data.discount > 0 && <Row left="Diskon" right={`-${rupiah(data.discount)}`} />}
          <div className="flex justify-between text-sm font-bold">
            <span>TOTAL</span>
            <span>{rupiah(data.grand_total)}</span>
          </div>
          <Row left={METHOD_LABEL[data.payment_method] ?? data.payment_method} right={rupiah(data.amount_paid)} />
          <Row left="Kembali" right={rupiah(data.change_amount)} />
          {data.notes && (
            <>
              <Divider />
              <div className="italic">Catatan: {data.notes}</div>
            </>
          )}

          <Divider />
          <div className="whitespace-pre-line text-center">
            {data.store?.receipt_footer ?? "Terima kasih telah berbelanja."}
          </div>
          <div className="mt-1 text-center text-[10px]">Yayasan Generasi Cerdas Beraksi</div>
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
  return <div className="my-1 border-t border-dashed border-black" />;
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{left}</span>
      <span className="text-right">{right}</span>
    </div>
  );
}
