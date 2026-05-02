"use client";

// Owner-side widget that lives on the land listing detail page. Lets the
// owner (a) toggle public/private, (b) see who's been invited, (c) add a
// new email + optional note, (d) revoke an invite.
//
// Render is intentionally compact — fits in the right column of the listing
// detail page on desktop and stacks cleanly on mobile.

import { useState, useTransition } from "react";
import {
  inviteEmailToListing,
  revokeInvite,
  setLandListingVisibility,
} from "@/lib/invite-actions";

export type InviteRow = {
  id: string;
  email: string;
  status: string; // "pending" | "accepted" | "revoked"
  createdAt: string;
  acceptedAt: string | null;
};

export function InviteManager({
  listingId,
  visibility,
  invites,
}: {
  listingId: string;
  visibility: "private" | "public" | string;
  invites: InviteRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<
    | { kind: "ok"; text: string }
    | { kind: "err"; text: string }
    | null
  >(null);

  // Show pending+accepted on top, revoked at bottom (struck through).
  const sortedInvites = [...invites].sort((a, b) => {
    const order = (s: string) => (s === "revoked" ? 1 : 0);
    if (order(a.status) !== order(b.status)) return order(a.status) - order(b.status);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  function submitInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData();
    fd.set("email", email);
    if (message) fd.set("message", message);
    startTransition(async () => {
      const result = await inviteEmailToListing(listingId, fd);
      if ("error" in result && result.error) {
        setFeedback({ kind: "err", text: result.error });
        return;
      }
      setFeedback({
        kind: "ok",
        text: result?.isNew
          ? `Invite sent to ${email.toLowerCase()}.`
          : `Invite to ${email.toLowerCase()} re-sent.`,
      });
      setEmail("");
      setMessage("");
    });
  }

  function onRevoke(inviteId: string, inviteEmail: string) {
    if (!confirm(`Revoke ${inviteEmail}'s access to this listing?`)) return;
    startTransition(async () => {
      const result = await revokeInvite(inviteId);
      if ("error" in result && result.error) {
        setFeedback({ kind: "err", text: result.error });
        return;
      }
      setFeedback({ kind: "ok", text: `Revoked access for ${inviteEmail}.` });
    });
  }

  function toggleVisibility() {
    const next = visibility === "public" ? "private" : "public";
    if (
      next === "public" &&
      !confirm(
        "Make this listing PUBLIC?\n\nIt will be visible to every signed-in off-taker on Livio Land once an admin approves it. You can flip back to private at any time.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await setLandListingVisibility(listingId, next);
      if ("error" in result && result.error) {
        setFeedback({ kind: "err", text: result.error });
        return;
      }
      setFeedback({
        kind: "ok",
        text:
          next === "public"
            ? "Listing is now public."
            : "Listing is now private. Only invited emails can view.",
      });
    });
  }

  const isPrivate = visibility !== "public";
  const activeCount = invites.filter((i) => i.status !== "revoked").length;

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Access &amp; invites</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isPrivate ? (
              <>
                <span className="font-medium text-emerald-700">Private.</span>{" "}
                Only you and people you invite by email can see this listing.
              </>
            ) : (
              <>
                <span className="font-medium text-amber-700">Public.</span>{" "}
                Visible to all signed-in off-takers (after admin approval).
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleVisibility}
          disabled={pending}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {isPrivate ? "Make public" : "Make private"}
        </button>
      </div>

      <form onSubmit={submitInvite} className="mt-5 space-y-3">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Invite by email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="acquisitions@hyperscaler.com"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Optional message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Hi — sharing our Taylor County site for your AI factory build-out."
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send invite"}
        </button>
        {feedback && (
          <p
            className={
              feedback.kind === "ok"
                ? "text-sm text-emerald-700"
                : "text-sm text-red-600"
            }
          >
            {feedback.text}
          </p>
        )}
      </form>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            People with access ({activeCount})
          </h3>
          {invites.length === 0 && (
            <span className="text-xs text-slate-500">No invites yet</span>
          )}
        </div>
        {sortedInvites.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100">
            {sortedInvites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <div
                  className={
                    inv.status === "revoked"
                      ? "text-slate-400 line-through"
                      : "text-slate-900"
                  }
                >
                  <span className="font-medium">{inv.email}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {inv.status === "accepted"
                      ? "✓ accepted"
                      : inv.status === "revoked"
                        ? "revoked"
                        : "pending"}
                  </span>
                </div>
                {inv.status !== "revoked" && (
                  <button
                    type="button"
                    onClick={() => onRevoke(inv.id, inv.email)}
                    disabled={pending}
                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
