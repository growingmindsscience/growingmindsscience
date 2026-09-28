"use client";

/**
 * Last-resort fallback when the root layout itself fails. It replaces the
 * whole document, so it carries its own <html>/<body> and inline styles
 * (the app stylesheet may be what failed).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#F0F5F3",
          color: "#15393C",
          fontFamily: "Georgia, 'Times New Roman', serif",
          lineHeight: 1.6,
        }}
      >
        <main style={{ maxWidth: 440, margin: "0 auto", padding: "18vh 24px 0", textAlign: "center" }}>
          <h1 style={{ fontSize: 26, color: "#0E2A2D", margin: "0 0 12px" }}>
            Number Path didn&rsquo;t load
          </h1>
          <p style={{ margin: "0 0 24px" }}>
            That&rsquo;s on our side, not yours. Your children, check-ins and
            plans are saved.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              minHeight: 48,
              padding: "12px 28px",
              border: 0,
              borderRadius: 999,
              background: "#1E5F62",
              color: "#fff",
              font: "600 16px Helvetica, Arial, sans-serif",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: 20, fontSize: 12, color: "#4E6564" }}>Reference: {error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
