import Link from "next/link";
import type { Metadata } from "next";
import { NAVIGATOR_DOMAINS } from "@/lib/navigator-types";
import { visibleDomains } from "@/lib/navigator.server";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Should I Be Worried? — Growing Minds Science",
  description:
    "A calm, citation-backed guide for the 2am worry: what's typical at your child's age, exactly what to say to your pediatrician, and how free early intervention works.",
};

export default async function WorriedIndexPage() {
  const visible = visibleDomains();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-10">
      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          Growing Minds Science
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">
          Should I be worried?
        </h1>
        <p className="mt-3 max-w-xl text-ink">
          A few concrete questions about what you actually see your child do.
          Then a clear next step: what&rsquo;s typical at this age, the exact
          sentences to say to your pediatrician, and how free early
          intervention works. No account needed, nothing stored about your
          child.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {NAVIGATOR_DOMAINS.map((d) => {
          const live = visible.has(d.slug);
          return live ? (
            <Link key={d.slug} href={`/worried/${d.slug}`}>
              <Card className="h-full transition-colors hover:bg-sea-glass/20">
                <h2 className="font-semibold text-ink-deep">{d.label}</h2>
                <p className="mt-1 text-sm text-teal">Start here →</p>
              </Card>
            </Link>
          ) : (
            <Card key={d.slug} className="h-full bg-sea-glass/20">
              <h2 className="font-semibold text-ink-deep/70">{d.label}</h2>
              <p className="mt-1 text-sm text-teal-soft">On the way</p>
            </Card>
          );
        })}
      </section>

      <p className="text-sm text-teal-soft">
        Each guide is built from cited sources (CDC milestone checklists and
        peer-reviewed work) and reviewed by a developmental researcher before
        it goes live. It describes and routes; it never diagnoses.
      </p>
    </main>
  );
}
