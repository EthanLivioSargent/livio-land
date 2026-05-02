// Helpers for the per-field privacy toggle on land listings.
// Fields named in PoweredLandListing.privateFields are hidden from public
// viewers but still visible to the owner, admins, and (later) anyone who has
// messaged the owner under MNDA.

export type LandViewerPerms = {
  isOwner: boolean;
  isAdmin: boolean;
  // Future: isInvited (owner invited this email) or hasContactedOwner (an
  // MNDA-signed off-taker who's already messaged). For now those collapse to
  // false unless we look them up explicitly elsewhere.
  isPrivilegedViewer: boolean;
};

/**
 * Returns true if the viewer should see the private value of `fieldName`,
 * false if they should see a "hidden" placeholder.
 */
export function canSeePrivateField(
  fieldName: string,
  privateFields: string[] | null | undefined,
  perms: LandViewerPerms,
): boolean {
  if (!privateFields || privateFields.length === 0) return true;
  if (!privateFields.includes(fieldName)) return true;
  return perms.isOwner || perms.isAdmin || perms.isPrivilegedViewer;
}

/**
 * Convenience: format a value, but show a "hidden" placeholder if the field
 * is private and the viewer doesn't have access.
 */
export function maskedValue<T>(
  fieldName: string,
  value: T,
  formatted: string,
  privateFields: string[] | null | undefined,
  perms: LandViewerPerms,
): string {
  return canSeePrivateField(fieldName, privateFields, perms)
    ? formatted
    : "🔒 Hidden — message owner";
}

// All fields that can be marked private. Anything not in this set is always
// public (e.g. title, location at state level). This is the allowlist that
// the form UI iterates and that the server validates against.
export const PRIVACY_TOGGLEABLE_FIELDS = [
  "acres",
  "availableMW",
  "utilityProvider",
  "substationDistanceMiles",
  "ppaStatus",
  "ppaPricePerMWh",
  "interconnectionStage",
  "expectedEnergization",
  "waterAvailable",
  "waterSourceNotes",
  "fiberAvailable",
  "zoning",
  "askingPrice",
  "pricingModel",
  "county",
] as const;

export type ToggleableField = (typeof PRIVACY_TOGGLEABLE_FIELDS)[number];

export function isToggleableField(name: string): name is ToggleableField {
  return (PRIVACY_TOGGLEABLE_FIELDS as readonly string[]).includes(name);
}
