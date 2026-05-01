import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
import { getCurrentUser } from "@/lib/session";
import { signout } from "@/lib/auth-actions";
import { prisma } from "@/lib/db";
import { getProfilePhotoUrl } from "@/lib/r2-helpers";

export const metadata: Metadata = {
  title: "Livio Land — The marketplace for powered land",
  description:
    "Connect landowners with utility-ready acreage to the data center developers who need it. Skip the brokers. List your land, search by MW, and ask the questions that actually matter — water, PPA, interconnection.",
};

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
    <html lang="en" className={inter.variable}>
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white font-bold">
                L
              </span>
              <span className="text-lg font-bold text-slate-900">Livio Land</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
              {/* DC Capacity nav link retired — Livio Land is land-only. */}
              <Link href="/listings/land" className="hover:text-brand-600">
                Powered Land
              </Link>
              {user ? (
                <>
                  {user.isAdmin && (
                    <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 border border-red-200">
                      Admin
                    </span>
                  )}
                  <Link href="/inbox" className="relative hover:text-brand-600">
                    Inbox
                    {unreadCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center rounded-full bg-brand-600 text-white text-[10px] font-medium px-1.5 py-0.5 align-top">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/dashboard" className="hover:text-brand-600">
                    Dashboard
                  </Link>
                  <Link
                    href="/listings/new/land"
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
                  >
                    + List land
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 hover:text-brand-600"
                    title="Your profile"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                      {profilePhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profilePhotoUrl}
                          alt={user.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        user.name.slice(0, 1).toUpperCase()
                      )}
                    </span>
                  </Link>
                  <form action={signout}>
                    <button
                      type="submit"
                      className="text-slate-500 hover:text-slate-900"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/auth/signin" className="hover:text-brand-600">
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="rounded-md bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
                  >
                    Get started
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-slate-500 space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <span>© {new Date().getFullYear()} Livio Land</span>
              <span>The marketplace for powered land</span>
            </div>
            {/* Public-facing fee + non-circumvention notice — applies to every
                visitor of every page so there's no question of notice. */}
            <div className="text-[11px] leading-relaxed text-slate-500 border-t border-slate-100 pt-2">
              Any purchase, lease, or joint-venture sourced through Livio Land is subject to a 2% buyer-side
              and 2% seller-side success fee, payable to Livio Building Systems Inc. at close. Bypassing the
              platform on a transaction first introduced through Livio Land — directly or via affiliates —
              triggers liquidated damages of 8% of total deal value plus reasonable legal fees.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
