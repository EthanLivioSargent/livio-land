// Pulls structured land-listing fields out of a free-text description
// using Claude Haiku 4.5. Used by the "Describe your site" textarea on the
// land creation flow so suppliers don't have to fill in 15 form fields by
// hand — they paste a paragraph and we auto-fill the questionnaire.
//
// Cost: ~$0.002 per call on Haiku 4.5 (≈ 800 input tokens + 250 output).
// Errors fall back to {}, so a failed extraction never blocks save.
import Anthropic from "@anthropic-ai/sdk";

// All fields are optional — the model only fills in what it can confidently
// infer. The supplier still gets a chance to review + edit before saving.
export type ExtractedListing = {
  title?: string;
  description?: string;
  location?: string;
  state?: string;
  county?: string;
  country?: string;
  acres?: number;
  availableMW?: number;
  utilityProvider?: string;
  substationDistanceMiles?: number;
  ppaStatus?: "signed" | "in-negotiation" | "available" | "none";
  ppaPricePerMWh?: number;
  interconnectionStage?: "study" | "facility-study" | "LGIA" | "energized";
  expectedEnergization?: string; // ISO yyyy-mm-dd
  waterAvailable?: "yes" | "limited" | "no" | "unknown";
  waterSourceNotes?: string;
  fiberAvailable?: "yes" | "near" | "no" | "unknown";
  zoning?: string;
  askingPrice?: number;
  pricingModel?: "sale" | "lease" | "JV";
  // Fields the model was unsure about — UI uses this to decide which
  // follow-up questions to ask the supplier.
  uncertainFields?: string[];
};

const SYSTEM_PROMPT = `You extract structured information about powered-land sites for data center development from a supplier's free-text description. Return ONE JSON object matching the ExtractedListing schema. Do not invent values — only fill in fields the description clearly states or strongly implies.

Schema (all fields optional):
- title: string (a short headline, ≤ 60 chars, like "200-acre powered site, Maricopa County, 75 MW")
- description: string (clean rewrite of supplier's text into 2–4 sentences, off-taker-readable, no marketing fluff)
- location: string (city or region, e.g. "Phoenix" or "ERCOT West")
- state: string (2-letter US state code only, e.g. "AZ" — leave blank for non-US)
- county: string
- country: string (defaults to "USA" if not stated)
- acres: number
- availableMW: number (deliverable MW, not total facility nameplate)
- utilityProvider: string (e.g. "APS", "ERCOT/Oncor")
- substationDistanceMiles: number
- ppaStatus: one of "signed" | "in-negotiation" | "available" | "none"
- ppaPricePerMWh: number (USD)
- interconnectionStage: one of "study" | "facility-study" | "LGIA" | "energized"
- expectedEnergization: ISO date string YYYY-MM-DD
- waterAvailable: one of "yes" | "limited" | "no" | "unknown"
- waterSourceNotes: string
- fiberAvailable: one of "yes" | "near" | "no" | "unknown"
- zoning: string
- askingPrice: number (USD total — only if explicitly stated)
- pricingModel: one of "sale" | "lease" | "JV"

Also include uncertainFields: array of field names where the description was ambiguous or absent that an off-taker would want to know. Common candidates: availableMW, ppaStatus, interconnectionStage, waterAvailable.

Return ONLY the JSON object, no surrounding markdown or explanation.`;

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it in Railway → livio-land → Variables.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * Extract structured listing fields from a free-text site description.
 * Falls back to an empty object on any error so the UI can still save.
 */
export async function extractListingFromText(
  description: string,
): Promise<ExtractedListing> {
  const trimmed = description.trim();
  if (trimmed.length < 20) {
    // Too short to extract anything useful from.
    return { description: trimmed };
  }

  try {
    const response = await client().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: trimmed }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return {};

    // Strip any code fences the model might add despite our instructions.
    const raw = textBlock.text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");

    const parsed = JSON.parse(raw) as ExtractedListing;

    // Light sanity check on shape — drop anything that isn't a primitive
    // or a known string/number.
    return cleanShape(parsed);
  } catch (e) {
    // Logged for ops but never thrown to the UI — supplier can still save
    // by filling in fields by hand if extraction fails.
    console.error("[ai-extract] Failed to extract listing:", e);
    return { description: trimmed };
  }
}

function cleanShape(raw: unknown): ExtractedListing {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: ExtractedListing = {};
  const strKeys = [
    "title",
    "description",
    "location",
    "state",
    "county",
    "country",
    "utilityProvider",
    "waterSourceNotes",
    "zoning",
    "expectedEnergization",
  ] as const;
  for (const k of strKeys) {
    if (typeof r[k] === "string") (out as Record<string, unknown>)[k] = r[k];
  }
  const numKeys = [
    "acres",
    "availableMW",
    "substationDistanceMiles",
    "ppaPricePerMWh",
    "askingPrice",
  ] as const;
  for (const k of numKeys) {
    if (typeof r[k] === "number" && Number.isFinite(r[k]))
      (out as Record<string, unknown>)[k] = r[k];
  }
  const enumKeys: Record<string, readonly string[]> = {
    ppaStatus: ["signed", "in-negotiation", "available", "none"],
    interconnectionStage: ["study", "facility-study", "LGIA", "energized"],
    waterAvailable: ["yes", "limited", "no", "unknown"],
    fiberAvailable: ["yes", "near", "no", "unknown"],
    pricingModel: ["sale", "lease", "JV"],
  };
  for (const [k, allowed] of Object.entries(enumKeys)) {
    if (typeof r[k] === "string" && allowed.includes(r[k] as string)) {
      (out as Record<string, unknown>)[k] = r[k];
    }
  }
  if (Array.isArray(r.uncertainFields)) {
    out.uncertainFields = r.uncertainFields.filter(
      (s): s is string => typeof s === "string",
    );
  }
  return out;
}
