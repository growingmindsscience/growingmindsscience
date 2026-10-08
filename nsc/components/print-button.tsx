"use client";

/** Print / Save-as-PDF trigger. Hidden in the printed output itself. */
export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-control bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 print:hidden"
    >
      {label}
    </button>
  );
}
