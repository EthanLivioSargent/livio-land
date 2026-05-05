"use client";

import { useState, useTransition } from "react";
import { extractDraftFromText, saveDraftLandListing } from "@/lib/draft-listing-actions";

// Public, no-auth /list form. The supplier pastes a free-text description,
// AI Auto-fill populates the structured fields below in local state, the
// supplier reviews and edits, then "Save and create account" stashes the
// draft in the session cookie and bounces to /auth/signup. The signup
// action then materializes the draft into a real PoweredLandListing.
//
// Visual style: Swiss. Three steps separated by 1px rules, no rounded
// corners, no pastel cards. Step numerals set big and unornamented as
// scale anchors (Müller-Brockmann school). All inputs are flat, with a
// hairline border that turns emerald on focus — no shadows, no rings.

type Form = {
  title: string;
  location: string;
  state: string;
  county: string;
  acres: string;
  availableMW: string;
  utilityProvider: string;
  substationDistanceMiles: string;
  ppaStatus: string;
  ppaPricePerMWh: string;
  interconnectionStage: string;
  expectedEnergization: string;
  waterAvailable: string;
  fiberAvailable: string;
  zoning: string;
  askingPrice: string;
  pricingModel: "sale" | "lease" | "JV";
  description: string;
};

const blank: Form = {
  title: "",
  location: "",
  state: "",
  county: "",
  acres: "",
  availableMW: "",
  utilityProvider: "",
  substationDistanceMiles: "",
  ppaStatus: "",
  ppaPricePerMWh: "",
  interconnectionStage: "",
  expectedEnergization: "",
  waterAvailable: "",
  fiberAvailable: "",
  zoning: "",
  askingPrice: "",
  pricingModel: "sale",
  description: "",
};

export function ListForm() {
  const [form, setForm] = useState<Form>(blank);
  const [description, setDescription] = useState("");
  const [extractPending, startExtract] = useTransition();
  const [savePending, startSave] = useTransition();
  const [extractMsg, setExtractMsg] = useState<
    | { kind: "idle" }
    | { kind: "ok"; filled: string[] }
    | { kind: "err"; msg: string }
  >({ kind: "idle" });
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const onAutoFill = () => {
    setExtractMsg({ kind: "idle" });
    startExtract(async () => {
      const fd = new FormData();
      fd.set("description", description);
      const r = await extractDraftFromText(fd);
      if (!r.ok) {
        setExtractMsg({ kind: "err", msg: r.error });
        return;
      }
      const e = r.extracted;
      const filled: string[] = [];
      const setIfBlank = (k: keyof Form, v: string | number | undefined) => {
        if (v === undefined || v === null || v === "") return;
        if (form[k]) return;
        setForm((prev) => ({ ...prev, [k]: String(v) }));
        filled.push(k);
      };
      setIfBlank("title", e.title);
      setIfBlank("location", e.location);
      setIfBlank("state", e.state);
      setIfBlank("county", e.county);
      setIfBlank("acres", e.acres);
      setIfBlank("availableMW", e.availableMW);
      setIfBlank("utilityProvider", e.utilityProvider);
      setIfBlank("substationDistanceMiles", e.substationDistanceMiles);
      setIfBlank("ppaStatus", e.ppaStatus);
      setIfBlank("ppaPricePerMWh", e.ppaPricePerMWh);
      setIfBlank("interconnectionStage", e.interconnectionStage);
      setIfBlank("expectedEnergization", e.expectedEnergization);
      setIfBlank("waterAvailable", e.waterAvailable);
      setIfBlank("fiberAvailable", e.fiberAvailable);
      setIfBlank("zoning", e.zoning);
      setIfBlank("askingPrice", e.askingPrice);
      setIfBlank("description", e.description ?? description);
      setExtractMsg({ kind: "ok", filled });
    });
  };

  const onSave = () => {
    setSaveErr(null);
    startSave(async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.set(k, v));
      const r = await saveDraftLandListing(fd);
      if (r && "error" in r && r.error) {
        setSaveErr(r.error);
      }
    });
  };

  const tooShort = description.trim().length < 20;
  const canSave =
    form.title.trim().length > 0 || form.location.trim().length > 0;

  return (
    <div className="border-y border-[var(--color-rule)]">
      {/* STEP 1 — describe */}
      <Step number="01" title="Tell us about your site" tag="AI auto-fill">
        <p className="text-[14px] leading-[1.6] text-neutral-700 max-w-[65ch]">
          Paste a paragraph or two — utility, MW, acres, PPA status, location,
          anything you'd tell an AI Data Center developer on a call. We fill in
          the questionnaire below automatically. You review before saving.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder="Example: 240 acres in Pinal County, AZ. APS service territory, signed PPA at $42/MWh, 75 MW deliverable today, 25 MW more after 2027 substation upgrade. Substation is 1.8 miles down the road. LGIA executed last quarter. Light industrial zoning, no water restrictions. Asking $7.5M outright or open to JV."
          className="mt-6 block w-full bg-white border border-[var(--color-rule)] px-4 py-3 text-[14px] leading-[1.55] focus:border-emerald-700 focus:outline-none"
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[12px] text-neutral-500">
            {tooShort
              ? "Add at least a couple of sentences before auto-filling."
              : "Click Auto-fill — takes ~1 second."}
          </div>
          <button
            type="button"
            disabled={extractPending || tooShort}
            onClick={onAutoFill}
            className="bg-emerald-700 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {extractPending ? "Auto-filling…" : "Auto-fill questionnaire ↓"}
          </button>
        </div>
        {extractMsg.kind === "ok" && (
          <Note kind="ok">
            <strong className="font-semibold">Done.</strong>{" "}
            {extractMsg.filled.length === 0
              ? "Your form already had values for everything Claude could extract."
              : `Filled ${extractMsg.filled.length} field${extractMsg.filled.length === 1 ? "" : "s"}. Review below — edit anything that's wrong.`}
          </Note>
        )}
        {extractMsg.kind === "err" && <Note kind="err">{extractMsg.msg}</Note>}
      </Step>

      {/* STEP 2 — review */}
      <Step number="02" title="Review the details">
        <p className="text-[14px] leading-[1.6] text-neutral-700 max-w-[65ch]">
          Empty fields are fine — fill in what you know. You can edit everything
          again after you create your account.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <Field label="Headline (e.g. 240 acres · Pinal AZ · 75 MW)">
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputClass} placeholder="Short headline for buyers" />
          </Field>
          <Field label="City / region">
            <input value={form.location} onChange={(e) => set("location", e.target.value)} className={inputClass} placeholder="e.g. Casa Grande or ERCOT West" />
          </Field>
          <Field label="State (2-letter)">
            <input value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))} className={inputClass} placeholder="AZ" />
          </Field>
          <Field label="County">
            <input value={form.county} onChange={(e) => set("county", e.target.value)} className={inputClass} placeholder="Pinal" />
          </Field>
          <Field label="Acres">
            <input type="number" value={form.acres} onChange={(e) => set("acres", e.target.value)} className={inputClass} placeholder="240" />
          </Field>
          <Field label="Available MW">
            <input type="number" value={form.availableMW} onChange={(e) => set("availableMW", e.target.value)} className={inputClass} placeholder="75" />
          </Field>
          <Field label="Utility / ISO">
            <input value={form.utilityProvider} onChange={(e) => set("utilityProvider", e.target.value)} className={inputClass} placeholder="APS, ERCOT/Oncor, BPA…" />
          </Field>
          <Field label="Distance to substation (mi)">
            <input type="number" step="0.1" value={form.substationDistanceMiles} onChange={(e) => set("substationDistanceMiles", e.target.value)} className={inputClass} placeholder="1.8" />
          </Field>
          <Field label="PPA status">
            <select value={form.ppaStatus} onChange={(e) => set("ppaStatus", e.target.value)} className={inputClass}>
              <option value="">—</option>
              <option value="signed">Signed</option>
              <option value="in-negotiation">In negotiation</option>
              <option value="available">Available</option>
              <option value="none">None</option>
            </select>
          </Field>
          <Field label="PPA $/MWh">
            <input type="number" value={form.ppaPricePerMWh} onChange={(e) => set("ppaPricePerMWh", e.target.value)} className={inputClass} placeholder="42" />
          </Field>
          <Field label="Interconnection stage">
            <select value={form.interconnectionStage} onChange={(e) => set("interconnectionStage", e.target.value)} className={inputClass}>
              <option value="">—</option>
              <option value="study">Study</option>
              <option value="facility-study">Facility study</option>
              <option value="LGIA">LGIA executed</option>
              <option value="energized">Energized</option>
            </select>
          </Field>
          <Field label="Expected energization (YYYY-MM-DD)">
            <input type="date" value={form.expectedEnergization} onChange={(e) => set("expectedEnergization", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Water">
            <select value={form.waterAvailable} onChange={(e) => set("waterAvailable", e.target.value)} className={inputClass}>
              <option value="">—</option>
              <option value="yes">Yes</option>
              <option value="limited">Limited</option>
              <option value="no">No</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
          <Field label="Fiber">
            <select value={form.fiberAvailable} onChange={(e) => set("fiberAvailable", e.target.value)} className={inputClass}>
              <option value="">—</option>
              <option value="yes">On site</option>
              <option value="near">Nearby</option>
              <option value="no">No</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
          <Field label="Zoning">
            <input value={form.zoning} onChange={(e) => set("zoning", e.target.value)} className={inputClass} placeholder="Light industrial, data-center overlay…" />
          </Field>
          <Field label="Asking price (USD)">
            <input type="number" value={form.askingPrice} onChange={(e) => set("askingPrice", e.target.value)} className={inputClass} placeholder="7500000" />
          </Field>
          <Field label="Deal type">
            <select value={form.pricingModel} onChange={(e) => set("pricingModel", e.target.value as Form["pricingModel"])} className={inputClass}>
              <option value="sale">Sale</option>
              <option value="lease">Lease</option>
              <option value="JV">JV / partnership</option>
            </select>
          </Field>
        </div>

        <div className="mt-6">
          <Field label="Site description (shown publicly)">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className={inputClass}
              placeholder="2–4 sentences for AI Data Center buyers — what's special, what's already in place, what your ask is."
            />
          </Field>
        </div>
      </Step>

      {/* STEP 3 — save */}
      <Step number="03" title="Save your draft" last>
        <p className="text-[14px] leading-[1.6] text-neutral-700 max-w-[65ch]">
          We'll save what you typed and ask for an email + name on the next
          screen so we can hand the listing off to you. Your site stays in draft
          until you confirm and an admin reviews it — it doesn't go live on the
          platform until both happen.
        </p>
        {saveErr && <Note kind="err">{saveErr}</Note>}
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            type="button"
            disabled={savePending || !canSave}
            onClick={onSave}
            className="bg-emerald-700 px-6 py-3.5 text-[14px] font-medium text-white hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savePending ? "Saving…" : "Save my listing & continue →"}
          </button>
          {!canSave && (
            <div className="text-[12px] text-neutral-500">
              Add a headline or location first.
            </div>
          )}
        </div>
      </Step>
    </div>
  );
}

const inputClass =
  "block w-full bg-white border border-[var(--color-rule)] px-3 py-2.5 text-[14px] focus:border-emerald-700 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-neutral-700 mb-2">
        {label}
      </div>
      {children}
    </label>
  );
}

function Step({
  number,
  title,
  tag,
  children,
  last,
}: {
  number: string;
  title: string;
  tag?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "py-12" : "py-12 border-b border-[var(--color-rule)]"}>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-2">
          <div className="text-5xl font-bold tracking-tight leading-none text-emerald-700">
            {number}
          </div>
        </div>
        <div className="col-span-12 md:col-span-10">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
              {title}
            </h2>
            {tag && (
              <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-emerald-700 border border-emerald-700 px-2 py-0.5">
                {tag}
              </span>
            )}
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Note({
  kind,
  children,
}: {
  kind: "ok" | "err";
  children: React.ReactNode;
}) {
  const cls =
    kind === "ok"
      ? "border-l-2 border-emerald-700 bg-white px-4 py-3 text-[13px] text-emerald-900"
      : "border-l-2 border-red-700 bg-white px-4 py-3 text-[13px] text-red-800";
  return <div className={`mt-4 ${cls}`}>{children}</div>;
}
