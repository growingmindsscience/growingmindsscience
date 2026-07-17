import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NAVIGATOR_DOMAINS } from "@/lib/navigator-types";
import { getTree } from "@/lib/navigator.server";
import { listActivities } from "@/lib/activities.server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { NavigatorWalker, type PartCRow } from "./walker";

export const dynamic = "force-dynamic";

const DOMAIN_LABELS = new Map<string, string>(
  NAVIGATOR_DOMAINS.map((d) => [d.slug, d.label]),
);

/** Navigator → Activity Library domain mapping for "while you wait". */
const ACTIVITY_DOMAIN: Record<string, string> = {
  talking: "language",
  understanding: "language",
  movement: "gross_motor",
  hands: "fine_motor",
  play: "cognitive",
  social: "social_emotional",
  hearing: "language",
  regulation: "social_emotional",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const label = DOMAIN_LABELS.get(domain);
  if (!label) return { title: "Should I Be Worried? — Growing Minds Science" };
  return {
    title: `${label}: should I be worried? — Growing Minds Science`,
    description: `A calm, citation-backed check on ${label.toLowerCase()} for your child's age, with the exact words to say to your pediatrician and how free early intervention works.`,
  };
}

export default async function WorriedDomainPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const label = DOMAIN_LABELS.get(domain);
  if (!label) notFound();

  const tree = getTree(domain);
  if (!tree) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
        <Card>
          <h1 className="text-2xl font-semibold text-ink-deep">
            The {label.toLowerCase()} guide is on the way
          </h1>
          <p className="mt-3 text-ink">
            Each guide is built from cited sources and reviewed before it goes
            live, so they arrive one at a time. In the meantime, two good
            places to stand:
          </p>
          <ul className="mt-3 flex flex-col gap-2 text-ink">
            <li>
              <Link href="/activities" className="font-semibold text-teal underline">
                The Activity Library
              </Link>{" "}
              — free, age-matched things to do together today.
            </li>
            <li>
              <span className="font-semibold">Your pediatrician</span> — you
              never need a website&rsquo;s permission to ask a question.
            </li>
          </ul>
          <p className="mt-4">
            <Link href="/worried" className="text-sm text-teal-soft underline">
              ← All guides
            </Link>
          </p>
        </Card>
      </main>
    );
  }

  // "While you wait" free activities + verified Part C rows (public read;
  // both render empty-safe).
  const supabase = await createClient();
  const [freeActivities, { data: partC }] = await Promise.all([
    listActivities({ domain: ACTIVITY_DOMAIN[domain] }),
    supabase
      .from("part_c_directory")
      .select("state, state_name, agency_name, phone, url, last_verified")
      .order("state_name"),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-10">
      <header className="print:hidden">
        <Link href="/worried" className="text-sm text-teal-soft underline">
          ← All guides
        </Link>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">
          {label}: should I be worried?
        </h1>
        <p className="mt-3 max-w-xl text-ink">
          A few questions about what you actually see, then a concrete plan.
          Takes about two minutes. Nothing about your child is stored, and the
          full result stays on this screen.
        </p>
      </header>

      <NavigatorWalker
        tree={tree}
        domainLabel={label}
        freeActivities={freeActivities
          .filter((a) => a.is_free)
          .slice(0, 3)
          .map((a) => ({ slug: a.slug, title: a.title, intention: a.intention }))}
        partC={(partC ?? []) as PartCRow[]}
      />
    </main>
  );
}
