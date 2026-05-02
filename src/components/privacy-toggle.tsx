"use client";

import { useState, useTransition } from "react";
import { toggleLandFieldPrivacy } from "@/lib/listing-actions";

/**
 * Eye-with-slash icon next to a form field label. Click to toggle whether
 * that single field is hidden from public listing viewers.
 *
 * Visual states:
 *  - Public (default): outlined eye icon, slate gray, tooltip "Visible to off-takers"
 *  - Private: filled eye-slash, amber, tooltip "Hidden — only you, admins, and
 *    off-takers who message you can see this"
 */
export function PrivacyToggle({
  listingId,
  fieldName,
  initialPrivate,
}: {
  listingId: string;
  fieldName: string;
  initialPrivate: boolean;
}) {
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [pending, startTransition] = useTransition();

  const onToggle = () => {
    startTransition(async () => {
      const r = await toggleLandFieldPrivacy(listingId, fieldName);
      if (r.ok) setIsPrivate(r.private);
    });
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      title={
        isPrivate
          ? "Hidden — click to make this field visible to off-takers"
          : "Visible to off-takers — click to hide"
      }
      aria-label={
        isPrivate ? `Make ${fieldName} public` : `Hide ${fieldName} from public`
      }
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition disabled:opacity-50 ${
        isPrivate
          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
      }`}
    >
      {isPrivate ? (
        // Eye-slash (private)
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </svg>
      ) : (
        // Eye (public)
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}
