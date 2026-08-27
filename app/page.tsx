import type { Metadata } from "next";
import { AnimatedArrow } from "@/components/ui/AnimatedArrow";
import Image from "next/image";
import Link from "next/link";
import FeatureAudienceTabs from "@/components/marketing/FeatureAudienceTabs";
import HowItWorksSteps from "@/components/marketing/HowItWorksSteps";
import LandingScrollCue from "@/components/marketing/LandingScrollCue";
import { WelcomeStep2Animation } from "@/components/ui/onboarding/animation/WelcomeAnimation";
import {
  COMPANY_LEGAL_NAME,
  SUPPORT_EMAIL,
  SUPPORT_HREF,
} from "@/lib/publicSite";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Gotlocks | Social sports picks, leagues, and communities",
  description:
    "Create private sports leagues, share picks, compete on leaderboards, and join communities hosted by businesses, workplaces, and larger groups of any kind with gotlocks.",
};

const howItWorks: Array<{
  title: string;
  description: string;
}> = [
    {
      title: "Create or Join a Community",
      description:
        "Bring people together around the sports you follow. Share Community Picks, predictions, reactions, and game-day conversation in one organized space.",
    },
    {
      title: "Enter the Competition",
      description:
        "Join contests created by your community, submit your picks, and follow points, standings, and results on the leaderboard as the action unfolds.",
    },
    {
      title: "Make Your Mark",
      description:
        "Climb the standings, unlock achievements, earn badges, and compete for prizes offered by your community—all while securing the ultimate bragging rights.",
    },
  ];

const faqs = [
  {
    question: "Is gotlocks a sportsbook?",
    answer:
      "No. Gotlocks is not a sportsbook, and it does not accept wagers, process bets, or facilitate any form of gambling. Gotlocks is a social sports prediction and community organization platform, built for making picks, competing on leaderboards, and connecting with others inside Leagues and Arenas.",
  },
  {
    question: "What is the difference between a League and an Arena?",
    answer:
      "A League is a private community created by a fan for invited members. An Arena is a hosted community for businesses, workplaces, and larger groups of any kind.",
  },
  {
    question: "Who can create an Arena?",
    answer:
      "An owner, organizer, or authorized representative of a larger organization or community can create an Arena to bring members together, host pick contests, and organize ongoing sports competition in one place.",
  },
];

const SectionHeading = ({
  eyebrow,
  title,
  description,
  id,
  compactOnLaptop = false,
  compactOnMobile = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  id: string;
  compactOnLaptop?: boolean;
  compactOnMobile?: boolean;
}) => (
  <div className="max-w-5xl">
    {eyebrow && (
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-300 sm:text-base">
        {eyebrow}
      </p>
    )}
    <h2
      id={id}
      className={`${eyebrow ? "mt-3" : ""} ${compactOnMobile ? "text-[2.125rem]" : "text-4xl"} font-black leading-[1.02] tracking-[-0.04em] text-white sm:text-5xl ${compactOnLaptop ? "lg:text-[2.5rem] xl:text-5xl" : "lg:text-6xl"
        }`}
    >
      {title}
    </h2>
    {description && (
      <p className="mt-5 text-lg leading-8 text-slate-300 sm:text-xl sm:leading-9">
        {description}
      </p>
    )}
  </div>
);

export default function PublicHomePage() {
  return (
    <div className={`${styles.site} bg-[#030303] text-white`}>
      <a
        href="#homepage-content"
        className="${styles.skipLink} sr-only z-[100] rounded-lg bg-sky-300 px-4 py-3 font-semibold text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <header className="${styles.publicHeader} sticky top-0 z-50 border-b border-white/[0.07] bg-black/80 backdrop-blur-xl">
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
                  <a className="transition hover:text-white" href="#how-it-works">
                    How It Works
                  </a>
                </li>
                <li className="shrink-0">
                  <Link className="transition hover:text-white" href="/pricing">
                    Pricing
                  </Link>
                </li>
                <li className="shrink-0">
                  <a className="transition hover:text-white" href="#faq">
                    FAQ
                  </a>
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

      <main id="homepage-content" tabIndex={-1} className={styles.mainContent}>
        <section className={`${styles.heroSection} ${styles.snapSection} ${styles.safeInline} relative pb-16 pt-12 sm:pb-28 sm:pt-28 md:flex md:items-center md:py-10 lg:py-10 xl:py-16`}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 sm:gap-14 md:grid-cols-[1.05fr_0.95fr] md:items-stretch md:gap-8 lg:gap-10 xl:gap-16">
            <div className="max-w-3xl md:flex md:flex-col md:justify-center">
              <h1 className="max-w-3xl text-5xl font-black leading-[0.96] tracking-[-0.055em] text-white sm:text-7xl md:text-[3.5rem] lg:text-7xl xl:text-[5.5rem]">
                Make every game <span className={styles.heroAccent}>memorable.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-xl leading-8 text-slate-300 sm:text-2xl sm:leading-10 md:text-lg md:leading-8 lg:text-xl lg:leading-9 xl:text-2xl xl:leading-10">
                Gotlocks helps sports fans organize private leagues, share picks,
                compete on leaderboards, and join sports communities hosted by
                businesses, workplaces, or any group looking to connect over sports.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/account-creation"
                  className="ui-accent-button inline-flex w-full items-center justify-center rounded-2xl px-7 py-3.5 text-lg font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] sm:w-auto lg:px-8 lg:py-4 lg:text-xl"
                >
                  Create an Account
                </Link>
              </div>
            </div>

            <aside
              className="relative mx-auto min-w-0 w-full max-w-xl md:ml-auto md:mr-0 md:self-stretch"
              aria-label="Your crew, your group product preview"
            >
              <div
                className={`${styles.heroAnimation} relative -mx-5 aspect-[8/5] w-[calc(100%+2.5rem)] overflow-hidden sm:mx-0 sm:w-full md:h-full md:aspect-auto`}
                aria-hidden="true"
              >
                <WelcomeStep2Animation compact />
              </div>
            </aside>
          </div>
          <LandingScrollCue
            className={styles.scrollCue}
            visibleClassName={styles.scrollCueVisible}
            arrowClassName={styles.scrollCueArrow}
          />
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-it-works-title"
          className={`${styles.anchorSection} ${styles.snapSection} ${styles.contentSection} ${styles.safeInline} relative border-t border-white/[0.07] bg-white/[0.018] pb-14 pt-12 sm:pb-24 sm:pt-28 md:flex md:items-center md:py-10 lg:py-5 xl:py-6`}
        >
          <div className="mx-auto w-full max-w-7xl">
            <SectionHeading
              eyebrow="How It Works"
              title="Join. Compete. Earn Your Bragging Rights."
              id="how-it-works-title"
              compactOnLaptop
            />

            <HowItWorksSteps steps={howItWorks} />
          </div>
          <LandingScrollCue
            className={styles.scrollCue}
            visibleClassName={styles.scrollCueVisible}
            arrowClassName={styles.scrollCueArrow}
          />
        </section>

        <section
          id="community-types"
          aria-labelledby="community-types-title"
          className={`${styles.anchorSection} ${styles.snapSection} ${styles.contentSection} ${styles.communityTypesSection} ${styles.safeInline} pb-10 pt-10 sm:pb-24 sm:pt-28 md:flex md:items-center md:py-10 lg:py-5 xl:py-6`}
        >
          <div className="mx-auto w-full max-w-7xl">
            <SectionHeading
              title="Different community types"
              id="community-types-title"
              compactOnMobile
              compactOnLaptop
            />

            <FeatureAudienceTabs />
            <div className="mt-5 flex justify-end border-t border-white/[0.08] pt-4 sm:mt-7 sm:pt-5 md:mt-5 md:pt-4 xl:mt-7">
              <Link
                href="/pricing"
                className="group inline-flex min-h-11 items-center gap-2 text-sm font-bold leading-6 text-sky-200 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-200 motion-reduce:transition-none sm:text-base"
              >
                Explore pricing plans
                <AnimatedArrow direction="right" className="text-sky-300" />
              </Link>
            </div>
          </div>
          <LandingScrollCue
            className={styles.scrollCue}
            visibleClassName={styles.scrollCueVisible}
            arrowClassName={styles.scrollCueArrow}
          />
        </section>

        <section
          id="faq"
          aria-labelledby="faq-title"
          className={`${styles.anchorSection} ${styles.snapSection} ${styles.contentSection} ${styles.safeInline} border-t border-white/[0.07] pb-16 pt-12 sm:py-28 md:flex md:items-center md:py-10`}
        >
          <div className="mx-auto grid w-full max-w-7xl gap-8 sm:gap-12 md:grid-cols-[0.7fr_1.3fr] md:gap-10 lg:gap-20">
            <div className="max-w-5xl">
              <h2
                id="faq-title"
                className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-300 sm:text-base"
              >
                FAQ
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300 sm:text-xl sm:leading-9">
                Learn the basics about gotlocks, Leagues, Arenas, and hosted
                communities.
              </p>
            </div>
            <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {faqs.map((faq) => (
                <details key={faq.question} className={styles.faqItem}>
                  <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-5 py-5 text-left text-lg font-bold text-white transition hover:text-sky-100 sm:text-xl lg:text-2xl">
                    {faq.question}
                    <span className={styles.faqPlus} aria-hidden="true">+</span>
                  </summary>
                  <p className="max-w-2xl pb-7 pr-10 text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                    {faq.answer}
                  </p>
                </details>
              ))}
              <details className={styles.faqItem}>
                <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-5 py-5 text-left text-lg font-bold text-white transition hover:text-sky-100 sm:text-xl lg:text-2xl">
                  How can I contact support?
                  <span className={styles.faqPlus} aria-hidden="true">+</span>
                </summary>
                <p className="max-w-2xl pb-7 pr-10 text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                  Contact the gotlocks team through our{" "}
                  <a href={SUPPORT_HREF} className="font-semibold text-sky-200 underline decoration-sky-300/30 underline-offset-4 hover:text-sky-100">
                    support channel{SUPPORT_EMAIL ? ` at ${SUPPORT_EMAIL}` : ""}
                  </a>
                  .
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>

      <footer className={`${styles.snapFooter}  ${styles.landingFooter} ${styles.safeInline}  border-t border-white/[0.08] bg-black py-10`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" aria-label="gotlocks home" className="inline-flex items-end gap-2">
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
                className="h-7 w-7 object-contain"
              />
            </Link>
            <p className="mt-4 text-base text-slate-400 sm:text-lg">
              © 2026 {COMPANY_LEGAL_NAME}. All rights reserved.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-7 gap-y-3 text-base font-semibold text-slate-300 sm:text-lg">
              <li>
                <Link className="transition hover:text-white" href="/pricing">
                  Pricing
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-white" href="/privacy-policy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-white" href="/terms-and-conditions">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <a className="transition hover:text-white" href={SUPPORT_HREF}>
                  {SUPPORT_EMAIL || "Support / Contact"}
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
