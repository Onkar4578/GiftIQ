"use client";

import { FormEvent, useState } from "react";

const EXAMPLES = [
  {
    label: "Diwali hampers for clients",
    text: "50 Diwali hampers for our key clients, budget around ₹1,500 each, our logo on the box, needed by 3 November.",
  },
  {
    label: "Welcome kits for new joiners",
    text: "Welcome kits for 30 new joiners starting 1 December. Budget ₹1,500 each, must carry our company logo.",
  },
  {
    label: "Annual awards",
    text: "12 trophies and mementos for our top performers, names engraved, ₹1,500 each, ready before 20 December.",
  },
];

const MIN = 15;
const MAX = 2000;

export default function BriefForm({ busy, onSubmit }: { busy: boolean; onSubmit: (brief: string) => void }) {
  const [brief, setBrief] = useState("");
  const tooShort = brief.trim().length < MIN;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!tooShort && !busy) onSubmit(brief.trim());
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="brief" className="mb-1.5 block text-sm font-semibold">
          Describe the gifting job
        </label>
        <textarea
          id="brief"
          className="field resize-y"
          rows={7}
          maxLength={MAX}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="How many people, what budget, when you need it, and whether it carries a logo or names."
          aria-describedby="brief-help"
        />
        <p id="brief-help" className="mt-1.5 flex justify-between text-xs text-slate2">
          <span>The more specific the brief, the closer the quote.</span>
          <span>
            {brief.length}/{MAX}
          </span>
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Start from an example</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex.label} type="button" className="btn-quiet !py-1.5 !text-[13px]" onClick={() => setBrief(ex.text)}>
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={busy || tooShort} aria-busy={busy}>
        {busy ? "Building quote…" : "Build quote"}
      </button>
      {tooShort && brief.length > 0 && (
        <p className="text-xs text-slate2">Add a little more detail (at least {MIN} characters).</p>
      )}
    </form>
  );
}
