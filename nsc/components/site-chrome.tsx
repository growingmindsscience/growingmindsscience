import { sitePath } from "@/lib/site";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The Field Guide chrome for every page of this app (Number Path and the
 * classes), matching the marketing site's header and footer so the two read
 * as one site. Links point at the main site through `sitePath`.
 */

/** The mark: arcs in currentColor, the leaf in its own fill (brand-mark.md). */
export function SiteMark({ className }: { className?: string }) {
  return (
    <svg viewBox="8 -6 96 96" width={32} height={32} aria-hidden="true" focusable="false" className={`site-mark ${className ?? ""}`}>
      <g fill="none" stroke="currentColor" strokeWidth={11.0} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.00,88.00 L16.00,82.00 A44.00,44.00 0 0 1 50.85,38.96" />
        <path d="M39.00,91.00 L39.00,88.00 A27.00,27.00 0 0 1 66.00,61.00 L78.00,61.00" />
      </g>
      <path className="site-mark__leaf" d="M49.35,39.96 C43.58,16.28 74.29,-4.99 95.31,1.39 C94.25,18.80 69.07,42.93 49.35,39.96 Z" />
    </svg>
  );
}

/** The wordmark lockup: the mark, "growing minds" in Newsreader, a tracked SCIENCE in Inter. */
export function SiteWordmark({ href, label = "Growing Minds Science, home" }: { href: string; label?: string }) {
  return (
    <a href={href} aria-label={label} className="site-wordmark inline-flex min-h-11 items-center gap-[0.6em] no-underline">
      <SiteMark className="size-8 shrink-0" />
      <span className="font-display text-[1.35rem] font-medium leading-none tracking-[-0.01em]">growing minds</span>
      <span className="site-wordmark__desc relative top-[0.22em] font-body text-[11px] font-medium uppercase tracking-[0.32em]">Science</span>
    </a>
  );
}

const SITE_LINKS: [string, string][] = [
  ["Explore", "/explore/"],
  ["Classes", "/classes/"],
  ["Tools", "/tools/"],
  ["Articles", "/articles/"],
  ["About", "/about/"],
];

const NAV_LINK =
  "inline-flex min-h-11 items-center px-3 text-[0.9375rem] font-medium text-ink-soft underline decoration-transparent decoration-1 underline-offset-[0.35em] transition-colors hover:text-ink-deep hover:decoration-current";

/** The site header: the wordmark, then the main site's sections. On a phone the sections fold into a menu. */
export function SiteHeader() {
  return (
    <header className="site-header border-b border-line bg-ground print:hidden">
      <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-6 px-4 sm:px-6">
        <SiteWordmark href={sitePath("/")} />
        <nav aria-label="Primary" className="hidden items-center md:flex">
          {SITE_LINKS.map(([label, path]) => (
            <a key={path} href={sitePath(path)} className={NAV_LINK}>{label}</a>
          ))}
        </nav>
        <details className="site-menu relative md:hidden">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center px-3 text-[0.9375rem] font-medium text-ink-deep [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <nav aria-label="Primary" className="absolute right-0 top-full z-20 mt-2 w-56 rounded-card border border-line bg-surface p-2 shadow-lg">
            {SITE_LINKS.map(([label, path]) => (
              <a key={path} href={sitePath(path)} className={`${NAV_LINK} w-full`}>{label}</a>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}

const FOOTER_COLS: [string, [string, string][]][] = [
  ["Classes", [["Birth to 12 months", "/classes/birth-to-12-months"], ["Toddler years", "/classes/toddlerhood"], ["Preschool years", "/classes/preschool"], ["Pricing", "/pricing"]]],
  ["Tools", [["It’s hard right now", "/tools/right-now"], ["Growing Minds AI", "/tools/growing-minds-ai"], ["Milestone tracker", "/milestones"], ["All tools and guides", "/tools/"]]],
  ["About", [["Our approach", "/about/"], ["Articles", "/articles/"], ["FAQ", "/faq/"], ["Contact", "/contact/"]]],
];

const FOOTER_LINK =
  "inline-flex min-h-11 items-center text-on-dark-soft underline decoration-transparent decoration-1 underline-offset-[0.35em] transition-colors hover:text-on-dark hover:decoration-current";

/** The site footer: the inverted field, the wordmark, the main site's sections, and the one disclaimer. */
export function SiteFooter() {
  return (
    <footer className="site-footer ink-band bg-ink-900 text-on-dark-soft print:hidden">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <div className="flex flex-col gap-4">
          <SiteWordmark href={sitePath("/")} />
          <p className="max-w-[30ch] text-[0.9375rem] text-on-dark-soft">
            A living field guide to the growing mind, for parents of children 0 to 5.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
          {FOOTER_COLS.map(([heading, links]) => (
            <div key={heading}>
              <h2 className="font-body text-[0.9375rem] font-semibold tracking-normal text-on-dark">{heading}</h2>
              <ul className="mt-2">
                {links.map(([label, path]) => (
                  <li key={path}><a href={sitePath(path)} className={FOOTER_LINK}>{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-white/15 px-4 py-4 text-xs text-on-dark-muted sm:px-6">
        <p>&copy; 2026 Growing Minds Science &middot; Educational content only. Not medical or psychological advice.</p>
        <ThemeToggle className={FOOTER_LINK} />
      </div>
    </footer>
  );
}
