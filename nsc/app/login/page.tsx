import Link from "next/link";
import { login } from "@/app/auth/actions";
import { Card, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { brand } from "@/lib/config/brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; confirm?: string }>;
}) {
  const { error, next, confirm } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          {brand.productName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">Welcome back</h1>
      </div>
      {confirm && (
        <p role="status" className="rounded-xl bg-sea-glass/40 px-4 py-3 text-center text-sm text-ink">
          Check your email for a link to confirm your account, then sign in
          here.
        </p>
      )}
      <Card>
        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next ?? "/app"} />
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          {error && (
            <p className="text-sm text-[#9C4429]" role="alert">
              {error}
            </p>
          )}
          <SubmitButton className="mt-2">Sign in</SubmitButton>
          <Link
            href="/reset"
            className="mx-auto inline-flex min-h-11 items-center text-sm text-teal-soft underline"
          >
            Forgot your password?
          </Link>
        </form>
      </Card>
      <p className="text-center text-sm text-teal-soft">
        New here?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next ?? "/app")}`} className="font-semibold text-teal underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
