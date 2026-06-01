export type CheckoutSession = {
  sessionId: string;
  userId: string;
  amount: number;
  currency: string;
  planId: string;
  discountPercent: number;
  createdAt: number;
};

export type CreateCheckoutInput = {
  userId: string;
  planId: string;
  discountPercent: number;
};

export type PaymentProvider = {
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>;
  confirmCheckout(sessionId: string, userId: string): Promise<{ ok: boolean; error?: string }>;
};

export type UnlockMeta = {
  provider: string;
  reference: string;
  planId: string;
  discountPercent?: number;
};
