import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/auth/actions";
import { Card, Field, Input } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { ClassAuthFrame } from "@/components/class-chrome";
import { getUser } from "@/lib/auth";
import { classDestination } from "@/lib/class-paths";

export const metadata = {
  title: "Sign in to your classes — Growing Minds Science",
  description: "Sign in to watch your Growing Minds Science classes and pick up where you left off.",
};

export default async function ClassLoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string; next?: string; confirm?: string }>;
}) {
  const { error, next, confirm } = await searchParams;
  const destination = classDestination(next);
  // Already signed in (for example through Number Path): go straight to classes.
  if (await getUser()) redirect(destination);
  return (
    <ClassAuthFrame
      title="Sign in to your classes"
      lede="Your classes and lesson progress live in your Growing Minds Science account."
      footer={
        <p>New here?{" "}
          <Link href={`/class-signup?next=${encodeURIComponent(destination)}`} className="inline-flex min-h-11 items-center font-semibold text-teal underline">Create an account</Link>
        </p>
      }
    >
      {confirm && (
        <p role="status" className="rounded-xl bg-sea-glass/40 px-4 py-3 text-center text-sm text-ink">
          Check your email for a link to confirm your account. It brings you straight to your classes.
        </p>
      )}
      <Card>
        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="flow" value="class" />
          <input type="hidden" name="next" value={destination} />
          <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Password" htmlFor="password"><PasswordInput id="password" name="password" autoComplete="current-password" required /></Field>
          {error && <p className="text-sm text-coral-deep" role="alert">{error}</p>}
          <SubmitButton className="mt-2" pendingLabel="Signing in…">Sign in</SubmitButton>
          <Link href="/reset?class=1" className="mx-auto inline-flex min-h-11 items-center text-sm text-ink-soft underline">Forgot your password?</Link>
        </form>
      </Card>
    </ClassAuthFrame>
  );
}
