import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { Button, Card, Field, Input } from "@/components/ui";
import { brand } from "@/lib/config/brand";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          {brand.productName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">
          Reset your password
        </h1>
      </div>
      {sent ? (
        <Card className="text-center">
          <p className="text-ink">
            If that email has an account, a reset link is on its way. Open it
            on this device and you&rsquo;ll choose a new password.
          </p>
        </Card>
      ) : (
        <Card>
          <form action={requestPasswordReset} className="flex flex-col gap-4">
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            {error && (
              <p className="text-sm text-[#9C4429]" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="mt-2">
              Send reset link
            </Button>
          </form>
        </Card>
      )}
      <p className="text-center text-sm text-teal-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-teal underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
