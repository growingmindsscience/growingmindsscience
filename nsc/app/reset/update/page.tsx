import { redirect } from "next/navigation";
import { updatePassword } from "@/app/auth/actions";
import { getUser } from "@/lib/auth";
import { Button, Card, Field, Input } from "@/components/ui";
import { brand } from "@/lib/config/brand";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // The recovery link signs the parent in via /auth/callback first; with no
  // session there is nothing to update.
  const user = await getUser();
  if (!user) redirect("/reset?error=That+link+expired+%E2%80%94+request+a+fresh+one.");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          {brand.productName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">
          Choose a new password
        </h1>
      </div>
      <Card>
        <form action={updatePassword} className="flex flex-col gap-4">
          <Field label="New password" htmlFor="password" hint="At least 12 characters">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
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
