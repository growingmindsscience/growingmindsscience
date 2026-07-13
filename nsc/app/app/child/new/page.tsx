import { createChild } from "@/app/app/assess/actions";
import { Button, Card, Field, Input } from "@/components/ui";

export default async function NewChildPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-ink-deep">Add a child</h1>
        <p className="mt-2 text-sm text-teal-soft">
          Just a nickname and a birth month. We keep nothing else.
        </p>
      </div>
      <Card>
        <form action={createChild} className="flex flex-col gap-4">
          <Field label="Nickname" htmlFor="nickname" hint="Whatever you call them. Max 30 characters.">
            <Input id="nickname" name="nickname" maxLength={30} required />
          </Field>
          <Field
            label="Birth month"
            htmlFor="birth_month"
            hint="Month only — never the exact day."
          >
            <Input id="birth_month" name="birth_month" type="month" required />
          </Field>
          <Field
            label="Home languages"
            htmlFor="home_languages"
            hint="Optional, comma-separated. The counting steps carry across languages; each language's first number words are learned on their own."
          >
            <Input id="home_languages" name="home_languages" placeholder="English, Spanish" />
          </Field>
          {error && (
            <p className="text-sm text-[#9C4429]" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="mt-2">
            Save and continue
          </Button>
        </form>
      </Card>
    </main>
  );
}
