import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Besley } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/config/brand";
import { TimeZoneSync } from "@/components/timezone-sync";

// Brand fonts, matching the parent site (DESIGN.md): Besley for display,
// Atkinson Hyperlegible Next for everything a parent has to read. next/font
// downloads them at build time and serves them from this origin, which the
// CSP (font-src 'self') requires. Both are variable fonts, so any weight works.
const besley = Besley({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-besley",
});
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-atkinson",
});

const THEME_SCRIPT =
  "try{var t=localStorage.getItem('gms-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.setAttribute('data-theme','dark');}catch(e){}";

export const metadata: Metadata = {
  title: `${brand.productName} — ${brand.parentSite}`,
  description:
    "A parent-run early-math check-in that places your child on the counting ladder, then serves a personalized, evidence-tagged plan of household games and daily number talk.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${besley.variable} ${atkinson.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved or system theme before paint, with the main site's
            key. Only the classes area styles it (see .class-theme). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        {/* Skip link, matching the parent static site (every page there has one).
            Pages render their own <main> landmark, so this targets a focusable
            wrapper rather than adding a second <main>. */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <TimeZoneSync />
      </body>
    </html>
  );
}
