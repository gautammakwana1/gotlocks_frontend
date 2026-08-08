import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PricingPlanCarousel from "@/components/marketing/PricingPlanCarousel";
// import {
//   getArenaHostingOffers,
//   getArenaUnlockOffer,
// } from "@/lib/billing/arena";
// import { getProLifetimeOffer } from "@/lib/billing/proLifetime";
import {
  COMPANY_LEGAL_NAME,
  SUPPORT_EMAIL,
  SUPPORT_HREF,
} from "@/lib/publicSite";
import styles from "./pricing.module.css";

export const metadata: Metadata = {
  title: "Plans & Pricing | Gotlocks",
  description:
    "Explore free participation, Pro Lifetime League tools, and Arena hosting plans for gotlocks.",
};

const freeFeatures = [
  "Join unlimited Leagues and Arenas",
  "Create up to 2 active Leagues",
  "Participate in contests and leaderboards",
  "Create Community Picks",
  "Access core League organization tools",
] as const;

const proFeatures = [
  "Create and manage more active Leagues",
  "Increased League member capacity",
  "Expanded commissioner controls",
  "League badge-point customization",
] as const;

const arenaFeatures = [
  "Create and customize a hosted Arena",
  "Create contests, manage leaderboards and easily track winners",
  "Assign Arena managers to help operate your community",
  "Use community engagement and location-based tools",
  "Scale hosting as the community grows",
] as const;

// const getStartingArenaHostingOffer = () => {
//   const startingOffer = getArenaHostingOffers()
//     .filter((offer) => offer.selfService && offer.amountCents !== null)
//     .sort(
//       (first, second) =>
//         (first.amountCents ?? Number.POSITIVE_INFINITY) -
//         (second.amountCents ?? Number.POSITIVE_INFINITY),
//     )[0];

//   if (!startingOffer) {
//     throw new Error("At least one public Arena hosting offer is required.");
//   }

//   return startingOffer;
// };

const PlanFeatures = ({
  items,
  accent = "sky",
}: {
  items: readonly string[];
  accent?: "sky" | "violet" | "slate";
}) => {
  const markerColor =
    accent === "violet"
      ? "bg-violet-300"
      : accent === "slate"
        ? "bg-slate-400"
        : "bg-sky-300";

  return (
    <ul className="mt-7 grid gap-3 text-sm leading-6 text-slate-300 sm:text-base">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span
            aria-hidden="true"
            className={`mt-[0.6rem] size-1.5 shrink-0 rounded-full ${markerColor}`}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
};

export default function PricingPage() {
  // const proOffer = getProLifetimeOffer();
  // const arenaUnlockOffer = getArenaUnlockOffer();
  // const startingArenaHostingOffer = getStartingArenaHostingOffer();
  // const foundingOfferActive = proOffer.kind === "founding";

  return (
    <div className={`${styles.page} text-white`}>
      <a
        href="#pricing-content"
        className={`${styles.skipLink} sr-only z-[100] rounded-lg bg-sky-300 px-4 py-3 font-semibold text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4`}
      >
        Skip to pricing
      </a>

      <header
        className={`${styles.publicHeader} sticky top-0 z-50 border-b border-white/[0.07] bg-black/80 backdrop-blur-xl`}
      >
        <div className={styles.safeInline}>
          <div className="mx-auto flex max-w-7xl flex-nowrap items-center justify-between gap-1 py-3 sm:gap-3">
            <Link
              href="/"
              aria-label="gotlocks home"
              className="flex shrink-0 items-center gap-1 sm:items-end sm:gap-2"
            >
              <Image
                src="/gotlockstext.svg"
                alt="gotlocks"
                width={210}
                height={34}
                className="h-[17px] w-auto object-contain sm:h-8"
                priority
              />
              <Image
                src="/mainblueblack.svg"
                alt=""
                aria-hidden="true"
                width={38}
                height={37}
                className="size-[22px] object-contain sm:size-9"
                priority
              />
            </Link>

            <nav
              aria-label="Primary navigation"
              className="hidden md:order-none md:block md:w-auto lg:flex lg:flex-1 lg:justify-center"
            >
              <ul className="flex items-center gap-5 overflow-x-auto py-1 text-base font-semibold text-slate-300 md:gap-8">
                <li className="shrink-0">
                  <Link
                    className="transition hover:text-white"
                    href="/#how-it-works"
                  >
                    How It Works
                  </Link>
                </li>
                <li className="shrink-0">
                  <Link
                    className="transition hover:text-white"
                    href="/pricing"
                    aria-current="page"
                  >
                    Pricing
                  </Link>
                </li>
                <li className="shrink-0">
                  <Link className="transition hover:text-white" href="/#faq">
                    FAQ
                  </Link>
                </li>
              </ul>
            </nav>

            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/signin"
                className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl px-1 text-[13px] font-semibold text-sky-300 transition hover:bg-sky-400/[0.08] hover:text-sky-100 sm:min-h-12 sm:px-4 sm:text-base"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main id="pricing-content" tabIndex={-1}>
        <section
          aria-labelledby="pricing-title"
          className="relative px-5 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8 lg:pb-20 lg:pt-24"
        >
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-300 sm:text-base">
              Plans &amp; Pricing
            </p>
            <h1
              id="pricing-title"
              className="mt-4 max-w-5xl text-4xl font-black leading-[1.01] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl"
            >
              Start free. Upgrade when you{" "}
              <span className={styles.heroAccent}>need more.</span>
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl sm:leading-9 lg:text-2xl lg:leading-10">
              Join communities and compete for free. Unlock additional League tools
              with Pro Lifetime, or host an Arena for a larger organization.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="available-plans-title"
          className="px-5 pb-20 sm:px-6 sm:pb-24 lg:px-8 lg:pb-28"
        >
          <div className="mx-auto max-w-7xl">
            <h2 id="available-plans-title" className="sr-only">
              Available plans
            </h2>

            <PricingPlanCarousel
              planLabels={["Free", "Pro Lifetime", "Arena Hosting"]}
              className={`${styles.planCarousel} items-stretch gap-4 focus-visible:rounded-[28px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-200 lg:gap-6`}
            >
              <article
                data-pricing-plan
                aria-labelledby="free-plan-title"
                className="flex min-w-0 flex-col rounded-[28px] border border-white/10 bg-white/[0.035] p-6 sm:p-8 lg:p-6 xl:p-8"
              >
                <div>
                  <h3
                    id="free-plan-title"
                    className="text-3xl font-black tracking-[-0.035em] text-white"
                  >
                    Free
                  </h3>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.13em] text-slate-400">
                    For members and casual commissioners
                  </p>
                </div>
                <p className="mt-7 text-5xl font-black tracking-[-0.045em] text-white">
                  $0
                </p>
                <p className="mt-5 text-base leading-7 text-slate-300">
                  Join sports communities, participate in contests, and organize
                  smaller private Leagues.
                </p>
                <PlanFeatures items={freeFeatures} accent="slate" />
              </article>

              <article
                data-pricing-plan
                aria-labelledby="pro-plan-title"
                className={`${styles.proCard} flex min-w-0 flex-col rounded-[28px] border border-sky-300/25 p-6 sm:p-8 lg:p-6 xl:p-8`}
              >
                <div>
                  <h3
                    id="pro-plan-title"
                    className="text-3xl font-black tracking-[-0.035em] text-white"
                  >
                    Pro Lifetime
                  </h3>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.13em] text-sky-200/75">
                    For League commissioners
                  </p>
                </div>
                <p className="mt-7 flex flex-wrap items-baseline gap-x-2 text-white">
                  <span className="text-5xl font-black tracking-[-0.045em]">
                    {/* {proOffer.priceLabel} */}
                    $10
                  </span>{" "}
                  <span className="text-lg font-semibold text-sky-100">
                    {/* {proOffer.cadenceLabel} */}
                    one time
                  </span>
                </p>
                <p className="mt-5 text-base leading-7 text-slate-200">
                  A permanent League upgrade for commissioners who want additional
                  capacity, customization, and control.
                </p>
                <PlanFeatures items={proFeatures} />
                <p className="mt-6 text-xs leading-5 text-slate-400">
                  {/* {foundingOfferActive
                    ? "Current founding-member pricing. Future pricing may change."
                    : "Current one-time pricing. Future pricing may change."} */}
                  Current founding-member pricing. Future pricing may change
                </p>
              </article>

              <article
                data-pricing-plan
                aria-labelledby="arena-plan-title"
                className={`${styles.arenaCard} flex min-w-0 flex-col rounded-[28px] border border-violet-300/20 p-6 sm:p-8 lg:p-6 xl:p-8`}
              >
                <div>
                  <h3
                    id="arena-plan-title"
                    className="text-3xl font-black tracking-[-0.035em] text-white"
                  >
                    Arena Hosting
                  </h3>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.13em] text-violet-200/75">
                    For organizations and hosted communities
                  </p>
                </div>
                <div className="mt-7">
                  <p className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:text-3xl xl:text-4xl">
                    Starting at $10/month
                  </p>
                  <p className="mt-2 text-base font-semibold text-violet-100">
                    $50 one-time Arena unlock
                  </p>
                </div>
                <p className="mt-5 text-base leading-7 text-slate-300">
                  For businesses, workplaces, and larger organizations operating an
                  ongoing sports community.
                </p>
                <PlanFeatures items={arenaFeatures} accent="violet" />
                <p className="mt-6 text-sm leading-6 text-slate-400">
                  The one-time unlock establishes your Arena, while an active hosting
                  plan keeps its community features available.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Larger and custom plans are available.
                </p>
              </article>
            </PricingPlanCarousel>

            <div className="mt-6 flex justify-end sm:mt-8">
              <Link
                href="/signin?from=pricing"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.045] px-7 py-3 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 motion-reduce:transition-none sm:min-w-44 sm:text-base"
              >
                Get Started
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] bg-black/75 px-5 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              aria-label="gotlocks home"
              className="inline-flex items-end gap-2"
            >
              <Image
                src="/gotlockstext.svg"
                alt="gotlocks"
                width={170}
                height={28}
                className="h-6 w-auto object-contain"
              />
              <Image
                src="/mainblueblack.svg"
                alt=""
                aria-hidden="true"
                width={30}
                height={29}
                className="size-7 object-contain"
              />
            </Link>
            <p className="mt-4 text-sm text-slate-500 sm:text-base">
              © 2026 {COMPANY_LEGAL_NAME}. All rights reserved.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-400 sm:text-base">
              <li>
                <Link
                  href="/pricing"
                  aria-current="page"
                  className="text-sky-200 transition hover:text-white motion-reduce:transition-none"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="transition hover:text-white motion-reduce:transition-none"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="transition hover:text-white motion-reduce:transition-none"
                >
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <a
                  href={SUPPORT_HREF}
                  className="transition hover:text-white motion-reduce:transition-none"
                >
                  {SUPPORT_EMAIL || "Support"}
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
