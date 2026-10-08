import { Card, LinkButton } from "@/components/ui";

/** Not-found page for the classes area (a stale or mistyped lesson link). */
export default function ClassNotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-6 px-6 py-12 text-center">
      <Card>
        <h1 className="text-2xl text-ink-deep sm:text-3xl">We couldn&rsquo;t find that lesson</h1>
        <p className="mt-3 text-ink">The link may be old, or the lesson may have moved. Your classes are all still here.</p>
        <LinkButton href="/app/classes" className="mt-6">Back to My classes</LinkButton>
      </Card>
    </main>
  );
}
