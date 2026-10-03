import Link from "next/link";
import { type ReactNode } from "react";
import { signoutClasses } from "@/app/auth/actions";
import { sitePath } from "@/lib/site";

const NAV_LINK =
  "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink transition-colors hover:bg-sea-glass/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal";

export function ClassWordmark({ href = "/app/classes" }: { href?: string }) {
  return (
    <Link href={href} className="flex flex-col leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
      <span className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-ink-deep">
        Growing Minds Science
      </span>
      <span className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.18em] text-coral-deep">
        Classes
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

/** Shared frame for the class sign-in and sign-up pages. */
export function ClassAuthFrame({ title, lede, children, footer }: {
  title: string;
  lede: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-7 px-6 py-12">
      <div className="flex flex-col items-center gap-5 text-center">
        <ClassWordmark href="/class-login" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-deep">{title}</h1>
          <p className="mt-2 text-base text-ink-soft">{lede}</p>
        </div>
      </div>
      {children}
      <div className="flex flex-col items-center gap-1 text-center text-sm text-ink-soft">
        {footer}
        <a href={sitePath("/classes/")} className="inline-flex min-h-11 items-center underline">
          Back to the class catalog
        </a>
      </div>
    </main>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-[0.18em] text-coral-deep">
      {children}
    </p>
  );
}
