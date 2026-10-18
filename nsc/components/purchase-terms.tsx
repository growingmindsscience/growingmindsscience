import { sitePath } from "@/lib/site";

/**
 * The fine print under every buy button: the terms of sale, and for the
 * classes the AI narration disclosure (lessons are read by an AI model of
 * Matthew's voice). Links go to the static site, like the rest of the chrome.
 */
export function PurchaseTerms({ narration = false, className = "mt-3" }: { narration?: boolean; className?: string }) {
  return (
    <p className={`${className} text-xs text-ink-muted`}>
      {narration && <>Lessons are written by Matthew and narrated with an AI model of his own voice. </>}
      Buying means you agree to the{" "}
      <a href={sitePath("/terms-of-sale/")} className="underline">terms of sale</a>.
    </p>
  );
}
