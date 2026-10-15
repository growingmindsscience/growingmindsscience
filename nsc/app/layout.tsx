import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/config/brand";
import { TimeZoneSync } from "@/components/timezone-sync";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

// Brand fonts, matching the parent site's field guide: Newsreader for
// display, Inter for everything a parent has to read. next/font downloads
// them at build time and serves them from this origin, which the CSP
// (font-src 'self') requires. Both are variable fonts, so any weight works.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-newsreader",
});
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const THEME_SCRIPT =
  "try{var t=localStorage.getItem('gms-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.setAttribute('data-theme','dark');}catch(e){}";

export const metadata: Metadata = {
  title: `${brand.productName} | ${brand.parentSite}`,
  description:
    "A parent-run early-math check-in that places your child on the counting ladder, then serves a personalized, evidence-tagged plan of household games and daily number talk.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved or system theme before paint, with the main site's
            key. Only the classes area styles it (see .class-theme). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        {/* Skip link, matching the parent static site (every page there has one).
            Pages render their own <main> landmark, so this targets a focusable
            wrapper rather than adding a second <main>. */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {/* The Field Guide header and footer, as on the parent site. */}
        <SiteHeader />
        <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col *:w-full">
          {children}
        </div>
        <SiteFooter />
        <TimeZoneSync />
      </body>
    </html>
  );
}
