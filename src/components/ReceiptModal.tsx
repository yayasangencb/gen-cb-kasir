import { rupiah } from "@/lib/format";
import { Printer, X } from "lucide-react";

export type ReceiptData = {
  invoice_no: string;
  queue_no: number;
  cashier_name: string | null;
  created_at: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change_amount: number;
  payment_method: string;
  items: { product_name: string; qty: number; price: number; subtotal: number }[];
};

export function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const handlePrint = () => window.print();
  const d = new Date(data.created_at);
  const dateStr = d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:static print:bg-transparent print:p-0">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-border p-4 print:hidden">
          <div className="font-bold text-[color:var(--brand-deep)]">Struk Pembayaran</div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div id="receipt-print" className="p-6 font-mono text-[13px] text-black">
          <div className="text-center">
            <div className="text-lg font-extrabold tracking-wide">GEN-CB KASIR</div>
            <div className="text-[11px]">Jl. Contoh No. 123 · WA 0812-0000-0000</div>
          </div>
          <div className="my-3 border-t border-dashed border-black" />
          <div className="flex justify-between text-[12px]">
            <span>No. {data.invoice_no}</span>
            <span>Antrean #{String(data.queue_no).padStart(3, "0")}</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span>Kasir: {data.cashier_name || "-"}</span>
            <span>{dateStr}</span>
          </div>
          <div className="my-3 border-t border-dashed border-black" />
          <div className="space-y-1">
            {data.items.map((it, i) => (
              <div key={i}>
                <div>{it.product_name}</div>
                <div className="flex justify-between">
                  <span>
                    {it.qty} x {rupiah(it.price)}
                  </span>
                  <span>{rupiah(it.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="my-3 border-t border-dashed border-black" />
          <Row label="Subtotal" val={rupiah(data.subtotal)} />
          {data.discount > 0 && <Row label="Diskon" val={"- " + rupiah(data.discount)} />}
          {data.tax > 0 && <Row label="Pajak" val={rupiah(data.tax)} />}
          <div className="mt-1 flex justify-between text-base font-extrabold">
            <span>TOTAL</span>
            <span>{rupiah(data.total)}</span>
          </div>
          <div className="my-3 border-t border-dashed border-black" />
          <Row label={`Bayar (${data.payment_method})`} val={rupiah(data.paid)} />
          <Row label="Kembali" val={rupiah(data.change_amount)} />
          <div className="my-4 border-t border-dashed border-black" />
          <div className="text-center text-[12px]">
            <div className="font-bold">Terima kasih!</div>
            <div>Pesanan Anda sedang kami proses.</div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border p-4 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-secondary py-3 font-semibold text-[color:var(--brand-deep)]"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="btn-brand flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold"
          >
            <Printer className="h-5 w-5" /> Cetak / PDF
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print, #receipt-print * { visibility: visible; }
          #receipt-print { position: absolute; left: 0; top: 0; width: 80mm; padding: 6mm; }
        }
      `}</style>
    </div>
  );
}

function Row({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span>{label}</span>
      <span>{val}</span>
    </div>
  );
}
