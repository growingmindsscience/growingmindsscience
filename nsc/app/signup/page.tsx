import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { Card, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { brand } from "@/lib/config/brand";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-[0.9375rem] font-semibold text-amber-deep">
          {brand.productName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">Create your account</h1>
        <p className="mt-2 text-sm text-ink-muted">{brand.tagline}</p>
      </div>
      <Card>
        <form action={signup} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next ?? "/app"} />
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 12 characters.">
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
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <SubmitButton className="mt-2">Create account</SubmitButton>
        </form>
      </Card>
      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next ?? "/app")}`} className="font-semibold text-teal underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
