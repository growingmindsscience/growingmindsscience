import Link from "next/link";
import { type ReactNode } from "react";
import { signoutClasses } from "@/app/auth/actions";
import { sitePath } from "@/lib/site";
import { CLASS_REFUND_POLICY } from "@/lib/refund-policy";
import { SiteWordmark } from "@/components/site-chrome";

const NAV_LINK =
  "inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium text-ink-soft underline decoration-transparent decoration-1 underline-offset-[0.35em] transition-colors hover:text-ink-deep hover:decoration-current";

/**
 * The site wordmark lockup (the mark, "from little", ONWARD), the same as
 * the site header's, for the centered sign-in and sign-up frames.
 */
export function ClassWordmark({ href = "/app/classes" }: { href?: string }) {
  return <SiteWordmark href={href} label="From Little Onward classes" />;
}

/**
 * The classes area's own navigation, a quiet bar under the site header.
 * Classes and Number Path share an account and nothing else, so no Number
 * Path navigation appears here unless the account owns both (`showNumberPath`).
 */
export function ClassHeader({ email, showNumberPath }: { email?: string; showNumberPath: boolean }) {
  return (
    <div className="border-b border-line bg-ground print:hidden">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-1">
        <p className="text-sm font-semibold text-ink-deep">Your classes</p>
        <nav aria-label="Classes" className="flex flex-wrap items-center gap-x-1">
          <Link href="/app/classes" className={NAV_LINK}>My classes</Link>
          {email && <Link href="/app/classes/account" className={NAV_LINK}>Account</Link>}
          {showNumberPath && <Link href="/app" className={NAV_LINK}>Number Path</Link>}
          {email && (
            <form action={signoutClasses}>
              <button type="submit" className={NAV_LINK}>Sign out</button>
            </form>
          )}
        </nav>
      </div>
    </div>
  );
}

/**
 * Wraps every class page: paints the themed ground (see .class-theme in
 * globals.css) and fills the space between the site header and footer, so
 * the footer stays at the bottom of short pages. The footer and the theme
 * toggle are the site's (components/site-chrome.tsx).
 */
export function ClassShell({ header, children }: { header?: ReactNode; children: ReactNode }) {
  return (
    <div className="class-theme flex flex-1 flex-col">
      {header}
      <div className="flex flex-1 flex-col *:w-full">{children}</div>
    </div>
  );
}

/** Shared frame for the class sign-in and sign-up pages. */
export function ClassAuthFrame({ title, lede, children, footer, context, wordmarkHref = "/class-login" }: {
  title: string;
  lede: string;
  children: ReactNode;
  footer: ReactNode;
  /** Shown above the form, e.g. what the parent is on the way to buying. */
  context?: ReactNode;
  /** Keeps the page's `next` when the wordmark is tapped mid-enrollment. */
  wordmarkHref?: string;
}) {
  return (
    <ClassShell>
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-7 px-6 py-12">
      <div className="flex flex-col items-center gap-6 text-center">
        <ClassWordmark href={wordmarkHref} />
        <div>
          <h1 className="text-3xl text-ink-deep sm:text-4xl">{title}</h1>
          <p className="mt-3 text-base text-ink-soft [text-wrap:pretty]">{lede}</p>
        </div>
      </div>
      {context}
      {children}
      <div className="flex flex-col items-center gap-1 text-center text-sm text-ink-soft">
        {footer}
        <a href={sitePath("/classes/")} className="inline-flex min-h-11 items-center text-teal underline underline-offset-4">
          Back to the class catalog
        </a>
      </div>
    </main>
    </ClassShell>
  );
}

/**
 * The one label style for the classes area: sentence case, 15px, weight 600,
 * amber-deep (DESIGN.md has no uppercase tracked eyebrows). It should always
 * say something real, such as the ages or the module. `className` is for
 * spacing only.
 */
export function Eyebrow({ children, className, as: Tag = "p" }: { children: ReactNode; className?: string; as?: "p" | "h2" }) {
  return (
    <Tag className={`font-body text-[0.9375rem] font-semibold leading-snug text-amber-deep ${className ?? ""}`}>
      {children}
    </Tag>
  );
}

/**
 * Reminder on the sign-in and sign-up pages that the parent is partway
 * through buying a class: which step this is, what comes next, and the
 * price and refund policy, so the terms are in view at the moment of
 * commitment. The policy text is shared with every other purchase surface.
 */
export function EnrollContext({ course, step }: {
  course: { shortTitle: string; priceDisplay: string };
  step: "sign-in" | "sign-up";
}) {
  return (
    <section aria-label={`Enrolling in ${course.shortTitle}`} className="rounded-card border border-line bg-surface px-5 py-4 shadow-sm">
      <p className="font-display text-lg font-semibold text-ink-deep">{course.shortTitle} class</p>
      <p className="mt-2 text-[0.9375rem] font-semibold text-amber-deep">
        Step 1 of 2: {step === "sign-up" ? "create your account" : "sign in"}.
      </p>
      <p className="text-[0.9375rem] text-ink-soft">Step 2: pay securely with Stripe.</p>
      <p className="mt-3 border-t border-line pt-3 text-[0.9375rem] text-ink-soft [text-wrap:pretty]">
        <span className="font-semibold text-ink-deep">{course.priceDisplay} once</span>
        {" · "}
        {CLASS_REFUND_POLICY}
      </p>
    </section>
  );
}
