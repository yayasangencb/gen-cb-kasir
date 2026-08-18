export type PaymentRequest = {
  tenant_id: string;
  transaction_id?: string;
  amount: number;
  payment_method: string;
  customer_name?: string;
  notes?: string;
};

export type PaymentResult = {
  external_reference: string;
  status: "pending" | "paid" | "expired" | "failed";
  qr_string?: string;
  qr_image_url?: string;
  expires_at?: string;
  paid_at?: string;
};

export interface PaymentProviderAdapter {
  provider_code: string;
  provider_name: string;
  createPayment(req: PaymentRequest): Promise<PaymentResult>;
  getPaymentStatus(externalReference: string): Promise<PaymentResult>;
  generateQr(amount: number, reference: string): Promise<{ qr_string: string; qr_image_url: string }>;
  handleWebhook(payload: Record<string, any>, signature?: string): Promise<{ ok: boolean; external_reference: string; status: "paid" | "failed" | "expired" }>;
}

/** Default Simulator Adapter for Staging & Offline POS QRIS */
export class QrisStatikAdapter implements PaymentProviderAdapter {
  provider_code = "qris_statik";
  provider_name = "QRIS Statik / Manual";

  async createPayment(req: PaymentRequest): Promise<PaymentResult> {
    const externalRef = `QRIS-${req.tenant_id.slice(0, 8)}-${Date.now()}`;
    const qrData = await this.generateQr(req.amount, externalRef);
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

    return {
      external_reference: externalRef,
      status: "pending",
      qr_string: qrData.qr_string,
      qr_image_url: qrData.qr_image_url,
      expires_at: expiresAt,
    };
  }

  async getPaymentStatus(externalReference: string): Promise<PaymentResult> {
    return {
      external_reference: externalReference,
      status: "paid",
      paid_at: new Date().toISOString(),
    };
  }

  async generateQr(amount: number, reference: string): Promise<{ qr_string: string; qr_image_url: string }> {
    const qrString = `00020101021226680016ID.CO.QRIS.WWW01189360091430000000000215ID102003847291853033605802ID5912GEN CB KASIR6007JAKARTA61051211062070703A0163048899`;
    const encoded = encodeURIComponent(qrString);
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
    return { qr_string: qrString, qr_image_url: qrImageUrl };
  }

  async handleWebhook(payload: Record<string, any>): Promise<{ ok: boolean; external_reference: string; status: "paid" | "failed" | "expired" }> {
    const ref = payload.external_reference || payload.order_id || `REF-${Date.now()}`;
    return {
      ok: true,
      external_reference: ref,
      status: payload.status === "failed" ? "failed" : "paid",
    };
  }
}

export function getPaymentAdapter(providerCode?: string): PaymentProviderAdapter {
  // Can expand to MidtransAdapter, XenditAdapter, etc.
  return new QrisStatikAdapter();
}
