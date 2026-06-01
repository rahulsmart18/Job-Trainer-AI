import { finalPrice } from "./plans";
import { isCheckoutPlanId, planById } from "@/lib/features";
import { deleteCheckoutSession, getCheckoutSession, saveCheckoutSession } from "./sessions";
import type { CreateCheckoutInput, PaymentProvider } from "./types";
import { unlockUserSubscription } from "./unlock";

export const demoProvider: PaymentProvider = {
  async createCheckout(input: CreateCheckoutInput) {
    const planId = isCheckoutPlanId(input.planId) ? input.planId : "full_bundle";
    const plan = planById(planId);
    const amount = finalPrice(plan.basePrice, input.discountPercent);
    const sessionId = `demo_${input.userId}_${Date.now()}`;

    const session = {
      sessionId,
      userId: input.userId,
      amount,
      currency: plan.currency,
      planId: plan.id,
      discountPercent: input.discountPercent,
      createdAt: Date.now(),
    };

    saveCheckoutSession(session);
    return session;
  },

  async confirmCheckout(sessionId: string, userId: string) {
    const session = getCheckoutSession(sessionId);
    if (!session) {
      return { ok: false, error: "Checkout session expired. Please refresh and try again." };
    }
    if (session.userId !== userId) {
      return { ok: false, error: "Invalid checkout session." };
    }

    const result = await unlockUserSubscription(userId, {
      provider: "demo",
      reference: sessionId,
      planId: session.planId,
      discountPercent: session.discountPercent,
    });

    if (result.ok) {
      deleteCheckoutSession(sessionId);
    }

    return result;
  },
};
