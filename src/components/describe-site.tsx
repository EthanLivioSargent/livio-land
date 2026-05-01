"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { autoFillLandListingFromDescription } from "@/lib/listing-actions";

/**
 * "Describe your site" — supplier pastes a free-text paragraph and clicks
 * "Auto-fill". We send it through Claude Haiku 4.5 (server-side), pull out
 * structured fields (acres, MW, PPA status, county, etc.), and populate the
 * questionnaire below it. The supplier reviews and edits before saving.
 *
 * Only blank form fields are filled in — anything the supplier already typed
 * is preserved, so they can refine by editing the description and re-running.
 */
export function DescribeSite({
  listingId,
  initialValue,
}: {
  listingId: string;
  initialValue: string;
}) {
  const [description, setDescription] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "error"; message: string }
    | { kind: "ok"; filled: string[] }
  >({ kind: "idle" });
  const router = useRouter();

  const onAutoFill = () => {
    setResult({ kind: "idle" });
    startTransition(async () => {
      const fd = new FormData();
      fd.set("description", description);
      const r = await autoFillLandListingFromDescription(listingId, fd);
      if (r.ok) {
        setResult({ kind: "ok", filled: r.filled });
        // Refresh server-rendered form fields below with the new values.
        router.refresh();
      } else {
        setResult({ kind: "error", message: r.error });
      }
    });
  };

  const tooShort = description.trim().length < 20;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Describe your site
            <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              AI auto-fill
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Paste a paragraph or two — utility, MW, acres, PPA status, location, anything
            you'd tell an off-taker on a call. Click <strong>Auto-fill</strong> and we'll
            populate the questionnaire below. You can review and edit before saving.
          </p>
        </div>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={6}
        placeholder="Example: 240 acres in Pinal County, AZ. APS service territory, signed PPA at $42/MWh, 75 MW deliverable today, 25 MW more after 2027 substation upgrade. Substation is 1.8 miles down the road. LGIA executed last quarter. Light industrial zoning, no water restrictions. Asking $7.5M outright or open to JV with the off-taker."
        className="mt-4 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {tooShort
            ? "Add at least a couple of sentences before auto-filling."
            : "Click Auto-fill — takes ~1 second. Empty form fields below will be populated; anything you've already typed is left alone."}
        </div>
        <button
          type="button"
          disabled={pending || tooShort}
          onClick={onAutoFill}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Auto-filling…" : "Auto-fill questionnaire"}
        </button>
      </div>

      {result.kind === "ok" && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <strong className="font-semibold">✓ Done.</strong>{" "}
          {result.filled.length === 0
            ? "Nothing new to fill in — your form already has values for everything Claude could extract."
            : `Filled in ${result.filled.length} field${result.filled.length === 1 ? "" : "s"}: ${result.filled.join(", ")}. Review below and edit anything that's wrong before saving.`}
        </div>
      )}

      {result.kind === "error" && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {result.message}
        </div>
      )}
    </div>
  );
}
