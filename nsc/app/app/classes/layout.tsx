import { type ReactNode } from "react";
import { ClassHeader, ClassShell } from "@/components/class-chrome";
import { getUser } from "@/lib/auth";
import { ownedClassSlugs } from "@/lib/classes.server";
import { hasFullAccess } from "@/lib/entitlements.server";

export const metadata = { title: { default: "My classes", template: "%s — Growing Minds Science Classes" } };

/**
 * The classes area has its own chrome. Each page still gates itself with
 * requireClassAuth; the layout only decides what the header shows.
 */
export default async function ClassesLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  // The link to Number Path appears only for an account that owns both.
  let ownsBoth = false;
  if (user) {
    const [classes, numberPath] = await Promise.all([
      ownedClassSlugs(user.id).catch(() => []), hasFullAccess(),
    ]);
    ownsBoth = classes.length > 0 && numberPath;
  }
  return (
    <ClassShell header={<ClassHeader email={user?.email} showNumberPath={ownsBoth} />}>
      {children}
    </ClassShell>
  );
}
