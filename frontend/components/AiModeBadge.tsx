"use client";

/** Shows a pill badge indicating whether the quote was built by AI or keyword fallback.
 *  Also used as a live status indicator in the Header via the `dot` variant.
 */

interface Props {
  mode: "ai" | "fallback";
  variant?: "badge" | "dot";
}

export default function AiModeBadge({ mode, variant = "badge" }: Props) {
  const isAi = mode === "ai";

  if (variant === "dot") {
    return (
      <span
        title={isAi ? "AI (Gemini) active" : "Keyword fallback mode"}
        className="flex items-center gap-1.5 text-xs font-semibold"
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isAi ? "bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.5)]" : "bg-amber-400"
          }`}
        />
        <span className="hidden sm:inline text-slate2">{isAi ? "Gemini" : "Keyword"}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isAi
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      }`}
      title={isAi ? "This quote was built by Gemini AI" : "AI was unavailable — keyword matching was used instead"}
    >
      {isAi ? (
        <>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
          AI pick
        </>
      ) : (
        <>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Keyword match
        </>
      )}
    </span>
  );
}
