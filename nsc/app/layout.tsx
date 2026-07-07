import type { Metadata } from "next";
import "./globals.css";
import { brand } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `${brand.productName} — ${brand.parentSite}`,
  description:
    "A parent-run early-math check-in that places your child on the counting ladder, then serves a personalized, evidence-tagged plan of household games and daily number talk.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
