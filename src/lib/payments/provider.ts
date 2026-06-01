import { demoProvider } from "./demo-provider";
import { stripeProvider } from "./stripe-provider";
import type { PaymentProvider } from "./types";

export function getPaymentProvider(): PaymentProvider {
  switch (process.env.PAYMENT_PROVIDER) {
    case "stripe":
      return stripeProvider;
    default:
      return demoProvider;
  }
}
