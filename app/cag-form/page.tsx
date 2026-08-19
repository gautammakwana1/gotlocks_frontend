"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import type { CreateGroupPayload, GroupType } from "@/lib/interfaces/interfaces";
import {
  createGroupRequest,
  fetchOwnGroupsCountsRequest,
  resetCreateGroupState,
} from "@/lib/redux/slices/groupsSlice";
import { useToast } from "@/lib/state/ToastContext";
import BackButton from "@/components/ui/BackButton";
import FootballAnimation from "@/components/animations/FootballAnimation";
import { accentGradientBox } from "@/lib/styles/containers";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { checkAnyRestrictedWords } from "@/lib/utils/helpers";
import { CopyIcon } from "@/components/ui/SvgIcons";
import { canCreateGroup, normalizeGroupType, normalizeUserPlan } from "@/lib/groups/limits";
import { useUserPlan } from "@/lib/plan/useUserPlan";
import { getGroupPath } from "@/lib/utils/profileNavigation";
import {
  getArenaCustomContactHref,
  getArenaHostingOffer,
  getArenaUnlockOffer,
  SELF_SERVICE_ARENA_TIERS,
} from "@/components/billing/arena";
import type { ArenaSelfServiceHostingTier } from "@/components/billing/arena";
import { createArenaCheckoutRequest } from "@/lib/redux/slices/arenaSlice";
import { ARENA_INCLUDED_TIER_LABEL } from "@/lib/arenas/tierLabels";

type FormErrors = { name?: string; description?: string };

/* ----------------------------------------------------------------------------
 * ARENA LAUNCH — the MVP's three-step wizard (app/cag-form/page.tsx there).
 *
 * The League path below is untouched and stays a single card; only the Arena
 * side became a wizard, because it now has three genuinely separate decisions:
 * what the Arena IS, what hosting starts after the included month, and whether
 * to pay for it.
 *
 * One deliberate difference from the MVP, and it is the billing: the MVP runs a
 * deterministic simulator and can therefore finish inside the review step. Here
 * the review step's button starts a REAL two-phase flow — POST /group/create
 * makes a locked, unpaid Arena, then Stripe Checkout collects the $50 — so the
 * terminal state on this screen is "redirecting", never "Arena ready". The old
 * PurchaseFlowDialog is gone: the review step IS the confirmation surface in the
 * MVP, and a confirm dialog on top of a review step asks the same question twice.
 * -------------------------------------------------------------------------- */

type ArenaWizardStep = "basics" | "hosting" | "review";

const ARENA_STEPS: Array<{ id: ArenaWizardStep; label: string }> = [
  { id: "basics", label: "Basics" },
  { id: "hosting", label: "Future hosting" },
  { id: "review", label: "Review" },
];

const ArenaStepNav = ({ active }: { active: ArenaWizardStep }) => (
  <ol className="grid grid-cols-3 gap-2" aria-label="Arena launch progress">
    {ARENA_STEPS.map((step, index) => {
      const activeIndex = ARENA_STEPS.findIndex((candidate) => candidate.id === active);
      const current = step.id === active;
      const complete = index < activeIndex;
      return (
        <li
          key={step.id}
          aria-current={current ? "step" : undefined}
          className={`rounded-xl border px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] ${current
            ? "border-violet-300/50 bg-violet-500/20 text-violet-50"
            : complete
              ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
              : "border-white/10 bg-white/[0.03] text-gray-500"
            }`}
        >
          <span className="mr-1" aria-hidden>{index + 1}.</span>{step.label}
        </li>
      );
    })}
  </ol>
);

const NAME_MIN = 4;
const NAME_MAX = 25;
const DESCRIPTION_MAX = 50;

// VESTIGIAL. POST /group/create used to write arena_unlocks + arena_hosting in a
// non-atomic Promise.all after inserting the group, and answered 500 with this
// message when that half failed — leaving an Arena that existed but was unusable.
//
// That block is gone: creation now returns a LOCKED Arena and the unlock is
// written by fulfilArenaCheckout off a confirmed Stripe payment, so there is no
// partial-initialisation state left to report. The guard is kept only so an older
// deployed backend still renders something sane during a rollout; it can be
// deleted once every environment is on the Stripe flow.
const ARENA_PARTIAL_INIT_PREFIX = "Group created, but failed to initialize Arena settings";

const CagFormContent = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentUser = useCurrentUser();
  const { setToast } = useToast();
  const storedPlan = useUserPlan();

  const [groupType, setGroupType] = useState<GroupType>("league");
  const [form, setForm] = useState({ name: "", description: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  /**
   * Which step of the Arena wizard is showing. Held in state and mirrored to the
   * URL with `replace` rather than `push`: the form's answers live in memory, so
   * a deep link to `?step=review` could only ever land on an empty review — the
   * MVP guards that case by bouncing to `basics`, and starting there reaches the
   * same place without a history entry that Back cannot honour.
   */
  const [arenaStep, setArenaStep] = useState<ArenaWizardStep>("basics");
  // The plan that starts AFTER the included month. Defaults to the entry tier,
  // which is also the included one — so the default is "stay where the free
  // month leaves you", not a silent upsell.
  const [selectedTier, setSelectedTier] =
    useState<ArenaSelfServiceHostingTier>("arena_50");
  // One-shot latch: the checkout hand-off must fire exactly once per created
  // Arena. Without it, any re-render while `created` is true would dispatch a
  // second checkout and create a second Stripe Session.
  const checkoutStartedRef = useRef(false);

  const pageRef = useRef<HTMLDivElement>(null);
  // Each Arena step is a new heading; focus follows it so a keyboard or screen
  // reader user is not left at the top of a page whose content just changed.
  const arenaHeadingRef = useRef<HTMLHeadingElement>(null);
  // Same-tick double-submit guard. `createLoading` is stale inside a click handler
  // that fires twice before React re-renders, so a ref is the only synchronous lock.
  const createGuardRef = useRef(false);

  const {
    createLoading,
    createError,
    createErrorStatus,
    createMessage,
    createdGroup,
    groupsCounts,
  } = useAppSelector((state) => state.group);

  const { checkoutLoading, checkoutRedirecting, checkoutError } = useAppSelector(
    (state) => state.arena
  );

  const isArena = groupType === "arena";
  const typeLabel = isArena ? "Arena" : "League";
  const unlockOffer = getArenaUnlockOffer();
  const selectedPlanOffer = getArenaHostingOffer(selectedTier);

  // The Arenas tab links here with ?type=arena and /cag-explained redirects with
  // ?type=league. Read from window after mount: this page prerenders statically, so
  // useSearchParams would demand a Suspense boundary and a lazy useState initializer
  // would hydrate differently than the server HTML.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("type");
    setGroupType(requested === "arena" ? "arena" : "league");
  }, []);

  // The create lifecycle is the ONLY source of this screen's success state, so it
  // must start empty on every mount and must not outlive the screen.
  useEffect(() => {
    dispatch(resetCreateGroupState());
    return () => {
      dispatch(resetCreateGroupState());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!currentUser?.userId) return;
    dispatch(fetchOwnGroupsCountsRequest({}));
  }, [currentUser?.userId, dispatch]);

  // Release the submit lock once the request settles, so a failure can be retried.
  useEffect(() => {
    if (createLoading) return;
    createGuardRef.current = false;
  }, [createLoading]);

  const createdId = createdGroup?.id ?? null;
  const createdInviteCode = createdGroup?.invite_code ?? null;
  const created = Boolean(createdId && createdInviteCode);
  const createdType: GroupType = createdGroup
    ? normalizeGroupType(createdGroup.group_type)
    : groupType;

  const arenaSetupIncomplete =
    createErrorStatus === 500 && (createError?.startsWith(ARENA_PARTIAL_INIT_PREFIX) ?? false);

  useEffect(() => {
    if (!isArena || created) return;
    arenaHeadingRef.current?.focus();
  }, [arenaStep, created, isArena]);

  /**
   * Arena creation is now two steps: POST /group/create makes a LOCKED, unpaid
   * Arena, and the $50 is collected by Stripe. As soon as the row exists we
   * hand the browser to Checkout with the chosen plan.
   *
   * The Arena is unusable until the webhook confirms payment — every contest,
   * feed and venue gate fails closed on a missing unlock row — so abandoning
   * this redirect leaves nothing exploitable behind, and the backend sweeps the
   * locked Arena when the session expires.
   */
  useEffect(() => {
    if (!isArena || !createdId || checkoutStartedRef.current) return;
    checkoutStartedRef.current = true;
    dispatch(createArenaCheckoutRequest({ arena_id: createdId, tier: selectedTier }));
  }, [isArena, createdId, selectedTier, dispatch]);

  // League outcomes are toasted. Arena outcomes are reported inside the dialog, so
  // toasting them too would double-report the same result.
  useEffect(() => {
    if (isArena) return;
    if (createLoading) return;
    if (createError) {
      setToast({ id: Date.now(), type: "error", message: createError, duration: 4000 });
      return;
    }
    if (created && createMessage) {
      setToast({ id: Date.now(), type: "success", message: createMessage, duration: 3000 });
    }
    // setToast is deliberately omitted: useToast() returns a NEW function on every
    // render, so including it turns this into a run-after-every-render effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArena, createLoading, createError, created, createMessage]);

  const gate = useMemo(() => {
    if (!currentUser) {
      return canCreateGroup({ signedIn: false, plan: "free", groupType, ownedLeagueCount: 0 });
    }
    // Arenas are never count-gated, and until the server's counts land we let its own
    // 403 be the backstop rather than flashing a blocker at a Pro user.
    if (groupType === "arena" || !groupsCounts) return { allowed: true } as const;
    return canCreateGroup({
      signedIn: true,
      plan: normalizeUserPlan(groupsCounts.user?.plan ?? storedPlan),
      groupType: "league",
      ownedLeagueCount: groupsCounts.counts?.league ?? 0,
    });
  }, [currentUser, groupType, groupsCounts, storedPlan]);

  const atLeagueLimit = !gate.allowed && gate.reason === "league_limit";

  const validate = useCallback((): boolean => {
    const next: FormErrors = {};
    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      next.name = `${typeLabel} name is required.`;
    } else if (name.length < NAME_MIN) {
      next.name = `${typeLabel} name must be at least ${NAME_MIN} characters.`;
    } else if (name.length > NAME_MAX) {
      next.name = `${typeLabel} name must be ${NAME_MAX} characters or less.`;
    } else if (checkAnyRestrictedWords(name)) {
      next.name = `${typeLabel} name contains inappropriate language.`;
    }

    if (description.length > DESCRIPTION_MAX) {
      next.description = `Description must be ${DESCRIPTION_MAX} characters or less.`;
    } else if (description && checkAnyRestrictedWords(description)) {
      next.description = "Description contains inappropriate language.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, typeLabel]);

  const buildPayload = useCallback((): CreateGroupPayload => {
    const description = form.description.trim();
    return {
      name: form.name.trim(),
      // Omitted when blank: the server validates description with min 1 when the
      // key is present.
      ...(description ? { description } : {}),
      group_type: groupType,
    };
  }, [form, groupType]);

  const handleCreateLeague = () => {
    if (!currentUser) {
      router.push("/landing-page");
      return;
    }
    if (!gate.allowed) {
      setToast({ id: Date.now(), type: "error", message: gate.error, duration: 4000 });
      return;
    }
    if (!validate()) return;
    if (createGuardRef.current || createLoading) return;
    createGuardRef.current = true;
    dispatch(createGroupRequest(buildPayload()));
  };

  const goToArenaStep = (step: ArenaWizardStep) => {
    setArenaStep(step);
    router.replace(`/cag-form?type=arena&step=${step}`);
  };

  /**
   * Leaving Basics runs the FULL validation, not just "is the name non-empty".
   * The length, restricted-word and description rules would otherwise not
   * surface until the review step's Pay button — after the member has chosen a
   * hosting tier they may now have to redo.
   */
  const handleContinueFromBasics = () => {
    if (!currentUser) {
      router.push("/landing-page");
      return;
    }
    if (!validate()) return;
    // A previous failed attempt's error must not be sitting on the review step.
    dispatch(resetCreateGroupState());
    createGuardRef.current = false;
    goToArenaStep("hosting");
  };

  const handleConfirmCreate = () => {
    if (createGuardRef.current || createLoading || created || arenaSetupIncomplete) return;
    if (!validate()) {
      // The offending field is back on Basics, so go where it can be fixed.
      goToArenaStep("basics");
      return;
    }
    createGuardRef.current = true;
    dispatch(createGroupRequest(buildPayload()));
  };

  const handleInputChange =
    (field: keyof FormErrors) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
      };

  const handleCopyCode = async () => {
    if (!createdInviteCode) return;
    try {
      await navigator.clipboard.writeText(createdInviteCode);
      setToast({ id: Date.now(), type: "success", message: "Invite code copied.", duration: 3000 });
    } catch {
      setToast({ id: Date.now(), type: "error", message: "Could not copy invite code.", duration: 3000 });
    }
  };

  /**
   * The Arena flow has TWO server round trips behind one button: create the
   * (locked) Arena, then create the Stripe Checkout Session. Both are
   * "submitting" as far as the member is concerned, and the screen must not
   * flash a success panel in between — nothing has been paid for yet, and the
   * browser is about to leave the page.
   *
   * So `created` only counts as done for a LEAGUE. An Arena's terminal state
   * here is `checkoutRedirecting`.
   */
  const arenaSubmitting = createLoading || checkoutLoading;
  const arenaBusy = arenaSubmitting || checkoutRedirecting;
  const arenaError = createError ?? checkoutError;

  const backFallback = isArena ? "/arena" : "/fantasy";

  if (!currentUser) {
    return (
      <div className="flex flex-col gap-8 text-white">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
          <BackButton label="back to all groups" fallback={backFallback} preferFallback />
          <span>Group Creation</span>
        </div>
        <div className={`${accentGradientBox} space-y-4 p-6 text-sm text-gray-300`}>
          <h1 className="text-2xl font-semibold text-white">Sign in to continue</h1>
          <p>You need an account to host a {typeLabel.toLowerCase()}.</p>
          <button
            type="button"
            onClick={() => router.push("/landing-page")}
            className="ui-accent-button rounded-2xl px-5 py-2 text-xs font-semibold uppercase tracking-wide transition"
          >
            sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Full-screen busy state for the LEAGUE path only. The Arena wizard reports
          its own progress on the review step's button, and this overlay would
          hide the step the member is waiting on. */}
      {createLoading && !isArena && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-48 max-w-[70vw] sm:w-60">
            <FootballAnimation />
          </div>
        </div>
      )}

      <div
        ref={pageRef}
        tabIndex={-1}
        className={`flex flex-col text-white outline-none ${isArena && !created && !arenaSetupIncomplete
          ? "mx-auto w-full max-w-3xl gap-6"
          : "gap-8"
          }`}
      >
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
          {created && !isArena ? (
            <span className="ml-auto">League created</span>
          ) : isArena && !arenaSetupIncomplete ? (
            <>
              {/* Back leaves the wizard from step 1 and walks it backwards from
                  the others — the MVP's own header behaviour. */}
              {arenaStep === "basics" ? (
                <BackButton label="back to all arenas" fallback={backFallback} preferFallback />
              ) : (
                <button
                  type="button"
                  disabled={arenaBusy}
                  onClick={() =>
                    goToArenaStep(arenaStep === "review" ? "hosting" : "basics")
                  }
                  className="min-h-11 rounded-lg px-2 uppercase tracking-wide text-gray-300 transition hover:text-white disabled:opacity-40"
                >
                  Back
                </button>
              )}
              <span>Arena launch</span>
            </>
          ) : (
            <>
              <BackButton label={`back to all ${isArena ? "arenas" : "leagues"}`} fallback={backFallback} preferFallback />
              <span>{typeLabel} Creation</span>
            </>
          )}
        </div>

        {isArena && !created && !arenaSetupIncomplete && (
          <ArenaStepNav active={arenaStep} />
        )}

        {arenaSetupIncomplete && (
          <div className={`${accentGradientBox} space-y-4 p-6 text-sm text-amber-100`}>
            <h2 className="text-xl font-semibold text-white">Your Arena was created</h2>
            <p>
              The payment went through and the Arena exists, but its billing setup did not
              finish. Do not create it again — open it from your Arenas list. If its Settings
              tab is empty, contact support and quote the Arena name.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push("/arena")}
                className="ui-accent-button rounded-2xl px-5 py-2 text-xs font-semibold uppercase tracking-wide transition"
              >
                open my arenas
              </button>
            </div>
          </div>
        )}

        {/* ---------------- LEAGUE — unchanged single card ---------------- */}
        {!isArena && !created && !arenaSetupIncomplete && (
          <div className={`${accentGradientBox} p-6`}>
            <h1 className="text-2xl font-semibold text-white">Create a league</h1>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Set up a private League for your crew. You can invite members as soon as it
              is created.
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  league name
                </span>
                <input
                  value={form.name}
                  onChange={handleInputChange("name")}
                  maxLength={NAME_MAX}
                  className="ui-input-accent rounded-2xl border border-white/10 bg-black px-4 py-3 text-base text-white outline-none transition"
                  placeholder="Sunday Locks"
                />
                {errors.name && (
                  <span className="text-xs font-medium text-red-400">{errors.name}</span>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  description (optional)
                </span>
                <textarea
                  value={form.description}
                  onChange={handleInputChange("description")}
                  maxLength={DESCRIPTION_MAX}
                  className="ui-input-accent min-h-[96px] rounded-2xl border border-white/10 bg-black px-4 py-3 text-base text-white outline-none transition"
                  placeholder="Multi-sport contests, standings or just for vibes."
                />
                {errors.description && (
                  <span className="text-xs font-medium text-red-400">{errors.description}</span>
                )}
              </label>

              {atLeagueLimit && !gate.allowed && (
                <div className="rounded-2xl border border-amber-300/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <p className="font-semibold">{gate.error}</p>
                  <p className="mt-1 text-amber-100/80">
                    Upgrade to Pro for unlimited leagues, or delete a league you no longer run.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/app-settings/plan")}
                    className="mt-3 rounded-xl border border-amber-200/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition hover:bg-amber-500/20"
                  >
                    see pro plans
                  </button>
                </div>
              )}

              {createError && (
                <p role="alert" className="text-xs font-semibold text-red-300">
                  {createError}
                </p>
              )}

              <button
                type="button"
                onClick={handleCreateLeague}
                disabled={!form.name.trim() || createLoading || atLeagueLimit}
                className="ui-accent-button self-start rounded-2xl px-6 py-3 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create League
              </button>
            </div>
          </div>
        )}

        {/* ---------------- ARENA · STEP 1 — Basics ---------------- */}
        {isArena && !created && !arenaSetupIncomplete && arenaStep === "basics" && (
          <section className="rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-950/80 via-black to-black p-6 shadow-[0_24px_80px_rgba(76,29,149,0.16)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
              Step 1
            </p>
            <h1
              ref={arenaHeadingRef}
              tabIndex={-1}
              className="mt-2 text-2xl font-semibold outline-none"
            >
              Set the foundation
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Name the Arena and tell members what it is about.
            </p>
            <div className="mt-6 space-y-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  Arena name
                </span>
                <input
                  value={form.name}
                  onChange={handleInputChange("name")}
                  maxLength={NAME_MAX}
                  className="min-h-11 rounded-xl border border-violet-300/20 bg-black/60 px-4 text-base text-white outline-none focus:border-violet-300/60"
                  placeholder="Citywide Arena"
                />
                {errors.name && (
                  <span className="text-xs font-medium text-red-400">{errors.name}</span>
                )}
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  Description (optional)
                </span>
                <textarea
                  value={form.description}
                  onChange={handleInputChange("description")}
                  maxLength={DESCRIPTION_MAX}
                  className="min-h-24 rounded-xl border border-violet-300/20 bg-black/60 px-4 py-3 text-base text-white outline-none focus:border-violet-300/60"
                  placeholder="What should members know?"
                />
                {errors.description && (
                  <span className="text-xs font-medium text-red-400">{errors.description}</span>
                )}
              </label>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!form.name.trim()}
                onClick={handleContinueFromBasics}
                className="min-h-11 rounded-xl border border-violet-300/50 bg-violet-500/20 px-5 text-sm font-semibold text-violet-50 transition hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to hosting
              </button>
            </div>
          </section>
        )}

        {/* ---------------- ARENA · STEP 2 — Future hosting ---------------- */}
        {isArena && !created && !arenaSetupIncomplete && arenaStep === "hosting" && (
          <section className="rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-950/80 via-black to-black p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
              Step 2
            </p>
            <h1
              ref={arenaHeadingRef}
              tabIndex={-1}
              className="mt-2 text-2xl font-semibold outline-none"
            >
              Choose future hosting
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Your first month uses {ARENA_INCLUDED_TIER_LABEL} at no monthly charge. Choose
              what starts after that included month.
            </p>
            <div
              className="mt-6 grid gap-3 md:grid-cols-3"
              role="radiogroup"
              aria-label="Future Arena hosting"
            >
              {SELF_SERVICE_ARENA_TIERS.map((tier) => {
                const offer = getArenaHostingOffer(tier);
                const selected = selectedTier === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSelectedTier(tier)}
                    className={`min-h-44 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${selected
                      ? "border-violet-300/70 bg-violet-500/20"
                      : "border-white/10 bg-white/[0.03] hover:border-violet-300/35"
                      }`}
                  >
                    <span className="block text-lg font-semibold text-white">{offer.name}</span>
                    <span className="mt-1 block text-sm font-semibold text-violet-200">
                      {offer.priceLabel}/month
                    </span>
                    <span className="mt-3 block text-xs leading-5 text-gray-400">
                      {offer.summary}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-gray-400">
              Need more than 250 participating members?{" "}
              <a
                href={getArenaCustomContactHref({ arenaName: form.name })}
                className="inline-flex min-h-11 items-center font-semibold text-violet-200 underline underline-offset-4"
              >
                Contact us about Custom hosting
              </a>
              .
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!selectedTier}
                onClick={() => goToArenaStep("review")}
                className="min-h-11 rounded-xl border border-violet-300/50 bg-violet-500/20 px-5 text-sm font-semibold text-violet-50 transition hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Review launch
              </button>
            </div>
          </section>
        )}

        {/* ---------------- ARENA · STEP 3 — Review ---------------- */}
        {isArena && !created && !arenaSetupIncomplete && arenaStep === "review" && (
          <section className="overflow-hidden rounded-3xl border border-violet-300/25 bg-gradient-to-br from-violet-950/90 via-black to-black shadow-[0_28px_100px_rgba(76,29,149,0.2)]">
            <div className="border-b border-white/10 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
                Secure checkout
              </p>
              <h1
                ref={arenaHeadingRef}
                tabIndex={-1}
                className="mt-2 text-2xl font-semibold outline-none"
              >
                Launch {form.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Review the permanent unlock and future hosting before creating the Arena.
              </p>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-[1fr_240px]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Due now</p>
                  <p className="mt-1 text-3xl font-semibold text-white">
                    {unlockOffer.priceLabel}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    One-time permanent Arena unlock
                  </p>
                </div>
                <div className="rounded-2xl border border-violet-300/20 bg-violet-500/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-violet-200">
                    Hosting timeline
                  </p>
                  <p className="mt-2 font-semibold text-white">
                    {ARENA_INCLUDED_TIER_LABEL} included for the first month
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    Then {selectedPlanOffer.name} hosting begins at{" "}
                    {selectedPlanOffer.priceLabel}/month. You can change or pause it later
                    from Arena billing.
                  </p>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>Permanent Arena identity and invite code</li>
                  <li>{selectedPlanOffer.summary}</li>
                  <li>Owner billing stays separate from personal League Pro</li>
                </ul>
              </div>
              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/40 p-4">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {selectedPlanOffer.name} hosting
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    Starts after the included {ARENA_INCLUDED_TIER_LABEL} month.
                  </p>
                  {/* Where the MVP explains its simulator, this explains the real
                      thing: the Arena row is written first and stays locked until
                      Stripe confirms, so leaving mid-checkout costs nothing. */}
                  <p className="mt-4 text-xs leading-5 text-gray-500">
                    You&apos;ll finish payment on Stripe. The Arena stays locked until the
                    payment is confirmed.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={arenaBusy}
                  onClick={handleConfirmCreate}
                  className="mt-6 min-h-11 rounded-xl border border-violet-300/50 bg-violet-500/25 px-4 text-sm font-semibold text-violet-50 transition hover:bg-violet-500/35 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkoutRedirecting
                    ? "Redirecting to Stripe…"
                    : arenaSubmitting
                      ? "Preparing your Arena…"
                      : `Pay ${unlockOffer.priceLabel} & launch Arena`}
                </button>
              </div>
            </div>
            {arenaError ? (
              <p
                className="mx-6 mb-6 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200"
                role="alert"
              >
                {arenaError}
              </p>
            ) : null}
          </section>
        )}

        {/* LEAGUE ONLY. An Arena is created LOCKED and unpaid, so there is no
            "Arena ready" state to reach on this screen — the review step holds
            the member until Stripe takes over, and the return trip is handled by
            the checkout-return route. */}
        {!isArena && created && createdId && createdInviteCode && (
          <div className={`${accentGradientBox} space-y-4 p-6 text-sm text-gray-300`}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {createdType === "arena" ? "Arena ready" : "League ready"}
              </h2>
              <div className="ui-accent-text flex items-center gap-2 text-xs uppercase tracking-wide">
                <span className="text-blue-200/70">code</span>
                <span className="text-sm font-semibold text-white">{createdInviteCode}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="ui-accent-button rounded-lg p-2 transition"
                  aria-label="Copy invite code"
                >
                  <CopyIcon />
                </button>
              </div>
            </div>
            <p>
              {createdType === "arena"
                ? `Your Arena is permanently unlocked and its included ${ARENA_INCLUDED_TIER_LABEL} month is active. Share the invite code to bring in members and managers.`
                : "Share the invite code above to bring members in. Once they join, head to the league dashboard to create contests and open slips for picks."}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push(getGroupPath(createdType, createdId))}
                className="ui-accent-button rounded-2xl px-5 py-2 text-xs font-semibold uppercase tracking-wide transition"
              >
                {createdType === "arena" ? "Go to Arena" : "Go to League"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const CagFormPage = () => (
  <Suspense
    fallback={
      <div className="text-sm text-gray-400" role="status">
        Preparing group creation…
      </div>
    }
  >
    <CagFormContent />
  </Suspense>
);

export default CagFormPage;
