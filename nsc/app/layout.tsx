import type { Metadata } from "next";
import { Bricolage_Grotesque, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/config/brand";

// Brand fonts, matching the parent site (assets/css: --font-display/--font-body).
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: `${brand.productName} — ${brand.parentSite}`,
  description:
    "A parent-run early-math check-in that places your child on the counting ladder, then serves a personalized, evidence-tagged plan of household games and daily number talk.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${sourceSerif.variable}`}>
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
      </body>
    </html>
  );
}
