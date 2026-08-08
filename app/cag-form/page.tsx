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
import PurchaseFlowDialog, { type PurchaseFlowStatus } from "@/components/billing/PurchaseFlowDialog";
import { getArenaUnlockOffer } from "@/components/billing/arena";
import { ARENA_INCLUDED_TIER_LABEL } from "@/lib/arenas/tierLabels";

type FormErrors = { name?: string; description?: string };

const NAME_MIN = 4;
const NAME_MAX = 25;
const DESCRIPTION_MAX = 50;

// POST /group/create inserts the Arena row first, then writes arena_unlocks +
// arena_hosting in a non-atomic Promise.all. When those fail the server answers 500
// with this message and the Arena STILL EXISTS — retrying would duplicate it.
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
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  const payButtonRef = useRef<HTMLButtonElement>(null);
  // Focus lands here when the dialog closes on success: the Pay button has unmounted
  // with the form by then, so the dialog's `isConnected` check would otherwise drop
  // focus onto <body> and lose a keyboard user's place.
  const pageRef = useRef<HTMLDivElement>(null);
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

  const isArena = groupType === "arena";
  const typeLabel = isArena ? "Arena" : "League";
  const unlockOffer = getArenaUnlockOffer();

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

  // The Arena exists; the confirm step must never be reachable again.
  useEffect(() => {
    if (arenaSetupIncomplete) setPurchaseOpen(false);
  }, [arenaSetupIncomplete]);

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

  const handleOpenPurchase = () => {
    if (!currentUser) {
      router.push("/landing-page");
      return;
    }
    // Validate BEFORE opening: the dialog has no form, so an invalid name would only
    // surface after the user "pays".
    if (!validate()) return;
    // Clear first, open second — a dialog must never open showing the previous
    // attempt's error.
    dispatch(resetCreateGroupState());
    createGuardRef.current = false;
    setPurchaseOpen(true);
  };

  const handleConfirmCreate = () => {
    if (createGuardRef.current || createLoading || created || arenaSetupIncomplete) return;
    createGuardRef.current = true;
    dispatch(createGroupRequest(buildPayload()));
  };

  const handleClosePurchase = () => {
    // The dialog already blocks close/Escape/backdrop while submitting; belt and braces.
    if (createLoading) return;
    setPurchaseOpen(false);
    // Keep a completed create in the store — the success panel renders from it. Only
    // a dismissed idle/error attempt is cleared.
    if (!created) dispatch(resetCreateGroupState());
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

  const purchaseStatus: PurchaseFlowStatus = createLoading
    ? "submitting"
    : createError
      ? "error"
      : created
        ? "success"
        : "idle";

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
      {/* Full-screen busy state for the league path only. The Arena path shows its
          progress inside the dialog, which this overlay would cover. */}
      {createLoading && !purchaseOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-48 max-w-[70vw] sm:w-60">
            <FootballAnimation />
          </div>
        </div>
      )}

      <div ref={pageRef} tabIndex={-1} className="flex flex-col gap-8 text-white outline-none">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
          {created ? (
            <span className="ml-auto">
              {createdType === "arena" ? "Arena created" : "League created"}
            </span>
          ) : (
            <>
              <BackButton label={`back to all ${isArena ? "arenas" : "leagues"}`} fallback={backFallback} preferFallback />
              <span>{typeLabel} Creation</span>
            </>
          )}
        </div>

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

        {!created && !arenaSetupIncomplete && (
          <div className={`${accentGradientBox} p-6`}>
            <h1 className="text-2xl font-semibold text-white">
              {isArena ? "Create an Arena" : "Create a league"}
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              {groupType === "arena"
                ? "Set the Arena details first. The Arena will not exist until the $50 one-time unlock is confirmed."
                : "Set up a private League for your crew. You can invite members as soon as it is created."}
            </p>

            <div className="mt-6 flex flex-col gap-4">
              {isArena && (
                <div className="rounded-2xl border border-sky-300/25 bg-sky-500/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-100">
                        Permanent Arena Unlock
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-300">
                        Includes one {ARENA_INCLUDED_TIER_LABEL} month. Choose ongoing monthly hosting separately
                        for after the included month.
                      </p>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {unlockOffer.priceLabel} {" "}
                      <span className="text-xs font-semibold uppercase tracking-wide text-sky-100">
                        {unlockOffer.cadenceLabel}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  {typeLabel.toLowerCase()} name
                </span>
                <input
                  value={form.name}
                  onChange={handleInputChange("name")}
                  maxLength={NAME_MAX}
                  className="ui-input-accent rounded-2xl border border-white/10 bg-black px-4 py-3 text-base text-white outline-none transition"
                  placeholder={isArena ? "Citywide Arena" : "Sunday Locks"}
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

              {!isArena && createError && (
                <p role="alert" className="text-xs font-semibold text-red-300">
                  {createError}
                </p>
              )}

              {isArena ? (
                <button
                  ref={payButtonRef}
                  type="button"
                  onClick={handleOpenPurchase}
                  disabled={!form.name.trim() || createLoading}
                  className="ui-accent-button self-start rounded-2xl px-6 py-3 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Pay {unlockOffer.priceLabel} &amp; create Arena
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateLeague}
                  disabled={!form.name.trim() || createLoading || atLeagueLimit}
                  className="ui-accent-button self-start rounded-2xl px-6 py-3 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Create League
                </button>
              )}
            </div>
          </div>
        )}

        {created && createdId && createdInviteCode && (
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

      {/* Rendered OUTSIDE every conditional branch above. The create it performs is
          what flips `created` and unmounts the form, so a dialog nested in the form
          would unmount itself on its own success. */}
      <PurchaseFlowDialog
        open={purchaseOpen && isArena && !arenaSetupIncomplete}
        kind="arena_unlock"
        eyebrow="simulated billing"
        title="Pay $50 and create this Arena"
        description={`${unlockOffer.summary} Confirm the payment and the Arena is created already unlocked, with its included ${ARENA_INCLUDED_TIER_LABEL} month running from today.`}
        offer={{
          name: unlockOffer.name,
          priceLabel: unlockOffer.priceLabel,
          cadenceLabel: unlockOffer.cadenceLabel,
        }}
        confirmLabel={`Confirm simulated ${unlockOffer.priceLabel} payment`}
        submittingLabel="Creating your Arena…"
        status={purchaseStatus}
        errorMessage={createError}
        successTitle="Arena created and unlocked"
        successMessage={`This Arena is permanently unlocked and its included ${ARENA_INCLUDED_TIER_LABEL} month is already active. Close this to copy the invite code.`}
        onConfirm={handleConfirmCreate}
        onClose={handleClosePurchase}
        returnFocusRef={payButtonRef}
        fallbackFocusRef={pageRef}
      />
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
