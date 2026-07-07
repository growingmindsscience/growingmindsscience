import { brand } from "@/lib/config/brand";

/**
 * Placeholder shell. Real landing (§9 screen 1: ladder hero, honesty card,
 * "10 minutes, a bowl, a bear") ships in the assessment-ux PR through the
 * impeccable design flow.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-teal">
        {brand.parentSite}
      </p>
      <h1 className="text-4xl font-semibold text-ink-deep">
        {brand.productName}
      </h1>
      <p className="text-lg">{brand.tagline}</p>
      <p className="text-sm text-teal-soft">
        In the workshop. The counting ladder is being built.
      </p>
    </main>
  );
}
