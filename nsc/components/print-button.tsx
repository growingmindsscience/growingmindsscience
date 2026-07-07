"use client";

/** Print / Save-as-PDF trigger. Hidden in the printed output itself. */
export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-soft print:hidden"
    >
      {label}
    </button>
  );
}
