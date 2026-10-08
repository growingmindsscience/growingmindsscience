import Link from "next/link";
import { type ReactNode } from "react";
import { signoutClasses } from "@/app/auth/actions";
import { sitePath } from "@/lib/site";
import { CLASS_REFUND_POLICY } from "@/lib/refund-policy";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINK =
  "inline-flex min-h-11 items-center rounded-control px-3 text-sm font-medium text-ink-soft underline decoration-transparent decoration-2 underline-offset-[0.4em] transition-colors hover:text-ink-deep hover:decoration-amber";

/**
 * The site wordmark: the logo mark and "Growing Minds Science" in Besley 600,
 * the same as the marketing site's header. The mark sits on a white disc in
 * both themes, as it does there.
 */
export function ClassWordmark({ href = "/app/classes" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-3 text-left text-ink-deep no-underline">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/nsc/logo-mark.png"
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-full border border-line-soft bg-white object-contain p-[3px]"
      />
      <span className="font-display text-base font-semibold leading-tight tracking-[-0.005em] sm:text-[1.15rem]">
        Growing Minds Science
      </span>
    </Link>
  );
}

/**
 * Header for the classes area. Classes and Number Path share an account
 * and nothing else, so no Number Path navigation appears here unless the
 * account owns both (`showNumberPath`).
 */
export function ClassHeader({ email, showNumberPath }: { email?: string; showNumberPath: boolean }) {
  return (
    <header className="border-b border-line bg-ground">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-2">
        <ClassWordmark />
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
    </header>
  );
}

const FOOTER_LINK =
  "inline-flex min-h-11 items-center rounded-control px-3 font-medium text-on-dark underline decoration-transparent decoration-2 underline-offset-[0.4em] transition-colors hover:decoration-amber";

/** Slim footer for every class page: a way to get help, and the way back out. Ink-900, as on the site. */
export function ClassFooter() {
  return (
    <footer className="ink-band bg-ink-900 text-on-dark-soft">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-3 py-3 text-sm sm:px-6">
        <nav aria-label="Help and site" className="flex flex-wrap items-center">
          <a href={sitePath("/contact/")} className={FOOTER_LINK}>Contact</a>
          <a href={sitePath("/")} className={FOOTER_LINK}>Growing Minds Science home</a>
          <ThemeToggle className={FOOTER_LINK} />
        </nav>
        <p className="px-3 text-xs text-on-dark-muted">Educational content only. Not medical or psychological advice.</p>
      </div>
    </footer>
  );
}

/**
 * Wraps every class page: paints the themed ground (see .class-theme in
 * globals.css) and keeps the footer at the bottom of short pages.
 */
export function ClassShell({ header, children }: { header?: ReactNode; children: ReactNode }) {
  return (
    <div className="class-theme flex min-h-screen flex-col">
      {header}
      <div className="flex flex-1 flex-col *:w-full">{children}</div>
      <ClassFooter />
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
