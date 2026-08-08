import Image from "next/image";
import Link from "next/link";
import {
  COMPANY_LEGAL_NAME,
  SUPPORT_EMAIL,
  SUPPORT_HREF,
} from "@/lib/publicSite";

export const PublicPageFrame = ({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="min-h-screen bg-[radial-gradient(circle_at_50%_-10%,rgba(37,99,235,0.16),transparent_32rem)] text-white">
    <header className="border-b border-white/[0.07] bg-black/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <Link href="/" aria-label="gotlocks home" className="flex items-end gap-2">
          <Image
            src="/gotlockstext.svg"
            alt="gotlocks"
            width={190}
            height={31}
            className="h-7 w-auto object-contain"
            priority
          />
          <Image
            src="/mainblueblack.svg"
            alt=""
            aria-hidden="true"
            width={34}
            height={33}
            className="h-8 w-8 object-contain"
            priority
          />
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
        >
          Back to home
        </Link>
      </div>
    </header>

    <div className="mx-auto flex min-h-[calc(100vh-77px)] max-w-5xl flex-col px-5 sm:px-6">
      <main className="flex-1 py-20 sm:py-24">
        <article>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.045em] text-white sm:text-5xl">
            {title}
          </h1>
          <div className="mt-10 max-w-3xl rounded-[24px] border border-white/10 bg-white/[0.035] p-6 text-base leading-8 text-slate-300 sm:p-8">
            {children}
          </div>
        </article>
      </main>

      <footer className="flex flex-col gap-4 border-t border-white/[0.08] py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 {COMPANY_LEGAL_NAME}. All rights reserved.</p>
        <nav aria-label="Legal and support navigation">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link href="/privacy-policy" className="transition hover:text-white">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-and-conditions" className="transition hover:text-white">
                Terms and Conditions
              </Link>
            </li>
            <li>
              <a href={SUPPORT_HREF} className="transition hover:text-white">
                {SUPPORT_EMAIL || "Support"}
              </a>
            </li>
          </ul>
        </nav>
      </footer>
    </div>
  </div>
);

export default PublicPageFrame;
