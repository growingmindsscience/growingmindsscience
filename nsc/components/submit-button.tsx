"use client";

import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

/**
 * Submit button for server-action forms. Disabled until the page has
 * hydrated: a form posted before then takes the no-JS path, whose redirect
 * drops the /nsc base path (the parent lands on the static site's 404 or
 * login page and loses any error message). Also disabled while the action
 * runs, so a second tap can't send the form twice.
 */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & { pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return (
    <Button
      type="submit"
      disabled={!hydrated || pending || disabled}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
