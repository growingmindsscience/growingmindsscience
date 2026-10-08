import Link from "next/link";
import { requireClassAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CLASS_COURSES, isClassCourseSlug } from "@/lib/classes";
import { getEntitlementSummary } from "@/lib/entitlements.server";
import { Card, LinkButton } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { signoutClasses } from "@/app/auth/actions";
import { openClassBillingPortal } from "@/app/app/account/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

const SCOPE_LABELS: Record<string, string> = {
  membership: "Membership",
  numberpath_full: "Number Path, full access",
  "ai:unlimited": "Growing Minds AI, unlimited",
  "class:toddlerhood": `${CLASS_COURSES.toddlerhood.shortTitle} class, lifetime access`,
  "class:infant": `${CLASS_COURSES.infant.shortTitle} class, lifetime access`,
  "class:preschool": `${CLASS_COURSES.preschool.shortTitle} class, lifetime access`,
};

const ORDER_STATUS: Record<string, string> = { paid: "Paid", refunded: "Refunded", disputed: "Disputed" };

const BILLING_NOTICE: Record<string, string> = {
  none: "There is no subscription to manage on this account.",
  error: "The billing portal could not be opened. Please try again.",
};

export default async function ClassAccountPage({ searchParams }: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const user = await requireClassAuth("/app/classes/account");
  const supabase = await createClient();
  const [summary, { data: orders }, { data: sub }, { billing }] = await Promise.all([
    getEntitlementSummary(),
    // RLS limits both reads to this account's own rows.
    supabase.from("class_orders")
      .select("stripe_checkout_session_id, course_slug, amount_cents, status, purchased_at")
      .order("purchased_at", { ascending: false }),
    supabase.from("subscriptions")
      .select("cancel_at_period_end, stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    searchParams,
  ]);
  const notice = billing ? BILLING_NOTICE[billing] : undefined;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      <header>
        <Link href="/app/classes" className="inline-flex min-h-11 items-center text-sm text-ink-soft underline">← My classes</Link>
        <h1 className="mt-1 text-3xl text-ink-deep sm:text-4xl">Account</h1>
        <p className="mt-1 text-ink-soft">{user.email}</p>
      </header>

      {notice && <p role="alert" className="rounded-control border border-line bg-tint px-4 py-3 text-sm text-danger">{notice}</p>}

      <Card>
        <h2 className="text-xl text-ink-deep">What you have</h2>
        {summary.scopes.length ? (
          <ul className="mt-3 flex flex-col gap-2">
            {summary.scopes.map((scope) => (
              <li key={scope} className="flex items-start gap-2 text-ink">
                <span aria-hidden className="text-teal">✓</span>
                <span>{SCOPE_LABELS[scope] ?? scope}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-ink-soft">
            Nothing purchased yet. Growing Minds AI is free for five questions a day.
          </p>
        )}
        {sub?.stripe_customer_id && (
          <form action={openClassBillingPortal} className="mt-5">
            <SubmitButton variant="ghost" size="sm" className="border border-line">Manage billing</SubmitButton>
            {sub.cancel_at_period_end && (
              <p className="mt-2 text-sm text-ink-muted">Your plan is set to cancel at the end of the current period.</p>
            )}
          </form>
        )}
      </Card>

      <Card>
        <h2 className="text-xl text-ink-deep">Class purchases</h2>
        {orders?.length ? (
          <ul className="mt-3 divide-y divide-line">
            {orders.map((order) => (
              <li key={order.stripe_checkout_session_id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <span className="font-semibold text-ink-deep">
                  {isClassCourseSlug(order.course_slug) ? CLASS_COURSES[order.course_slug].shortTitle : order.course_slug}
                </span>
                <span className="text-sm text-ink-muted">
                  {new Date(order.purchased_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}
                  {order.amount_cents !== null && ` · $${(order.amount_cents / 100).toFixed(2)}`}
                  {` · ${ORDER_STATUS[order.status] ?? order.status}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-ink-soft">
            No on-site class purchases yet. Your payment receipt is also emailed by Stripe at checkout.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="text-xl text-ink-deep">Sign-in</h2>
        <p className="mt-3 text-ink-soft">One login covers your classes and everything else in your account.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/reset?class=1" variant="ghost" size="sm" className="border border-line">Change password</LinkButton>
          <form action={signoutClasses}>
            <SubmitButton variant="ghost" size="sm" className="border border-line">Sign out</SubmitButton>
          </form>
        </div>
      </Card>
    </main>
  );
}
