import Link from "next/link";
import { login } from "@/app/auth/actions";
import { Button, Card, Field, Input } from "@/components/ui";
import { brand } from "@/lib/config/brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-teal">
          {brand.productName}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">Welcome back</h1>
      </div>
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
          <Button type="submit" className="mt-2">
            Sign in
          </Button>
          <Link
            href="/reset"
            className="text-center text-sm text-teal-soft underline"
          >
            Forgot your password?
          </Link>
        </form>
      </Card>
      <p className="text-center text-sm text-teal-soft">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-teal underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
