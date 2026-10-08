import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { Card, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { brand } from "@/lib/config/brand";
import { ClassShell, ClassWordmark } from "@/components/class-chrome";
import { classDestination } from "@/lib/class-paths";

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<{ class?: string }>;
}): Promise<Metadata> {
  // Class visitors stay on class branding; everyone else keeps the default.
  if ((await searchParams).class !== "1") return {};
  return {
    title: "Reset your password — Growing Minds Science",
    description: "Reset the password for your Growing Minds Science classes account.",
  };
}

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; class?: string; next?: string }>;
}) {
  const { error, sent, class: classParam, next } = await searchParams;
  const classFlow = classParam === "1";
  // A parent who resets partway through enrolling returns to the same place.
  const destination = classDestination(next);
  const page = (
    <main className={`mx-auto flex w-full max-w-md flex-col justify-center gap-6 px-6 py-12 ${classFlow ? "flex-1" : "min-h-screen"}`}>
      <div className="text-center">
        {classFlow
          ? <div className="mb-4 flex justify-center"><ClassWordmark href={`/class-login?next=${encodeURIComponent(destination)}`} /></div>
          : <p className="text-[0.9375rem] font-semibold text-amber-deep">{brand.productName}</p>}
        <h1 className="mt-1 text-3xl text-ink-deep sm:text-4xl">
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
            {classFlow && <input type="hidden" name="class_flow" value="1" />}
            {classFlow && <input type="hidden" name="next" value={destination} />}
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <SubmitButton className="mt-2">Send reset link</SubmitButton>
          </form>
        </Card>
      )}
      <p className="text-center text-sm text-ink-muted">
        Remembered it?{" "}
        <Link href={classFlow ? `/class-login?next=${encodeURIComponent(destination)}` : "/login"} className="inline-flex min-h-11 items-center font-semibold text-teal underline">
          Sign in
        </Link>
      </p>
    </main>
  );
  // Class visitors keep the class look (and its dark theme) through a reset.
  return classFlow ? <ClassShell>{page}</ClassShell> : page;
}
