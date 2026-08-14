"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import {
    getSafeRelativeReturnPath,
    withSafeReturnPath,
} from "@/lib/auth/safeReturnPath";
import {
    browserVenueGeolocationAdapter,
    VENUE_ASSIST_CODE_LENGTH,
    type VenueGeolocationAdapter,
} from "@/lib/arenas/venueCheckIn";
import type { RootState } from "@/lib/interfaces/interfaces";
import {
    clearVenueCheckInVerification,
    redeemVenueAssistCodeRequest,
    resolveVenueCheckInTokenRequest,
    verifyVenueCheckInRequest,
} from "@/lib/redux/slices/venueSlice";

/* ----------------------------------------------------------------------------
 * The QR landing page, ported from the MVP's app/check-in/[token]/page.tsx.
 *
 * Which screen appears is the SERVER's answer, not a ladder of booleans
 * reassembled here: `/check-in/resolve/:token` returns `next_step`, four rungs
 * deep, and each rung is a different screen.
 *
 *   sign_in          no account yet — the page is readable signed-out, which is
 *                    the whole point of a poster in a restaurant
 *   join_group       signed in, not a member of this Arena
 *   verify_location  a member with no live check-in — the main event
 *   checked_in       already checked in; here is when it runs out
 *
 * The verification itself sends what this device's GPS said and NEVER a verdict.
 * Distance, radius, edge allowance, clock and session length are all the
 * server's, which is the entire difference between a geofence and a suggestion —
 * so a refusal arrives as a 422 with an outcome code and is rendered verbatim.
 *
 * The STAFF ASSIST CODE fallback sits under the location button, as the MVP has
 * it: six digits, read out by staff, for the phone that will not cooperate. Its
 * success is the SAME redux action the GPS path dispatches, because the endpoint
 * answers with the same envelope — so this screen has exactly one success state
 * and nothing downstream knows which way the member got in.
 *
 * ONE piece of the MVP's page is still absent: the join-by-venue-token button.
 * `/join-arena` takes an invite CODE, and the resolve response deliberately does
 * not carry one — a public token page handing out a join credential would make
 * the poster an invite. So the join rung sends the customer to the Arenas hub
 * instead, marked TODO(api) at its spot.
 * -------------------------------------------------------------------------- */

const formatSessionExpiration = (value: string | null) =>
    value
        ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "";

const CheckInFrame = ({ children }: { children: React.ReactNode }) => (
    <main className="mx-auto flex min-h-[72dvh] w-full max-w-xl items-center px-4 py-10 sm:px-6">
        <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b0f] shadow-2xl shadow-black/40">
            {children}
        </div>
    </main>
);

const VenueHeader = ({
    arenaName,
    venueName,
    address,
}: {
    arenaName: string;
    venueName: string;
    address: string;
}) => (
    <div className="border-b border-white/10 bg-gradient-to-br from-violet-500/15 via-transparent to-fuchsia-500/10 px-6 py-7 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300">
            Venue Check-In
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">{arenaName}</h1>
        <p className="mt-3 text-sm font-semibold text-gray-200">{venueName}</p>
        <p className="mt-1 text-xs leading-5 text-gray-400">{address}</p>
    </div>
);

export type VenueCheckInScreenProps = {
    publicToken: string;
    /** Swappable so a test never touches real GPS. */
    geolocationAdapter?: VenueGeolocationAdapter;
};

export const VenueCheckInScreen = ({
    publicToken,
    geolocationAdapter = browserVenueGeolocationAdapter,
}: VenueCheckInScreenProps) => {
    const dispatch = useDispatch();
    const searchParams = useSearchParams();
    const currentUser = useCurrentUser();
    const {
        resolved,
        resolvedForToken,
        resolveLoading,
        resolveError,
        verifyLoading,
        verifySuccess,
        verifyError,
        assistRedeemLoading,
        assistRedeemError,
    } = useSelector((state: RootState) => state.venue);

    const [locating, setLocating] = useState(false);
    const [assistCode, setAssistCode] = useState("");
    const requestController = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!publicToken) return;
        dispatch(resolveVenueCheckInTokenRequest({ token: publicToken }));
        // `currentUser` is a dependency on purpose: the same token resolves to a
        // DIFFERENT next_step once the customer comes back from /signin, and the
        // page has to re-ask rather than keep showing the sign-in rung.
    }, [dispatch, publicToken, currentUser?.userId]);

    useEffect(
        () => () => {
            requestController.current?.abort();
            dispatch(clearVenueCheckInVerification());
        },
        [dispatch]
    );

    // Read through a token check, like every other scoped slot in this store.
    const scoped = resolvedForToken === publicToken ? resolved : null;
    const sourceReturnTo = getSafeRelativeReturnPath(searchParams.get("returnTo"));
    const checkInPath = sourceReturnTo
        ? `/check-in/${encodeURIComponent(publicToken)}?returnTo=${encodeURIComponent(sourceReturnTo)}`
        : `/check-in/${encodeURIComponent(publicToken)}`;
    const customerPreview = searchParams.get("preview") === "customer";

    /* ---------- Loading ---------- */
    if (!scoped && resolveLoading) {
        return (
            <CheckInFrame>
                <div className="space-y-3 px-6 py-10 sm:px-8" role="status">
                    <div className="h-3 w-28 animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-7 w-2/3 animate-pulse rounded bg-white/[0.06]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.04]" />
                </div>
            </CheckInFrame>
        );
    }

    /* ---------- A dead QR ----------
     *
     * A retired token, a disabled venue and a deleted Arena all arrive here
     * identically, and nothing on this screen can tell them apart either. */
    if (!scoped) {
        return (
            <CheckInFrame>
                <div className="px-6 py-10 text-center sm:px-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300">
                        Venue Check-In unavailable
                    </p>
                    <h1 className="mt-3 text-2xl font-bold text-white">
                        This QR is no longer active
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-gray-400">
                        {resolveError ??
                            "Ask venue staff for the current Arena QR. Regenerated and disabled QR links stop working immediately."}
                    </p>
                    <Link
                        href="/arena"
                        className="mt-7 inline-flex min-h-11 items-center rounded-xl border border-white/15 px-5 text-sm font-semibold text-white"
                    >
                        Browse Arenas
                    </Link>
                </div>
            </CheckInFrame>
        );
    }

    const arenaName = scoped.group.name;
    const venue = scoped.venue;
    const session = verifySuccess?.session ?? scoped.session;

    /* ---------- The owner's "Preview customer flow" ----------
     *
     * Renders nothing real: no join, no location prompt, no check-in. It exists
     * so an owner can see what a customer sees without consuming their own
     * check-in. */
    if (customerPreview) {
        return (
            <CheckInFrame>
                <VenueHeader
                    arenaName={arenaName}
                    venueName={venue.name}
                    address={venue.display_address}
                />
                <div className="px-6 py-7 sm:px-8">
                    <span className="rounded-full border border-violet-300/25 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-100">
                        Customer-flow preview
                    </span>
                    <h2 className="mt-5 text-xl font-bold text-white">
                        Join this Arena and check in
                    </h2>
                    <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-gray-400">
                        This preview does not join an account, request location, create a
                        check-in, or create a competitive entry.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                        <span className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-bold text-black">
                            Join Arena &amp; Check In
                        </span>
                        <Link
                            href={`/arena/${scoped.group.id}?tab=settings`}
                            className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-5 text-sm font-semibold text-gray-200"
                        >
                            Back to Settings
                        </Link>
                    </div>
                </div>
            </CheckInFrame>
        );
    }

    /* ---------- Rung 1: no account ---------- */
    if (scoped.next_step === "sign_in") {
        return (
            <CheckInFrame>
                <VenueHeader
                    arenaName={arenaName}
                    venueName={venue.name}
                    address={venue.display_address}
                />
                <div className="px-6 py-7 sm:px-8">
                    <h2 className="text-xl font-bold text-white">Check in to this Arena</h2>
                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/5 px-3 py-1">
                            Free to join
                        </span>
                        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/5 px-3 py-1">
                            No purchase necessary
                        </span>
                    </div>
                    <p className="mt-5 text-xs leading-5 text-gray-500">
                        Sign in or create an account first. After authentication, you&rsquo;ll
                        return here to join if needed and explicitly verify your venue visit.
                    </p>
                    <div className="mt-6 grid gap-2 sm:grid-cols-2">
                        <Link
                            href={withSafeReturnPath("/signin", checkInPath)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-black transition hover:bg-gray-200"
                        >
                            Sign in to Check In
                        </Link>
                        <Link
                            href={withSafeReturnPath("/account-creation", checkInPath)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/5"
                        >
                            Create Account
                        </Link>
                    </div>
                </div>
            </CheckInFrame>
        );
    }

    /* ---------- Rung 2: signed in, not a member ---------- */
    if (scoped.next_step === "join_group") {
        return (
            <CheckInFrame>
                <VenueHeader
                    arenaName={arenaName}
                    venueName={venue.name}
                    address={venue.display_address}
                />
                <div className="px-6 py-7 sm:px-8">
                    <h2 className="text-xl font-bold text-white">
                        Join this Arena to check in
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-gray-300">
                        Checking in is for members of {arenaName}. Joining uses the
                        Arena&rsquo;s normal membership and capacity rules — it does not enter
                        you into a contest or accept contest rules.
                    </p>
                    {/* TODO(api): the MVP joins straight from the poster
                        (`joinArenaByVenueToken`). `POST /group/arena/join-arena` takes an
                        invite CODE, and the resolve response deliberately carries none —
                        handing one out from a public token page would turn the poster
                        itself into an invite. Until a join-by-venue-token endpoint
                        exists, the customer is sent to the Arenas hub with its
                        join-by-code flow. */}
                    <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-gray-400">
                        Ask venue staff for this Arena&rsquo;s invite code, then join from the
                        Arenas page and scan again.
                    </p>
                    <Link
                        href="/arena"
                        className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-black transition hover:bg-gray-200"
                    >
                        Go to Arenas
                    </Link>
                </div>
            </CheckInFrame>
        );
    }

    /* ---------- Rung 4: already checked in (or just now) ---------- */
    if (scoped.next_step === "checked_in") {
        const contestReturnTo =
            sourceReturnTo?.startsWith(`/arena/${scoped.group.id}/`) ? sourceReturnTo : null;
        return (
            <CheckInFrame>
                <VenueHeader
                    arenaName={arenaName}
                    venueName={venue.name}
                    address={venue.display_address}
                />
                <div className="px-6 py-8 text-center sm:px-8">
                    <div
                        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 text-2xl text-emerald-200"
                        aria-hidden="true"
                    >
                        ✓
                    </div>
                    <h2 className="mt-5 text-2xl font-bold text-white">
                        {verifySuccess
                            ? "You’re checked in"
                            : `You’re already checked in until ${formatSessionExpiration(session.expires_at)}`}
                    </h2>
                    {verifySuccess ? (
                        <p className="mt-3 text-sm leading-6 text-gray-300">
                            Your venue session is active at {arenaName} until{" "}
                            {formatSessionExpiration(session.expires_at)}.
                        </p>
                    ) : null}
                    <p className="mt-3 text-xs leading-5 text-gray-500">
                        {verifySuccess?.note ??
                            "Check-In unlocks eligible venue-required entry flows. It does not create an entry or accept contest rules by itself."}
                    </p>
                    <div className="mt-7 grid gap-2">
                        {contestReturnTo ? (
                            <Link
                                href={contestReturnTo}
                                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-black"
                            >
                                Continue to Contest
                            </Link>
                        ) : (
                            <Link
                                href={`/arena/${scoped.group.id}?tab=contests`}
                                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-black"
                            >
                                View Arena Contests
                            </Link>
                        )}
                        <Link
                            href={`/arena/${scoped.group.id}`}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-5 text-sm font-semibold text-gray-200"
                        >
                            Arena Feed
                        </Link>
                    </div>
                </div>
            </CheckInFrame>
        );
    }

    /* ---------- Rung 3: verify ---------- */
    const verifyLocation = async () => {
        requestController.current?.abort();
        const controller = new AbortController();
        requestController.current = controller;
        setLocating(true);
        const result = await geolocationAdapter.requestBestReading({
            signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setLocating(false);

        // A failure only this device could observe is REPORTED, not swallowed:
        // a wall of `permission_denied` from one venue means the prompt copy is
        // wrong, and that is invisible if the client keeps its own failures.
        dispatch(
            verifyVenueCheckInRequest(
                result.ok
                    ? {
                        token: publicToken,
                        latitude: result.reading.latitude,
                        longitude: result.reading.longitude,
                        accuracy_meters: result.reading.accuracyMeters,
                    }
                    : { token: publicToken, outcome: result.outcome }
            )
        );
    };

    // One busy flag across both paths: the two are alternative ways of proving
    // the same thing, so neither should be startable while the other is running.
    const busy = locating || verifyLoading || assistRedeemLoading;

    return (
        <CheckInFrame>
            <VenueHeader
                arenaName={arenaName}
                venueName={venue.name}
                address={venue.display_address}
            />
            <div className="px-6 py-7 sm:px-8">
                <h2 className="text-xl font-bold text-white">
                    Verify that you&rsquo;re at {venue.name}
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-300">
                    We&rsquo;ll check your location once to confirm that you&rsquo;re near the
                    venue. Your location will not be continuously tracked.
                </p>
                <p className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-400/5 px-4 py-3 text-xs leading-5 text-emerald-100/80">
                    gotLocks does not continuously track your location. Venue staff can see
                    that a check-in occurred, but should not see your precise device
                    location.
                </p>
                {venue.check_in_duration_minutes ? (
                    <p className="mt-3 text-xs leading-5 text-gray-500">
                        A check-in lasts {venue.check_in_duration_minutes / 60} hours.
                    </p>
                ) : null}
                {/* The server's own sentence, whichever refusal it was. It never
                    names the radius, the distance or the allowance — that would be
                    a free calibration tool for anyone probing the geofence. */}
                {verifyError ? (
                    <p
                        role="alert"
                        className="mt-4 rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
                    >
                        {verifyError}
                    </p>
                ) : null}
                <button
                    type="button"
                    onClick={() => void verifyLocation()}
                    disabled={busy}
                    aria-busy={busy}
                    className="mt-6 min-h-12 w-full rounded-xl bg-white px-5 text-sm font-bold text-black transition hover:bg-gray-200 disabled:cursor-wait disabled:opacity-50"
                >
                    {locating
                        ? "Reading your location…"
                        : verifyLoading
                            ? "Verifying location…"
                            : verifyError
                                ? "Try Location Again"
                                : "Verify My Location"}
                </button>

                {/* The staff fallback, exactly where the MVP puts it: under the
                    location button, for the member whose phone will not cooperate.
                    The token travels with it — this page has one — but the endpoint
                    is group-scoped on purpose, so a member who could not scan at all
                    can still be helped from elsewhere later. */}
                <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-600">
                    <span className="h-px flex-1 bg-white/10" />
                    Having trouble? Enter a staff check-in code.
                    <span className="h-px flex-1 bg-white/10" />
                </div>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                    Six-digit assist code
                    <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={VENUE_ASSIST_CODE_LENGTH}
                        value={assistCode}
                        onChange={(event) =>
                            setAssistCode(
                                event.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, VENUE_ASSIST_CODE_LENGTH)
                            )
                        }
                        placeholder="000000"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-white outline-none focus:border-violet-300/60"
                    />
                </label>
                {/* One sentence for every way a code can fail — the server does not
                    distinguish a wrong code from an expired, revoked or already-spent
                    one, and neither should this. */}
                {assistRedeemError ? (
                    <p
                        role="alert"
                        className="mt-3 rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
                    >
                        {assistRedeemError}
                    </p>
                ) : null}
                <button
                    type="button"
                    onClick={() =>
                        dispatch(
                            redeemVenueAssistCodeRequest({
                                code: assistCode,
                                token: publicToken,
                            })
                        )
                    }
                    disabled={assistCode.length !== VENUE_ASSIST_CODE_LENGTH || busy}
                    aria-busy={assistRedeemLoading}
                    className="mt-3 min-h-11 w-full rounded-xl border border-violet-300/30 bg-violet-500/10 px-5 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {assistRedeemLoading ? "Checking code…" : "Use Staff Assist Code"}
                </button>

                <Link
                    href={`/arena/${scoped.group.id}`}
                    className="mt-5 block text-center text-xs font-semibold text-gray-500 hover:text-gray-300"
                >
                    Cancel and view Arena
                </Link>
            </div>
        </CheckInFrame>
    );
};

export default VenueCheckInScreen;
