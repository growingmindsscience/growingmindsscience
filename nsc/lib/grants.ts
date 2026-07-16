/**
 * SKU-reconciliation grant rules (portfolio plan 2.2) as pure, testable code.
 * The webhook normalizes Stripe objects into the inputs here; this module
 * decides what a user owns. No I/O.
 *
 * The one rule everything else follows: entitlements are ADDITIVE grants from
 * enumerated sources. Nothing here ever revokes; a lapsed subscription is a
 * grant whose expires_at has passed.
 *
 * | SKU                          | Grant                                        |
 * |------------------------------|----------------------------------------------|
 * | Membership monthly/annual    | membership (expires with the paid period)    |
 * | Legacy AI Pro $9/mo          | membership at the same price (absorption)     |
 * | Legacy $49 class bundle      | class:toddlerhood + ai:unlimited, perpetual   |
 * | Number Path $34 one-time     | numberpath_full, perpetual (kept standalone)  |
 * | Number Path gift redemption  | numberpath_full, perpetual, source gift       |
 */

export type GrantSource =
  | "stripe_sub"
  | "stripe_otp"
  | "stripe_otp_legacy"
  | "gift"
  | "comp"
  | "trial";

export interface Grant {
  product_scope: string;
  source: GrantSource;
  source_ref: string;
  expires_at: string | null; // ISO; null = perpetual
}

/** Price-id wiring, read from env by the caller so tests can inject. */
export interface PriceConfig {
  membershipMonthly?: string;
  membershipAnnual?: string;
  /** The live AI Pro $9/mo price — absorbed into membership (plan 2.2). */
  legacyAiPro?: string;
}

/** Stripe subscription statuses that keep an entitlement alive. past_due is
 * included as dunning grace; the period-end expiry still bounds it. */
const LIVE_SUB_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

/** Grace beyond current_period_end so a slow renewal webhook never flickers
 * access off. */
const RENEWAL_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export function grantsForSubscription(args: {
  subscriptionId: string;
  priceId: string;
  status: string;
  currentPeriodEnd: string | null; // ISO
  prices: PriceConfig;
}): Grant[] {
  const { subscriptionId, priceId, status, currentPeriodEnd, prices } = args;
  const isMembershipPrice =
    priceId === prices.membershipMonthly ||
    priceId === prices.membershipAnnual ||
    priceId === prices.legacyAiPro;
  if (!isMembershipPrice) return [];
  if (!LIVE_SUB_STATUSES.has(status)) {
    // canceled/unpaid/incomplete: never delete — the existing row's
    // expires_at (last paid period) already expresses the lapse.
    return [];
  }
  const expires = currentPeriodEnd
    ? new Date(new Date(currentPeriodEnd).getTime() + RENEWAL_GRACE_MS).toISOString()
    : null;
  return [
    {
      product_scope: "membership",
      source: "stripe_sub",
      source_ref: subscriptionId,
      expires_at: expires,
    },
  ];
}

/** One-time-purchase products this repo grants today or honors from the
 * legacy main-site catalog. */
export function grantsForOneTimePurchase(args: {
  sessionId: string;
  product: string; // metadata.product
}): Grant[] {
  const { sessionId, product } = args;
  switch (product) {
    case "numberpath_full":
      return [
        {
          product_scope: "numberpath_full",
          source: "stripe_otp",
          source_ref: sessionId,
          expires_at: null,
        },
      ];
    case "class_bundle_toddlerhood": // legacy $49 lifetime bundle — honored forever
      return [
        {
          product_scope: "class:toddlerhood",
          source: "stripe_otp_legacy",
          source_ref: sessionId,
          expires_at: null,
        },
        {
          product_scope: "ai:unlimited",
          source: "stripe_otp_legacy",
          source_ref: sessionId,
          expires_at: null,
        },
      ];
    default:
      return [];
  }
}

export function grantForGiftRedemption(args: {
  giftCodeId: string;
}): Grant {
  return {
    product_scope: "numberpath_full",
    source: "gift",
    source_ref: args.giftCodeId,
    expires_at: null,
  };
}

/** Scopes that unlock the full Number Path experience. Membership includes
 * Number Path (plan 2.2); a member who cancels but bought Number Path
 * standalone keeps it — grants are a union. */
const NUMBERPATH_SCOPES = new Set(["numberpath_full", "membership"]);

export function unlocksNumberPath(
  rows: { product_scope: string; expires_at: string | null }[],
  now: Date,
): boolean {
  return rows.some(
    (r) =>
      NUMBERPATH_SCOPES.has(r.product_scope) &&
      (r.expires_at === null || new Date(r.expires_at) > now),
  );
}
