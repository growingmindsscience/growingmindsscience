import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { CHECKUP_LINKS, type AgeReadout } from "@/lib/norms";
import { sitePath } from "@/lib/site";

/**
 * The "for their age" card, shared by the readout and the progress page.
 * Renders the comparison, or the honest reason there is none (an unclear
 * session, or an age past the published ranges). The checkup line, when
 * present, is never behind the paywall: callers render this card for every
 * reading that carries a followUp.
 */
export function AgeCard({
  readout,
  title,
  footer,
  className,
}: {
  readout: AgeReadout;
  /** Optional small heading (progress page). */
  title?: string;
  /** Range footnote and links, shown only when there is a comparison. */
  footer?: ReactNode;
  className?: string;
}) {
  const caveat = readout.kind === "compare" ? readout.caveat : null;
  return (
    <Card className={className ?? "bg-rung-glow/40"}>
      {title && (
        <h2 className="mb-2 text-[0.9375rem] font-semibold text-amber-deep">
          {title}
        </h2>
      )}
      <p className="text-sm leading-relaxed text-ink">
        <span className="font-semibold text-ink-deep">{readout.headline}</span>{" "}
        {readout.detail}
      </p>
      {caveat && <p className="mt-2 text-xs text-ink-muted">{caveat}</p>}
      {readout.followUp && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-sm leading-relaxed text-ink">{readout.followUp}</p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <a
              href={sitePath(CHECKUP_LINKS.prepPath)}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-teal underline underline-offset-2"
            >
              Get ready for that conversation
            </a>
            <a
              href={CHECKUP_LINKS.cdcConcerned}
              className="inline-flex min-h-11 items-center text-xs text-research underline underline-offset-2"
              rel="noopener"
            >
              Source: CDC, Learn the Signs. Act Early.
            </a>
          </p>
        </div>
      )}
      {readout.kind === "compare" && footer}
    </Card>
  );
}
