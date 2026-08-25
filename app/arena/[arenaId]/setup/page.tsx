"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { ArenaVenueSetupDialog } from "@/components/arenas/checkin/ArenaVenueSetupDialog";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useScopedGroup } from "@/lib/groups/useScopedGroup";
import {
    isValidArenaRewardContactEmail,
    normalizeArenaRewardContactEmail,
} from "@/lib/contests/arenaReward";
import type { GroupJoinPolicy, RootState } from "@/lib/interfaces/interfaces";
import {
    clearArenaSetupState,
    completeArenaSetupRequest,
} from "@/lib/redux/slices/arenaSlice";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import { fetchVenueCheckInDetailRequest } from "@/lib/redux/slices/venueSlice";

/* ----------------------------------------------------------------------------
 * ARENA SETUP — ported from the MVP's app/arena/[arenaId]/setup/page.tsx.
 *
 * Where a newly PURCHASED Arena lands before it is usable. Three steps, and the
 * split between them is the whole point:
 *
 *   1. Joining   REQUIRED. `groups.join_policy` starts NULL, and NULL is the
 *                gate the join path reads — nobody, by any door, may join an
 *                Arena whose owner has not answered this.
 *   2. Contact   REQUIRED. The address members write to, and the one a prize
 *                winner claims at.
 *   3. Venue QR  OPTIONAL and skippable, with its own endpoint. Only an Arena
 *                that runs in-person contests needs it.
 *
 * Steps 1 and 2 save as ONE call. `join_policy IS NOT NULL` is what opens the
 * Arena for joining, so a policy that landed without its contact email would
 * leave an Arena taking members while unable to offer a prize — the server
 * refuses to half-land them, and this must not split them into two requests.
 *
 * OWNER ONLY. Anyone else — a manager included — is bounced to the Arenas hub:
 * this screen decides how the Arena admits people, which is the permanent
 * owner's call and nobody else's.
 * -------------------------------------------------------------------------- */

type ArenaSetupStep = "join" | "contact" | "venue";

const SETUP_STEPS: Array<{ id: ArenaSetupStep; label: string }> = [
    { id: "join", label: "Joining" },
    { id: "contact", label: "Contact" },
    { id: "venue", label: "Venue QR" },
];

/**
 * Where to resume. An owner who saved the required pair and closed the tab
 * before the optional QR step must come back to the QR step, not be walked
 * through two answered questions again.
 */
const initialSetupStep = (
    joinPolicy: GroupJoinPolicy | null | undefined,
    contactEmail: string | null | undefined
): ArenaSetupStep => {
    if (!joinPolicy) return "join";
    return isValidArenaRewardContactEmail(normalizeArenaRewardContactEmail(contactEmail ?? ""))
        ? "venue"
        : "contact";
};

const SetupProgress = ({ active }: { active: ArenaSetupStep }) => {
    const activeIndex = SETUP_STEPS.findIndex((step) => step.id === active);

    return (
        <ol className="grid grid-cols-3 gap-2" aria-label="Arena setup progress">
            {SETUP_STEPS.map((step, index) => {
                const current = step.id === active;
                const complete = index < activeIndex;
                return (
                    <li
                        key={step.id}
                        aria-current={current ? "step" : undefined}
                        className={`rounded-xl border px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.1em] sm:px-3 sm:text-[11px] sm:tracking-[0.12em] ${current
                            ? "border-violet-300/50 bg-violet-500/20 text-violet-50"
                            : complete
                                ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
                                : "border-white/10 bg-white/[0.03] text-gray-500"
                            }`}
                    >
                        <span className="mr-1" aria-hidden>
                            {index + 1}.
                        </span>
                        {step.label}
                    </li>
                );
            })}
        </ol>
    );
};

const policyOptions: Array<{
    id: GroupJoinPolicy;
    title: string;
    description: string;
}> = [
        {
            id: "automatic",
            title: "Automatic entry",
            description:
                "Anyone with this Arena’s invite code or venue QR joins immediately.",
        },
        {
            id: "approval_required",
            title: "Approval required",
            description:
                "Invite codes and venue QR scans send you a request to approve or decline.",
        },
    ];

const ArenaSetupPage = () => {
    const params = useParams<{ arenaId: string }>();
    const arenaId = params.arenaId;
    const router = useRouter();
    const dispatch = useDispatch();
    const currentUser = useCurrentUser();

    const scopedArena = useScopedGroup(arenaId);
    const arena = scopedArena.group;
    const { setupLoading, setupError, setupComplete } = useSelector(
        (state: RootState) => state.arena
    );
    const { detail: venueDetail, detailForId: venueDetailForId } = useSelector(
        (state: RootState) => state.venue
    );

    const isOwner = Boolean(
        arena &&
        currentUser?.userId &&
        arena.created_by === currentUser.userId &&
        arena.current_user_member?.role === "commissioner"
    );

    const storedJoinPolicy = arena?.join_policy ?? null;
    const storedEmail = arena?.reward_contact_email ?? "";

    const [step, setStep] = useState<ArenaSetupStep>("join");
    const [joinPolicy, setJoinPolicy] = useState<GroupJoinPolicy | null>(null);
    const [email, setEmail] = useState("");
    const [venueSetupOpen, setVenueSetupOpen] = useState(false);
    const [venueConfigured, setVenueConfigured] = useState(false);
    const headingRef = useRef<HTMLHeadingElement>(null);
    /**
     * Latched so the record's own values seed the form EXACTLY once. The group
     * is re-read after a successful save, and without this the arriving record
     * would reset a step the owner has already moved past.
     */
    const seededRef = useRef(false);

    const normalizedEmail = normalizeArenaRewardContactEmail(email);
    const validEmail = isValidArenaRewardContactEmail(normalizedEmail);

    // The record arrives asynchronously; seed from it on the first read.
    useEffect(() => {
        if (seededRef.current || !arena) return;
        seededRef.current = true;
        setJoinPolicy(storedJoinPolicy);
        setEmail(storedEmail);
        setStep(initialSetupStep(storedJoinPolicy, storedEmail));
    }, [arena, storedEmail, storedJoinPolicy]);

    useEffect(() => {
        if (!arenaId || !currentUser?.userId) return;
        dispatch(fetchGroupByIdRequest({ groupId: arenaId }));
        // Whether a venue already exists decides the copy on step 3 and whether
        // it offers Skip or Go to Arena.
        dispatch(fetchVenueCheckInDetailRequest({ group_id: arenaId }));
    }, [arenaId, currentUser?.userId, dispatch]);

    // The wizard owns this state for the length of one visit and nothing longer.
    useEffect(() => {
        dispatch(clearArenaSetupState());
        return () => {
            dispatch(clearArenaSetupState());
        };
    }, [dispatch]);

    const venueAlreadyActive = useMemo(
        () =>
            venueDetailForId === arenaId &&
            venueDetail?.venue_check_in?.state === "active",
        [arenaId, venueDetail, venueDetailForId]
    );

    useEffect(() => {
        if (venueAlreadyActive) setVenueConfigured(true);
    }, [venueAlreadyActive]);

    // Signed out, or somebody else's Arena. `status === "missing"` is the only
    // settled "no such Arena" — a mismatched record reads as loading, so this
    // never bounces on the first commit after a navigation.
    useEffect(() => {
        if (!currentUser?.userId) {
            router.replace("/signin");
            return;
        }
        if (scopedArena.status === "missing") {
            router.replace("/arena");
            return;
        }
        if (scopedArena.status === "ready" && !isOwner) {
            router.replace("/arena");
        }
    }, [currentUser?.userId, isOwner, router, scopedArena.status]);

    useEffect(() => {
        headingRef.current?.focus();
    }, [step]);

    /**
     * The save is confirmed by the SLICE, not by the click: a 409
     * `arena_setup_already_complete` is folded into the same success, because
     * setup has in fact happened and the wizard has to move on.
     */
    useEffect(() => {
        if (!setupComplete) return;
        setEmail((current) => normalizeArenaRewardContactEmail(current));
        // Advances FROM the contact step only. The flag is cleared on mount, but
        // that clear is a dispatch and lands after this effect's first run — so
        // a `true` left over from another Arena's wizard would otherwise skip
        // this owner past two questions they have not answered.
        setStep((current) => (current === "contact" ? "venue" : current));
    }, [setupComplete]);

    if (!currentUser?.userId || !arena || !isOwner) return null;

    const openArena = () => router.push(`/arena/${arenaId}`);

    const saveRequiredSetup = () => {
        if (!joinPolicy || !validEmail || setupLoading) return;
        dispatch(
            completeArenaSetupRequest({
                arena_id: arenaId,
                join_policy: joinPolicy,
                email: normalizedEmail,
            })
        );
    };

    return (
        <div className="arena-theme mx-auto flex w-full max-w-3xl flex-col gap-6 pb-8 text-white">
            <header className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                <span>Arena setup</span>
                <span className="text-violet-200">{arena.name}</span>
            </header>

            <SetupProgress active={step} />

            {step === "join" ? (
                <section className="rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-950/80 via-black to-black p-6 shadow-[0_24px_80px_rgba(76,29,149,0.16)] sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
                        Required &middot; Step 1
                    </p>
                    <h1
                        ref={headingRef}
                        tabIndex={-1}
                        className="mt-2 text-2xl font-semibold outline-none"
                    >
                        How should members join?
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                        Choose whether an invite code or venue QR admits someone right away
                        or sends you a join request.
                    </p>

                    <div
                        className="mt-6 grid gap-3 sm:grid-cols-2"
                        role="radiogroup"
                        aria-label="Arena join policy"
                    >
                        {policyOptions.map((option) => {
                            const selected = joinPolicy === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => setJoinPolicy(option.id)}
                                    className={`min-h-40 rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${selected
                                        ? "border-violet-300/70 bg-violet-500/20"
                                        : "border-white/10 bg-white/[0.03] hover:border-violet-300/35"
                                        }`}
                                >
                                    <span className="block text-base font-semibold text-white">
                                        {option.title}
                                    </span>
                                    <span className="mt-2 block text-sm leading-6 text-gray-400">
                                        {option.description}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-6 flex justify-end border-t border-white/10 pt-5">
                        <button
                            type="button"
                            disabled={!joinPolicy}
                            onClick={() => setStep("contact")}
                            className="min-h-11 rounded-xl border border-violet-300/50 bg-violet-500/20 px-5 text-sm font-semibold text-violet-50 transition hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Continue to contact email
                        </button>
                    </div>
                </section>
            ) : null}

            {step === "contact" ? (
                <section className="rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-950/80 via-black to-black p-6 shadow-[0_24px_80px_rgba(76,29,149,0.16)] sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
                        Required &middot; Step 2
                    </p>
                    <h1
                        ref={headingRef}
                        tabIndex={-1}
                        className="mt-2 text-2xl font-semibold outline-none"
                    >
                        Add an Arena contact email
                    </h1>
                    <p
                        id="arena-setup-email-description"
                        className="mt-2 max-w-2xl text-sm leading-6 text-gray-400"
                    >
                        Members can use this address for Arena questions. It is also used
                        when you offer contest prizes.
                    </p>

                    <label className="mt-6 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                        Arena contact email
                        <input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            maxLength={254}
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="contact@yourbusiness.com"
                            aria-invalid={normalizedEmail.length > 0 && !validEmail}
                            aria-describedby="arena-setup-email-description"
                            className="mt-2 min-h-12 w-full rounded-xl border border-violet-300/20 bg-black/60 px-4 text-sm normal-case text-white outline-none transition placeholder:text-gray-600 focus:border-violet-300/60"
                        />
                    </label>

                    {normalizedEmail.length > 0 && !validEmail ? (
                        <p role="alert" className="mt-3 text-sm text-amber-100">
                            Enter a valid Arena contact email.
                        </p>
                    ) : null}
                    {setupError ? (
                        <p role="alert" className="mt-3 text-sm text-red-200">
                            {setupError}
                        </p>
                    ) : null}

                    <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5">
                        <button
                            type="button"
                            disabled={setupLoading}
                            onClick={() => setStep("join")}
                            className="min-h-11 rounded-xl px-4 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            disabled={!validEmail || setupLoading}
                            onClick={saveRequiredSetup}
                            className="min-h-11 rounded-xl border border-violet-300/50 bg-violet-500/20 px-5 text-sm font-semibold text-violet-50 transition hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {setupLoading ? "Saving setup…" : "Save and continue"}
                        </button>
                    </div>
                </section>
            ) : null}

            {step === "venue" ? (
                <section className="rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-950/80 via-black to-black p-6 shadow-[0_24px_80px_rgba(76,29,149,0.16)] sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
                        Optional &middot; Step 3
                    </p>
                    <h1
                        ref={headingRef}
                        tabIndex={-1}
                        className="mt-2 text-2xl font-semibold outline-none"
                    >
                        {venueConfigured
                            ? "Your Venue Check-In QR is ready"
                            : "Set up a Venue Check-In QR"}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                        {venueConfigured
                            ? "Members can scan the reusable QR at your venue to join and verify their location."
                            : "If you run in-person contests, create a reusable QR that lets members join and verify they are at your venue. You can also do this later in Arena Settings."}
                    </p>

                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                        <p className="text-sm font-semibold text-white">
                            Venue Check-In is optional
                        </p>
                        <p className="mt-2 text-xs leading-5 text-gray-500">
                            Setup asks for a member-facing venue name, address, and a current
                            location reading from the venue.
                        </p>
                    </div>

                    <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
                        {!venueConfigured ? (
                            <>
                                <button
                                    type="button"
                                    onClick={openArena}
                                    className="min-h-11 rounded-xl px-4 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.05] hover:text-white"
                                >
                                    Skip for now
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setVenueSetupOpen(true)}
                                    className="min-h-11 rounded-xl border border-violet-300/50 bg-violet-500/20 px-5 text-sm font-semibold text-violet-50 transition hover:bg-violet-500/30"
                                >
                                    Set up Venue Check-In QR
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={openArena}
                                className="min-h-11 rounded-xl border border-violet-300/50 bg-violet-500/20 px-5 text-sm font-semibold text-violet-50 transition hover:bg-violet-500/30"
                            >
                                Go to Arena
                            </button>
                        )}
                    </div>
                </section>
            ) : null}

            <ArenaVenueSetupDialog
                open={venueSetupOpen}
                onClose={() => setVenueSetupOpen(false)}
                arenaId={arenaId}
                onConfigured={() => setVenueConfigured(true)}
            />
        </div>
    );
};

export default ArenaSetupPage;
