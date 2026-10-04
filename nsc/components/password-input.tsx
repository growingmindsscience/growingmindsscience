"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui";

/** Password field with a Show/Hide control, for typing a long password on a phone. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative flex flex-col">
      <Input type={shown ? "text" : "password"} className={`pr-16 ${className ?? ""}`} {...props} />
      <button
        type="button"
        onClick={() => setShown((value) => !value)}
        aria-pressed={shown}
        aria-label={shown ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 inline-flex min-w-14 items-center justify-center rounded-r-xl px-3 text-sm font-semibold text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}
