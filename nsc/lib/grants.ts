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
 * | Thinkific toddler buyer      | the same, source comp, ref thinkific:<order>  |
 * | Infant class $49 one-time    | class:infant, perpetual                       |
 * | Preschool class $49 one-time | class:preschool, perpetual                    |
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

const DAY_MS = 24 * 60 * 60 * 1000;

/** Grace beyond current_period_end so a slow renewal webhook never flickers
 * access off. */
const RENEWAL_GRACE_MS = 3 * DAY_MS;

/**
 * past_due is dunning, not payment. Stripe advances the billing period when
 * it creates the renewal invoice, so for a past_due subscription
 * current_period_end is the end of a period nobody has paid for (a whole
 * year on an annual plan). Access during dunning is capped at this window,
 * anchored to the start of the unpaid period so webhook replays and repeat
 * logins can't stretch it.
 */
export const PAST_DUE_GRACE_MS = 14 * DAY_MS;

/** Whether a price id is one of the membership SKUs (incl. the absorbed AI Pro). */
export function isMembershipPrice(priceId: string, prices: PriceConfig): boolean {
  if (!priceId) return false;
  return (
    priceId === prices.membershipMonthly ||
    priceId === prices.membershipAnnual ||
    priceId === prices.legacyAiPro
  );
}

export function grantsForSubscription(args: {
  subscriptionId: string;
  priceId: string;
  status: string;
  currentPeriodEnd: string | null; // ISO
  /** ISO start of the current period; anchors the past_due cap. */
  currentPeriodStart?: string | null;
  prices: PriceConfig;
  /** Fallback anchor for the past_due cap when the period start is unknown. */
  now?: Date;
}): Grant[] {
  const { subscriptionId, priceId, status, currentPeriodEnd, prices } = args;
  if (!isMembershipPrice(priceId, prices)) return [];
  if (!LIVE_SUB_STATUSES.has(status)) {
    // canceled/unpaid/incomplete: never delete — the existing row's
    // expires_at (last paid period) already expresses the lapse.
    return [];
  }
  // Fail closed: with no period end there is no bound on access, and a null
  // expires_at would mean "perpetual".
  const periodEndMs = currentPeriodEnd ? new Date(currentPeriodEnd).getTime() : NaN;
  if (!Number.isFinite(periodEndMs)) return [];

  let expiresMs = periodEndMs + RENEWAL_GRACE_MS;
  if (status === "past_due") {
    const startMs = args.currentPeriodStart ? new Date(args.currentPeriodStart).getTime() : NaN;
    const anchorMs = Number.isFinite(startMs) ? startMs : (args.now ?? new Date()).getTime();
    expiresMs = Math.min(expiresMs, anchorMs + PAST_DUE_GRACE_MS);
  }
  return [
    {
      product_scope: "membership",
      source: "stripe_sub",
      source_ref: subscriptionId,
      expires_at: new Date(expiresMs).toISOString(),
    },
  ];
}

/** The subscription fields that carry the billing period, across API versions. */
export interface SubscriptionPeriodSource {
  items?: { data?: { current_period_start?: number | null; current_period_end?: number | null }[] } | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
}

/**
 * Current billing period as ISO strings (null when absent). The Basil API
 * (2025-03-31+) moved the period onto each subscription item; older API
 * versions carry it on the subscription. Read the item first, then fall back,
 * so an endpoint pinned to either version never loses the bound.
 */
export function subscriptionPeriod(sub: SubscriptionPeriodSource): {
  start: string | null;
  end: string | null;
} {
  const item = sub.items?.data?.[0];
  const pick = (a?: number | null, b?: number | null) =>
    typeof a === "number" && a > 0 ? a : typeof b === "number" && b > 0 ? b : null;
  const toIso = (sec: number | null) => (sec === null ? null : new Date(sec * 1000).toISOString());
  return {
    start: toIso(pick(item?.current_period_start, sub.current_period_start)),
    end: toIso(pick(item?.current_period_end, sub.current_period_end)),
  };
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
    case "class_infant":
      return [
        {
          product_scope: "class:infant",
          source: "stripe_otp",
          source_ref: sessionId,
          expires_at: null,
        },
      ];
    case "class_preschool":
      return [
        {
          product_scope: "class:preschool",
          source: "stripe_otp",
          source_ref: sessionId,
          expires_at: null,
        },
      ];
    default:
      return [];
  }
}

/** A verified Thinkific order for the toddler class: the same lifetime
 * class + AI bundle as an on-site purchase. Source "comp" because no Stripe
 * payment backs it; the ref keeps it distinct from the shared access code,
 * which never counts as owning the class. */
export function grantsForLegacyClassPurchase(sourceRef: string): Grant[] {
  if (!/^thinkific:\S/.test(sourceRef)) return [];
  return ["class:toddlerhood", "ai:unlimited"].map((product_scope) => ({
    product_scope,
    source: "comp" as const,
    source_ref: sourceRef,
    expires_at: null,
  }));
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
