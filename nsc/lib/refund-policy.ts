/**
 * The class refund policy, in one place so every purchase surface says the
 * same thing as the marketing site (/pricing, the class pages, /faq).
 * Refunds themselves are issued by hand in Stripe; the webhook then revokes
 * the class grant (see revokeRefundedClassPurchase).
 */
export const CLASS_REFUND_POLICY = "Full refund within 14 days if you’ve watched 4 lessons or fewer.";
