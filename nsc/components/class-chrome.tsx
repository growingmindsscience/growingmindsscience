import Link from "next/link";
import { type ReactNode } from "react";
import { signoutClasses } from "@/app/auth/actions";
import { sitePath } from "@/lib/site";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINK =
  "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink transition-colors hover:bg-sea-glass/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal";

export function ClassWordmark({ href = "/app/classes" }: { href?: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
      {/* The same mark as the main site's header. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/nsc/logo-mark.png" alt="" width={36} height={36} className="size-9 shrink-0" />
      <span className="flex flex-col leading-tight">
        <span className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-ink-deep">
          Growing Minds Science
        </span>
        <span className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.18em] text-coral-deep">
          Classes
        </span>
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
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
        <ClassWordmark />
        <nav aria-label="Classes" className="flex flex-wrap items-center gap-1">
          <Link href="/app/classes" className={NAV_LINK}>My classes</Link>
          {email && <Link href="/app/classes/account" className={NAV_LINK}>Account</Link>}
          {showNumberPath && <Link href="/app" className={NAV_LINK}>Number Path</Link>}
          {email && (
            <form action={signoutClasses}>
              <button type="submit" className={`${NAV_LINK} text-ink-soft`}>Sign out</button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}

const FOOTER_LINK =
  "inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-ink-soft underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal";

/** Slim footer for every class page: a way to get help, and the way back out. */
export function ClassFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-3 py-3 text-sm sm:px-6">
        <nav aria-label="Help and site" className="flex flex-wrap items-center">
          <a href={sitePath("/contact/")} className={FOOTER_LINK}>Contact</a>
          <a href={sitePath("/")} className={FOOTER_LINK}>Growing Minds Science home</a>
          <ThemeToggle className={FOOTER_LINK} />
        </nav>
        <p className="px-3 text-xs text-ink-muted">Educational content only. Not medical or psychological advice.</p>
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
      <div className="flex flex-col items-center gap-5 text-center">
        <ClassWordmark href={wordmarkHref} />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-deep">{title}</h1>
          <p className="mt-2 text-base text-ink-soft">{lede}</p>
        </div>
      </div>
      {context}
      {children}
      <div className="flex flex-col items-center gap-1 text-center text-sm text-ink-soft">
        {footer}
        <a href={sitePath("/classes/")} className="inline-flex min-h-11 items-center underline">
          Back to the class catalog
        </a>
      </div>
    </main>
    </ClassShell>
  );
}

/** The one eyebrow style for the classes area. `className` is for spacing only. */
export function Eyebrow({ children, className, as: Tag = "p" }: { children: ReactNode; className?: string; as?: "p" | "h2" }) {
  return (
    <Tag className={`font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.18em] text-coral-deep ${className ?? ""}`}>
      {children}
    </Tag>
  );
}

/**
 * Reminder on the sign-in and sign-up pages that the parent is partway
 * through buying a class, with what comes after this step.
 */
export function EnrollContext({ course, step }: {
  course: { shortTitle: string; priceDisplay: string };
  step: "sign-in" | "sign-up";
}) {
  return (
    <div className="rounded-2xl bg-sea-glass/40 px-5 py-4 text-center">
      <p className="font-[family-name:var(--font-display)] font-semibold text-ink-deep">
        {course.shortTitle} class
      </p>
      <p className="mt-1 text-sm text-ink-soft [text-wrap:balance]">
        {course.priceDisplay}, one payment. {step === "sign-up" ? "Create your account" : "Sign in"}, then pay securely at checkout.
      </p>
    </div>
  );
}
