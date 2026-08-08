import type { Metadata } from "next";
import Link from "next/link";
import PublicPageFrame from "@/components/marketing/PublicPageFrame";
import { SUPPORT_EMAIL, SUPPORT_HREF } from "@/lib/publicSite";

export const metadata: Metadata = {
  title: "Support | Gotlocks",
  description: "Contact the gotlocks support team.",
};

export default function SupportPage() {
  return (
    <PublicPageFrame eyebrow="Help and support" title="How can we help?">
      {SUPPORT_EMAIL ? (
        <>
          <p>
            For account, League, Arena, or product questions, email the gotlocks
            support team. Include the email address associated with your account and
            a brief description of what you need help with.
          </p>
          <p className="mt-5">
            <a
              href={SUPPORT_HREF}
              className="font-semibold text-sky-200 underline decoration-sky-300/30 underline-offset-4 transition hover:text-sky-100"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </>
      ) : (
        <p>
          Sign in to gotlocks and select <strong className="text-white">Feedback</strong>
          {" "}from the app menu to contact the team about an account or product question.
        </p>
      )}
      <p className="mt-6 text-sm text-slate-500">
        <Link href="/signin" className="font-semibold text-sky-200 underline decoration-sky-300/30 underline-offset-4 transition hover:text-sky-100">
          Sign in to gotlocks
        </Link>
      </p>
    </PublicPageFrame>
  );
}
