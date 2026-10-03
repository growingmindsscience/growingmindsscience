import Link from "next/link";
import { redirect } from "next/navigation";
import { signup } from "@/app/auth/actions";
import { Card, Field, Input } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { ClassAuthFrame, EnrollContext } from "@/components/class-chrome";
import { getUser } from "@/lib/auth";
import { classDestination, enrollingCourse } from "@/lib/class-paths";

export const metadata = {
  title: "Create your class account — Growing Minds Science",
  description: "Create a Growing Minds Science account for your self-paced parent classes and lesson progress.",
};

export default async function ClassSignupPage({ searchParams }: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const destination = classDestination(next);
  if (await getUser()) redirect(destination);
  const enrolling = enrollingCourse(destination);
  return (
    <ClassAuthFrame
      context={enrolling && <EnrollContext course={enrolling} step="sign-up" />}
      title="Create your class account"
      wordmarkHref={`/class-signup?next=${encodeURIComponent(destination)}`}
      lede="One place for the classes you own, your lesson progress, and everything else in your account."
      footer={
        <p>Already have an account?{" "}
          <Link href={`/class-login?next=${encodeURIComponent(destination)}`} className="inline-flex min-h-11 items-center font-semibold text-teal underline">Sign in</Link>
        </p>
      }
    >
      <Card>
        <form action={signup} className="flex flex-col gap-4">
          <input type="hidden" name="flow" value="class" />
          <input type="hidden" name="next" value={destination} />
          <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Password" htmlFor="password" hint="At least 12 characters."><PasswordInput id="password" name="password" autoComplete="new-password" minLength={12} aria-describedby="password-hint" required /></Field>
          {error && <p className="text-sm text-coral-deep" role="alert">{error}</p>}
          <SubmitButton className="mt-2" pendingLabel="Creating your account…">Create account</SubmitButton>
        </form>
      </Card>
    </ClassAuthFrame>
  );
}
