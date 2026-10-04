import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/auth/actions";
import { Card, Field, Input } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { ClassAuthFrame, EnrollContext } from "@/components/class-chrome";
import { getUser } from "@/lib/auth";
import { classDestination, enrollingCourse } from "@/lib/class-paths";
import { sitePath } from "@/lib/site";

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
  const enrolling = enrollingCourse(destination);
  return (
    <ClassAuthFrame
      context={enrolling && !confirm && <EnrollContext course={enrolling} step="sign-in" />}
      title={confirm ? "Check your email" : "Sign in to your classes"}
      lede={confirm
        ? `We sent you a link to confirm your account. Open it on this device and it takes you straight to ${enrolling ? "checkout" : "your classes"}.`
        : "Your classes and lesson progress live in your Growing Minds Science account."}
      wordmarkHref={`/class-login?next=${encodeURIComponent(destination)}`}
      footer={
        <p>New here?{" "}
          <Link href={`/class-signup?next=${encodeURIComponent(destination)}`} className="inline-flex min-h-11 items-center font-semibold text-teal underline">Create an account</Link>
        </p>
      }
    >
      {confirm ? (
        <p role="status" className="rounded-2xl bg-sea-glass/40 px-5 py-4 text-center text-sm text-ink">
          Nothing in your inbox after a minute or two? Check spam, then{" "}
          <a href={sitePath("/contact/")} className="font-semibold text-teal underline">contact us</a> and we will help.{" "}
          Already confirmed?{" "}
          <Link href={`/class-login?next=${encodeURIComponent(destination)}`} className="font-semibold text-teal underline">Sign in</Link>.
        </p>
      ) : (
      <Card>
        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="flow" value="class" />
          <input type="hidden" name="next" value={destination} />
          <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Password" htmlFor="password"><PasswordInput id="password" name="password" autoComplete="current-password" required /></Field>
          {error && <p className="text-sm text-coral-deep" role="alert">{error}</p>}
          <SubmitButton className="mt-2" pendingLabel="Signing in…">Sign in</SubmitButton>
          <Link href={`/reset?class=1&next=${encodeURIComponent(destination)}`} className="mx-auto inline-flex min-h-11 items-center text-sm text-ink-soft underline">Forgot your password?</Link>
        </form>
      </Card>
      )}
    </ClassAuthFrame>
  );
}
