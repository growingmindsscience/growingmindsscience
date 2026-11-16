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
 * Classes and Tallykin share an account and nothing else, so no Number
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
          {showNumberPath && <Link href="/app" className={NAV_LINK}>Tallykin</Link>}
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
export function ClassAuthFrame({ title, lede, children, footer, context, back, wordmarkHref = "/class-login" }: {
  title: string;
  lede?: string;
  children: ReactNode;
  footer: ReactNode;
  /** Shown above the form, e.g. what the parent is on the way to buying. */
  context?: ReactNode;
  /** The quiet way back out: the class catalog unless the parent is enrolling (see enrollBack). */
  back?: { href: string; label: string };
  /** Keeps the page's `next` when the wordmark is tapped mid-enrollment. */
  wordmarkHref?: string;
}) {
  const way = back ?? { href: sitePath("/classes/"), label: "Back to the class catalog" };
  return (
    <ClassShell>
    <main className={`mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 ${back ? "gap-5 py-6 sm:gap-7 sm:py-12" : "gap-7 py-12"}`}>
      <div className="flex flex-col items-center gap-6 text-center">
        {back ? (
          <div className="hidden sm:block"><ClassWordmark href={wordmarkHref} /></div>
        ) : <ClassWordmark href={wordmarkHref} />}
        <div>
          <h1 className="text-3xl text-ink-deep sm:text-4xl">{title}</h1>
          {lede && <p className="mt-3 text-base text-ink-soft [text-wrap:pretty]">{lede}</p>}
        </div>
      </div>
      {context}
      {children}
      <div className="flex flex-col items-center gap-1 text-center text-sm text-ink-soft">
        {footer}
        <a href={way.href} className="inline-flex min-h-11 items-center text-teal underline underline-offset-4">
          {way.label}
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

type EnrollCourse = { shortTitle: string; priceDisplay: string; heading?: string; detailsPath?: string };

/**
 * The way back from a sign-in, sign-up or check-your-email page partway
 * through buying: the class's own public page at its clean URL, or the
 * bundle's row on pricing.
 */
export function enrollBack(course: EnrollCourse): { href: string; label: string } {
  return course.detailsPath
    ? { href: sitePath(course.detailsPath.replace(/\.html$/, "")), label: "Back to the class details" }
    : { href: sitePath("/pricing#all-three"), label: "Back to the bundle on pricing" };
}

/**
 * Reminder on the sign-in, sign-up and check-your-email pages that the
 * parent is partway through buying a class: the class and its one-time
 * price on one line, the one next step, then the terms, so they stay in
 * view at the moment of commitment. The policy text is shared with every
 * other purchase surface.
 */
export function EnrollContext({ course, step }: {
  course: EnrollCourse;
  step: "sign-in" | "sign-up" | "confirm";
}) {
  return (
    <section aria-label={`Enrolling in ${course.shortTitle}`} className="rounded-card border border-line bg-surface px-5 py-4 shadow-sm">
      <p className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className="font-display text-lg font-semibold text-ink-deep">{course.heading ?? `${course.shortTitle} class`}</span>
        <span className="font-semibold tabular-nums text-ink-deep">{course.priceDisplay} once</span>
      </p>
      <p className="mt-1 text-[0.9375rem] font-semibold text-amber-deep [text-wrap:pretty]">
        {step === "confirm"
          ? "Open the link on this device to continue to checkout."
          : "After this step, continue to secure payment."}
      </p>
      <p className="mt-3 border-t border-line pt-3 text-sm text-ink-soft [text-wrap:pretty]">
        Lifetime access, no subscription. {CLASS_REFUND_POLICY}
      </p>
    </section>
  );
}
