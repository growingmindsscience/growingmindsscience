import Link from "next/link";
import { login } from "@/app/auth/actions";
import { Button, Card, Field, Input } from "@/components/ui";

export const metadata = { title: "Sign in to your classes — Growing Minds Science" };

export default async function ClassLoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const destination = next?.startsWith("/app/classes") || next?.startsWith("/admin/classes")
    ? next : "/app/classes";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-teal">Growing Minds Science · Classes</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink-deep">Sign in to your classes</h1>
        <p className="mt-2 text-sm text-teal-soft">Your classes and lesson progress live in your Growing Minds Science account.</p>
      </div>
      <Card>
        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={destination} />
          <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Password" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
          {error && <p className="text-sm text-[#9C4429]" role="alert">{error}</p>}
          <Button type="submit" className="mt-2">Sign in</Button>
          <Link href="/reset?class=1" className="text-center text-sm text-teal-soft underline">Forgot your password?</Link>
        </form>
      </Card>
      <p className="text-center text-sm text-teal-soft">New here?{" "}
        <Link href={`/class-signup?next=${encodeURIComponent(destination)}`} className="font-semibold text-teal underline">Create an account</Link>
      </p>
      <Link href="https://growingmindsscience.com/classes/" className="text-center text-sm text-teal-soft underline">Back to classes</Link>
    </main>
  );
}
