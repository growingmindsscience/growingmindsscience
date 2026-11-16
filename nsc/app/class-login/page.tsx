import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/auth/actions";
import { Card, Field, Input } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { ClassAuthFrame, EnrollContext, enrollBack } from "@/components/class-chrome";
import { getUser } from "@/lib/auth";
import { classDestination, enrollingCourse } from "@/lib/class-paths";
import { sitePath } from "@/lib/site";

export const metadata = {
  title: "Sign in to your classes | From Little Onward",
  description: "Sign in to watch your From Little Onward classes and pick up where you left off.",
};

export default async function ClassLoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string; next?: string; confirm?: string }>;
}) {
  const { error, next, confirm } = await searchParams;
  const destination = classDestination(next);
  // Already signed in (for example through Tallykin): go straight to classes.
  if (await getUser()) redirect(destination);
  const enrolling = enrollingCourse(destination);
  return (
    <ClassAuthFrame
      context={enrolling && <EnrollContext course={enrolling} step={confirm ? "confirm" : "sign-in"} />}
      back={enrolling ? enrollBack(enrolling) : undefined}
      title={confirm ? "Check your email" : enrolling ? "Sign in to enroll" : "Sign in to your classes"}
      lede={confirm
        ? enrolling
          ? "If this is a new account, we sent a confirmation link."
          : "If this is a new account, we sent a link to confirm it. Open it on this device and it takes you straight to your classes."
        : enrolling
          ? undefined
          : "Classes you enrolled in on this site, and your lesson progress, live in your From Little Onward account."}
      wordmarkHref={`/class-login?next=${encodeURIComponent(destination)}`}
      footer={
        <p>New here?{" "}
          <Link href={`/class-signup?next=${encodeURIComponent(destination)}`} className="inline-flex min-h-11 items-center font-semibold text-teal underline underline-offset-4">Create an account</Link>
        </p>
      }
    >
      {confirm ? (
        <div role="status" className="flex flex-col gap-3 rounded-card bg-tint px-5 py-4 text-center text-sm text-ink">
          <p>
            Already have an account with this email, or already confirmed?{" "}
            <Link href={`/class-login?next=${encodeURIComponent(destination)}`} className="font-semibold text-teal underline underline-offset-4">Sign in</Link>{" "}
            or{" "}
            <Link href={`/reset?class=1&next=${encodeURIComponent(destination)}`} className="font-semibold text-teal underline underline-offset-4">reset your password</Link>.
            You will come back to {enrolling ? "checkout" : "your classes"}.
          </p>
          <p>
            Nothing in your inbox after a minute or two? Check spam, then{" "}
            <a href={sitePath("/contact/")} className="font-semibold text-teal underline underline-offset-4">contact us</a> and we will help.
          </p>
        </div>
      ) : (
      <>
      <Card>
        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="flow" value="class" />
          <input type="hidden" name="next" value={destination} />
          <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Password" htmlFor="password"><PasswordInput id="password" name="password" autoComplete="current-password" required /></Field>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <SubmitButton className="mt-2" pendingLabel="Signing in…">Sign in</SubmitButton>
          <Link href={`/reset?class=1&next=${encodeURIComponent(destination)}`} className="mx-auto inline-flex min-h-11 items-center text-sm text-ink-soft underline">Forgot your password?</Link>
        </form>
      </Card>
      </>
      )}
    </ClassAuthFrame>
  );
}
