"use client";

import BackButton from "@/components/ui/BackButton";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useRouter } from "next/navigation";
import { useState } from "react";

const EXPLAINED_STEPS = [
  {
    eyebrow: "step 1",
    title: "Create your group",
    body:
      "Start a smaller League or, with Founding Pro, create an Arena for a bigger competition.",
  },
  {
    eyebrow: "step 2",
    title: "Share the code",
    body:
      "Your invite code is ready instantly. Send it to members so they can join right away.",
  },
  {
    eyebrow: "step 3",
    title: "Start scoring",
    body:
      "Kick off a slip and add your picks. When the games finish, picks get graded and points hit the leaderboard. Bragging rights? Earned.",
  },
] as const;

const CagExplainedPage = () => {
  const currentUser = useCurrentUser();
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const isLastStep = stepIndex === EXPLAINED_STEPS.length - 1;
  const visibleSteps = EXPLAINED_STEPS.slice(0, stepIndex + 1);

  const handleAdvance = () => {
    if (isLastStep) {
      router.push("/cag-form");
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, EXPLAINED_STEPS.length - 1));
  };

  const handleScreenAdvance = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768 && !isLastStep) {
      handleAdvance();
    }
  };

  if (!currentUser) return null;
  return (
    <div
      className="flex min-h-[100dvh] flex-col gap-8 text-gray-200"
      onClick={handleScreenAdvance}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
        <div onClick={(event) => event.stopPropagation()}>
          <BackButton />
        </div>
        <span>Group Creation</span>
      </div>

      <section className="grid max-w-xl gap-4 md:max-w-none md:grid-cols-3">
        {visibleSteps.map((step, index) => {
          const isNewestStep = index === visibleSteps.length - 1;
          const shouldAnimate = isNewestStep && stepIndex > 0;

          return (
            <div
              key={step.title}
              className={`rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 md:min-h-[13rem] ${shouldAnimate ? "ui-fade-up-in" : ""}`}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-sky-200">
                {step.eyebrow}
              </p>
              <h1 className="mt-2 text-lg font-semibold text-white">{step.title}</h1>
              <p className="mt-2 text-sm text-gray-300">{step.body}</p>
            </div>
          );
        })}
      </section>

      <div className={`${isLastStep ? "flex" : "hidden"} justify-end md:flex`}>
        <button
          type="button"
          onClick={handleAdvance}
          className="ui-accent-button rounded-2xl px-6 py-3 text-xs font-semibold uppercase tracking-wide transition"
        >
          {isLastStep ? "get started" : "next"}
        </button>
      </div>
    </div>
  );
};

export default CagExplainedPage;
