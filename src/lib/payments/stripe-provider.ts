import type { CreateCheckoutInput, PaymentProvider } from "./types";

export const stripeProvider: PaymentProvider = {
  async createCheckout(_input: CreateCheckoutInput) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY and implement stripe-provider.");
  },

  async confirmCheckout(_sessionId: string, _userId: string) {
    throw new Error("Stripe confirmation is handled via webhook, not direct confirm.");
  },
};
