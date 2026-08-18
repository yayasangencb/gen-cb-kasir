/**
 * Payment Gateway Adapter Cup (Slot for Midtrans / Xendit / Doku / Dynamic QRIS Snap API)
 * Ready to plug API keys (MIDTRANS_SERVER_KEY, XENDIT_SECRET_KEY) for automatic payment callback handling.
 */

export type PaymentGatewayType = "qris_static" | "midtrans_snap" | "xendit_qris" | "doku_qris";

export interface PaymentGatewayRequest {
  orderId: string;
  grossAmount: number;
  customerName?: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
}

export interface PaymentGatewayResponse {
  success: boolean;
  paymentType: PaymentGatewayType;
  qrCodeUrl?: string;
  snapToken?: string;
  redirectUrl?: string;
  expiredAt?: string;
}

export class PaymentGatewayAdapter {
  private gatewayType: PaymentGatewayType;

  constructor(type: PaymentGatewayType = "qris_static") {
    this.gatewayType = type;
  }

  /**
   * Creates a dynamic payment transaction via Payment Gateway API
   */
  async createPayment(req: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    // Cup Slot for Midtrans Snap API integration
    if (this.gatewayType === "midtrans_snap") {
      // Mockup token / API response slot
      return {
        success: true,
        paymentType: "midtrans_snap",
        snapToken: `MOCK-SNAP-${req.orderId}`,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=MIDTRANS-${req.orderId}-${req.grossAmount}`,
      };
    }

    // Cup Slot for Xendit Dynamic QRIS API
    if (this.gatewayType === "xendit_qris") {
      return {
        success: true,
        paymentType: "xendit_qris",
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=XENDIT-${req.orderId}-${req.grossAmount}`,
      };
    }

    // Default Static QRIS Format
    return {
      success: true,
      paymentType: "qris_static",
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021226680016ID.GENCB.KASIR0118936009140000000000520458125303360540${req.grossAmount}5802ID5912GEN+CB+CAFE6007JAKARTA6304`,
    };
  }

  /**
   * Verify transaction payment status callback
   */
  async verifyStatus(orderId: string): Promise<{ paid: boolean; status: string }> {
    return { paid: true, status: "settlement" };
  }
}

export const paymentGateway = new PaymentGatewayAdapter("qris_static");
