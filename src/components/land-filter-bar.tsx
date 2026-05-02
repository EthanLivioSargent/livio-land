"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// Cleaner replacement for the generic SearchBar on /listings/land. Two-row
// layout: prominent search + 4 critical filters always visible, with
// "More filters" disclosure for the long tail.

type SortOption =
  | ""
  | "mw-desc"
  | "mw-asc"
  | "price-asc"
  | "price-desc"
  | "acres-desc";

export function LandFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initial = (key: string) => params.get(key) ?? "";

  const [q, setQ] = useState(initial("q"));
  const [minMW, setMinMW] = useState(initial("minMW"));
  const [stateFilter, setStateFilter] = useState(initial("state"));
  const [ppa, setPpa] = useState(initial("ppa"));
  const [sort, setSort] = useState<SortOption>(
    (initial("sort") as SortOption) || "",
  );
  const [showMore, setShowMore] = useState(false);
  const [maxMW, setMaxMW] = useState(initial("maxMW"));
  const [minAcres, setMinAcres] = useState(initial("minAcres"));
  const [interconnection, setInterconnection] = useState(initial("interconnection"));
  const [deal, setDeal] = useState(initial("deal"));
  const [water, setWater] = useState(initial("water"));
  const [fiber, setFiber] = useState(initial("fiber"));
  const [maxPrice, setMaxPrice] = useState(initial("maxPrice"));

  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const next = new URLSearchParams();
    const set = (k: string, v: string) => {
      if (v.trim()) next.set(k, v.trim());
    };
    set("q", q);
    set("minMW", minMW);
    set("maxMW", maxMW);
    set("minAcres", minAcres);
    set("state", stateFilter);
    set("ppa", ppa);
    set("interconnection", interconnection);
    set("deal", deal);
    set("water", water);
    set("fiber", fiber);
    set("maxPrice", maxPrice);
    set("sort", sort);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const clear = () => {
    setQ(""); setMinMW(""); setMaxMW(""); setMinAcres(""); setStateFilter("");
    setPpa(""); setInterconnection(""); setDeal(""); setWater(""); setFiber("");
    setMaxPrice(""); setSort("");
    router.push(pathname);
  };

  const activeCount = [
    q, minMW, maxMW, minAcres, stateFilter, ppa, interconnection, deal, water, fiber, maxPrice,
  ].filter((v) => v.trim()).length;

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2 items-stretch">
        <div className="relative flex-1 min-w-[240px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by location, county, ISO..." className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
        </div>
        <input type="number" value={minMW} onChange={(e) => setMinMW(e.target.value)} placeholder="Min MW" className="h-10 w-28 rounded-md border border-slate-300 px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
        <input type="text" value={stateFilter} onChange={(e) => setStateFilter(e.target.value.toUpperCase())} placeholder="State" maxLength={2} className="h-10 w-20 rounded-md border border-slate-300 px-3 text-sm uppercase focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
        <select value={ppa} onChange={(e) => setPpa(e.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100">
          <option value="">Any PPA</option><option value="signed">Signed</option><option value="in-negotiation">In negotiation</option><option value="available">Available</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100">
          <option value="">Newest</option><option value="mw-desc">MW: high to low</option><option value="mw-asc">MW: low to high</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="acres-desc">Acres: high to low</option>
        </select>
        <button type="submit" className="h-10 rounded-md bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700">Search</button>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <button type="button" onClick={() => setShowMore((v) => !v)} className="text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1">
          <svg className={`h-3.5 w-3.5 transition-transform ${showMore ? "rotate-90" : ""}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          More filters
        </button>
        {activeCount > 0 && (<button type="button" onClick={clear} className="text-slate-500 hover:text-slate-900">Clear {activeCount} filter{activeCount === 1 ? "" : "s"}</button>)}
      </div>
      {showMore && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 border-t border-slate-100 pt-3">
          <Field label="Max MW"><input type="number" value={maxMW} onChange={(e) => setMaxMW(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm" /></Field>
          <Field label="Min acres"><input type="number" value={minAcres} onChange={(e) => setMinAcres(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm" /></Field>
          <Field label="Interconnection">
            <select value={interconnection} onChange={(e) => setInterconnection(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm">
              <option value="">Any</option><option value="study">Feasibility study</option><option value="facility-study">Facility study</option><option value="LGIA">LGIA executed</option><option value="energized">Energized</option>
            </select>
          </Field>
          <Field label="Deal structure">
            <select value={deal} onChange={(e) => setDeal(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm">
              <option value="">Any</option><option value="sale">Sale</option><option value="lease">Lease</option><option value="JV">Joint venture</option>
            </select>
          </Field>
          <Field label="Water">
            <select value={water} onChange={(e) => setWater(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm">
              <option value="">Any</option><option value="yes">Yes</option><option value="limited">Limited</option><option value="no">No</option>
            </select>
          </Field>
          <Field label="Fiber">
            <select value={fiber} onChange={(e) => setFiber(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm">
              <option value="">Any</option><option value="yes">On site</option><option value="near">Nearby</option><option value="no">None</option>
            </select>
          </Field>
          <Field label="Max asking ($)"><input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="20000000" className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm" /></Field>
        </div>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}
