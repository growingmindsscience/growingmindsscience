import { redirect } from "next/navigation";
import { updatePassword } from "@/app/auth/actions";
import { getUser } from "@/lib/auth";
import { Card, Field } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { brand } from "@/lib/config/brand";
import { ClassShell, ClassWordmark } from "@/components/class-chrome";
import { classDestination } from "@/lib/class-paths";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; class?: string; next?: string }>;
}) {
  const { error, class: classParam, next } = await searchParams;
  const classFlow = classParam === "1";
  // The recovery link signs the parent in via /auth/callback first; with no
  // session there is nothing to update.
  const user = await getUser();
  if (!user) redirect(`/reset?error=${encodeURIComponent("That link expired. Please request a fresh one.")}${classFlow ? `&class=1&next=${encodeURIComponent(classDestination(next))}` : ""}`);

  const page = (
    <main className={`mx-auto flex w-full max-w-md flex-col justify-center gap-6 px-6 py-12 ${classFlow ? "flex-1" : "min-h-screen"}`}>
      <div className="text-center">
        {classFlow
          ? <div className="mb-4 flex justify-center"><ClassWordmark href={`/class-login?next=${encodeURIComponent(classDestination(next))}`} /></div>
          : <p className="text-[0.9375rem] font-semibold text-amber-deep">{brand.productName}</p>}
        <h1 className="mt-1 text-3xl text-ink-deep sm:text-4xl">
          Choose a new password
        </h1>
      </div>
      <Card>
        <form action={updatePassword} className="flex flex-col gap-4">
          {classFlow && <input type="hidden" name="class_flow" value="1" />}
          {classFlow && <input type="hidden" name="next" value={classDestination(next)} />}
          <Field label="New password" htmlFor="password" hint="At least 12 characters.">
            <PasswordInput id="password" name="password" autoComplete="new-password" minLength={12} aria-describedby="password-hint" required />
          </Field>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <SubmitButton className="mt-2">Save and continue</SubmitButton>
        </form>
      </Card>
    </main>
  );
  // Class visitors keep the class look (and its dark theme) through a reset.
  return classFlow ? <ClassShell>{page}</ClassShell> : page;
}
