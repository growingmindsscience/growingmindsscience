import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getEntitlementSummary } from "@/lib/entitlements.server";
import { brand } from "@/lib/config/brand";
import { Button, Card, Field, Input, LinkButton } from "@/components/ui";
import { signout } from "@/app/auth/actions";
import { openBillingPortal, redeemAccessCode } from "./actions";

export const metadata = { title: "Your account" };

const THINKIFIC_CLASS =
  "https://matthew-s-site-de0b.thinkific.com/products/courses/ToddlerYears";

/** Human labels for the raw entitlement scopes. */
const SCOPE_LABELS: Record<string, string> = {
  membership: "Membership — everything, including Number Path",
  numberpath_full: "Number Path — full access",
  "ai:unlimited": "Growing Minds AI — unlimited",
  "class:toddlerhood": "Toddler class — lifetime access",
};

function scopeLabel(scope: string): string {
  return SCOPE_LABELS[scope] ?? (scope.startsWith("class:") ? `Class — ${scope.slice(6)}` : scope);
}

function Notice({ kind }: { kind: string | undefined }) {
  const messages: Record<string, { tone: "ok" | "err"; text: string }> = {
    "code=ok": { tone: "ok", text: "Access code accepted — lifetime AI and class access are linked to your account." },
    "code=invalid": { tone: "err", text: "That access code isn't right. Check your class confirmation email." },
    "code=empty": { tone: "err", text: "Enter your access code first." },
    "code=error": { tone: "err", text: "Something went wrong linking your code. Please try again." },
    "billing=none": { tone: "err", text: "No subscription to manage yet. Billing opens once you have an active plan." },
    "billing=error": { tone: "err", text: "Couldn't open the billing portal. Please try again." },
  };
  const m = kind ? messages[kind] : undefined;
  if (!m) return null;
  return (
    <p
      role="status"
      className={
        m.tone === "ok"
          ? "rounded-xl bg-sea-glass/40 px-4 py-3 text-sm text-ink"
          : "rounded-xl bg-rung-glow px-4 py-3 text-sm text-[#9C4429]"
      }
    >
      {m.text}
    </p>
  );
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const summary = await getEntitlementSummary();

  // Does this account have a Stripe subscription to manage?
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, cancel_at_period_end, stripe_customer_id")
    .eq("user_id", user.id)
    .not("stripe_customer_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const hasBilling = Boolean(sub?.stripe_customer_id);

  const sp = await searchParams;
  const notice = [
    typeof sp.code === "string" ? `code=${sp.code}` : null,
    typeof sp.billing === "string" ? `billing=${sp.billing}` : null,
  ].find(Boolean) as string | undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-teal">
            {brand.productName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink-deep">Your account</h1>
          <p className="mt-1 text-sm text-teal-soft">{user.email}</p>
        </div>
        <form action={signout}>
          <button type="submit" className="text-sm text-teal-soft underline">Sign out</button>
        </form>
      </header>

      {notice && <Notice kind={notice} />}

      {/* What you have */}
      <Card>
        <h2 className="text-lg font-semibold text-ink-deep">What you have</h2>
        {summary.scopes.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {summary.scopes.map((scope) => (
              <li key={scope} className="flex items-start gap-2 text-sm text-ink">
                <span aria-hidden className="mt-1 text-teal">✓</span>
                <span>{scopeLabel(scope)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-teal-soft">
            You're on the free tier. The counting check-in, one sample game, and five
            Growing Minds AI questions a day are yours with no purchase.
          </p>
        )}
        {hasBilling && (
          <form action={openBillingPortal} className="mt-4">
            <Button variant="ghost" type="submit" className="px-4 py-2 text-sm">
              Manage billing
            </Button>
            {sub?.cancel_at_period_end && (
              <p className="mt-2 text-xs text-teal-soft">
                Your plan is set to cancel at the end of the current period.
              </p>
            )}
          </form>
        )}
      </Card>

      {/* Number Path */}
      <Card>
        <p className="text-xs font-medium uppercase tracking-widest text-teal">Number Path</p>
        <h2 className="mt-1 text-lg font-semibold text-ink-deep">
          {summary.numberPath ? "Full access" : "Free check-in"}
        </h2>
        <p className="mt-2 text-sm text-ink">
          {summary.numberPath
            ? "Games, weekly plans, and the number-talk prompts are unlocked."
            : "Run the counting check-in free, then unlock games and weekly plans."}
        </p>
        <div className="mt-4">
          <LinkButton href="/app" className="px-4 py-2 text-sm">
            Open Number Path
          </LinkButton>
        </div>
      </Card>

      {/* Class + AI */}
      <Card>
        <p className="text-xs font-medium uppercase tracking-widest text-teal">Class &amp; AI</p>
        <h2 className="mt-1 text-lg font-semibold text-ink-deep">The toddler class</h2>
        <p className="mt-2 text-sm text-ink">
          Classes are delivered on Thinkific; you'll have received a login link by email
          when you enrolled. Unlimited Growing Minds AI is included with the class.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={THINKIFIC_CLASS}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-soft"
          >
            Go to my class
          </a>
          <a
            href="https://growingmindsscience.com/tools/growing-minds-ai"
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-teal transition-colors hover:bg-sea-glass/40"
          >
            Open Growing Minds AI
          </a>
        </div>

        {!summary.unlimitedAi && (
          <div className="mt-5 border-t border-sea-glass/60 pt-5">
            <p className="text-sm text-ink">
              Bought the class already? Enter the access code from your confirmation
              email to link lifetime AI and class access to this account.
            </p>
            <form action={redeemAccessCode} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Class access code" htmlFor="code">
                <Input id="code" name="code" autoComplete="off" placeholder="Your access code" />
              </Field>
              <Button type="submit" className="px-4 py-2 text-sm">Link it</Button>
            </form>
          </div>
        )}
      </Card>

      <p className="text-center text-sm text-teal-soft">
        <Link href="/" className="underline">Back to Number Path home</Link>
      </p>
    </main>
  );
}
