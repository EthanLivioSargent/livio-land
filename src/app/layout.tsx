import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

import { getCurrentUser } from "@/lib/session";
import { signout } from "@/lib/auth-actions";
import { prisma } from "@/lib/db";
import { getProfilePhotoUrl } from "@/lib/r2-helpers";
import { LivioLogo } from "@/components/livio-logo";

export const metadata: Metadata = {
  title: "Livio Land — Powered land for AI Data Centers",
  description:
    "The sourcing engine that puts utility-ready powered land in front of AI Data Center developers, hyperscalers, and AI labs. Vetted parcels with MW, PPA status, and interconnection stage on file — MNDA-protected, ready to underwrite.",
};

// Swiss-style shell.
//   - Header: typographic mark, no helmet glyph, no soft pill nav. Nav
//     items separated by hairline, set in 12px caps.
//   - Footer: rule above + below, monospace-feeling fee notice in small
//     caps. No card, no pill, no pastel.
//
// The whole document sits on an off-white canvas (#FAFAFA via globals.css);
// content modules render flat on the canvas with 1px hairline borders for
// separation — no shadows, no gradients, no rounded corners.

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const unreadCount = user
    ? await prisma.message.count({
        where: { recipientId: user.id, read: false },
      })
    : 0;
  const profilePhotoUrl = user ? await getProfilePhotoUrl(user.profilePhotoKey) : null;

  return (
    <html lang="en">
      <body>
        <header className="border-b border-[var(--color-rule)] bg-[var(--color-bg)]">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 py-5 flex items-center justify-between gap-8">
            <Link href="/" className="flex items-center gap-2.5 leading-none">
              <LivioLogo height={34} />
              <span className="text-[26px] font-bold tracking-[-0.02em] text-emerald-700">
                Land
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-7 text-[13px] font-medium text-[var(--color-text)]">
              <Link href="/listings/land" className="hover:text-emerald-700">
                Powered Land
              </Link>
              {user ? (
                <>
                  {user.isAdmin && (
                    <Link href="/admin" className="text-[11px] uppercase tracking-[0.12em] text-emerald-700 hover:underline">Admin</Link>
                  )}
                  <Link href="/inbox" className="relative hover:text-emerald-700">
                    Inbox
                    {unreadCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center bg-emerald-700 text-white text-[10px] font-medium px-1.5 align-top">{unreadCount}</span>
                    )}
                  </Link>
                  <Link href="/dashboard" className="hover:text-emerald-700">Dashboard</Link>
                  <Link href="/listings/new/land" className="bg-emerald-700 px-4 py-2 text-white text-[13px] font-medium hover:bg-emerald-800">+ List land</Link>
                  <Link href="/profile" className="flex items-center" title="Your profile">
                    <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden bg-neutral-200 text-xs font-semibold text-neutral-700">
                      {profilePhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profilePhotoUrl} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        user.name.slice(0, 1).toUpperCase()
                      )}
                    </span>
                  </Link>
                  <form action={signout}>
                    <button type="submit" className="text-neutral-500 hover:text-[var(--color-text)] text-[13px]">Sign out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/auth/signin" className="hover:text-emerald-700">Sign in</Link>
                  <Link href="/auth/signup" className="bg-emerald-700 px-4 py-2 text-white text-[13px] font-medium hover:bg-emerald-800">Get started</Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)]">{children}</main>

        <footer className="border-t border-[var(--color-rule)] bg-[var(--color-bg)]">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 py-10 grid grid-cols-12 gap-6 text-[12px] text-neutral-600">
            <div className="col-span-12 md:col-span-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text)] font-semibold">Livio Land</div>
              <p className="mt-3 leading-relaxed">Sourcing utility-ready powered land for AI Data Center developers, hyperscalers, and AI labs.</p>
            </div>
            <div className="col-span-12 md:col-span-5 md:col-start-8">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-text)] font-semibold">Fee &amp; non-circumvention notice</div>
              <p className="mt-3 leading-relaxed">Any purchase, lease, or joint-venture sourced through Livio Land is subject to a 2% buyer-side and 2% seller-side success fee, payable to Livio Building Systems Inc. at close. Bypassing the platform on a transaction first introduced through Livio Land — directly or via affiliates — triggers liquidated damages of 8% of total deal value plus reasonable legal fees.</p>
            </div>
            <div className="col-span-12 border-t border-[var(--color-rule)] pt-4 text-[11px] text-neutral-500 flex flex-wrap justify-between gap-2">
              <span>© {new Date().getFullYear()} Livio Building Systems, Inc.</span>
              <span className="uppercase tracking-[0.14em]">Livio · Land · Grid</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
