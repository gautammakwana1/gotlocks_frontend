"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LeftWorkspaceDrawer } from "@/components/ui/LeftWorkspaceDrawer";
import {
    browserVenueGeolocationAdapter,
    DEFAULT_VENUE_CHECK_IN_DURATION_MINUTES,
    DEFAULT_VENUE_RADIUS_METERS,
    VENUE_CHECK_IN_DURATION_OPTIONS_MINUTES,
    VENUE_LOCATION_ERROR_COPY,
    VENUE_MAX_ACCEPTABLE_ACCURACY_METERS,
    VENUE_RADIUS_OPTIONS_METERS,
    type VenueGeolocationAdapter,
    type VenueLocationReading,
} from "@/lib/arenas/venueCheckIn";
import type { RootState } from "@/lib/interfaces/interfaces";
import {
    clearGroupVenueWriteState,
    configureGroupVenueRequest,
    updateGroupVenueRequest,
} from "@/lib/redux/slices/venueSlice";

/* ----------------------------------------------------------------------------
 * Venue Check-In setup, ported from the MVP's
 * gotlocks.app_mvp2/components/arenas/checkin/ArenaVenueSetupDialog.tsx.
 *
 * Two steps for a first-time setup (what this is → the form), one for an edit.
 *
 * TWO endpoints behind one form, chosen by whether a venue already exists:
 *
 *   none yet   POST /configure — the complete write, and the only one that
 *              mints a token. A fresh GPS reading is REQUIRED: it is creating
 *              the geofence every later check-in is measured against.
 *   existing   PUT /update — a partial patch, and location is optional there
 *              deliberately, so an owner fixing a typo in the venue name or
 *              widening the radius by 50 m does not have to stand in the
 *              restaurant to do it. Recapture only if the venue has moved.
 *
 * The MVP has one mock call and therefore demands a reading either way; this
 * backend split them on purpose, and honouring that is the difference between
 * `/update` being useful and being unreachable.
 *
 * Everything else is the server's: the QR token is minted from
 * crypto.randomBytes and never accepted from the caller, and the radius and
 * duration fall back to the venue's own stored values before the product
 * defaults — so renaming a venue cannot silently reset a radius its owner tuned.
 *
 * The accuracy check is done in BOTH places on purpose. The endpoint refuses a
 * reading worse than 200 m; refusing it here as well means the owner finds out
 * while they are still standing in the room and can walk to a window, rather
 * than after a round trip.
 * -------------------------------------------------------------------------- */

type SetupStep = "intro" | "details";

export type ArenaVenueSetupDialogProps = {
    open: boolean;
    onClose: () => void;
    /** Route param — never a record's id, which can belong to another group. */
    arenaId: string;
    /** Fired after a successful save, before the drawer closes, with the
     *  server's own message — which differs between a first setup and a patch. */
    onConfigured?: (message: string) => void;
    /** Swappable so a test never touches real GPS. */
    geolocationAdapter?: VenueGeolocationAdapter;
};

export const ArenaVenueSetupDialog = ({
    open,
    onClose,
    arenaId,
    onConfigured,
    geolocationAdapter = browserVenueGeolocationAdapter,
}: ArenaVenueSetupDialogProps) => {
    const dispatch = useDispatch();
    const {
        detail,
        detailForId,
        configureAction,
        configureLoading,
        configureMessage,
        configureError,
    } = useSelector((state: RootState) => state.venue);

    // Read through an id check, like every other group-scoped slot: another
    // Arena's venue must never seed this form.
    const scopedDetail = detailForId === arenaId ? detail : null;
    const existing = scopedDetail?.venue_check_in.venue ?? null;
    const isDisabledVenue = scopedDetail?.venue_check_in.state === "disabled";
    // Only THIS dialog's writes report here; a disable or enable fired from the
    // settings panel behind it shares the slot and must not close the drawer.
    const ownAction = configureAction === "configure" || configureAction === "update";
    const saving = configureLoading && ownAction;

    const [step, setStep] = useState<SetupStep>("intro");
    const [name, setName] = useState("");
    const [displayAddress, setDisplayAddress] = useState("");
    const [reading, setReading] = useState<VenueLocationReading | null>(null);
    const [radius, setRadius] = useState<number>(DEFAULT_VENUE_RADIUS_METERS);
    const [duration, setDuration] = useState<number>(
        DEFAULT_VENUE_CHECK_IN_DURATION_MINUTES
    );
    const [locating, setLocating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestController = useRef<AbortController | null>(null);
    // Redux answers asynchronously and its slots outlive one open/close cycle,
    // so the outcome effect only reacts to a save THIS dialog started.
    const savingRef = useRef(false);

    useEffect(() => {
        if (!open) {
            requestController.current?.abort();
            return;
        }
        setStep(existing ? "details" : "intro");
        setName(existing?.name ?? "");
        setDisplayAddress(existing?.display_address ?? "");
        setReading(null);
        setRadius(existing?.verification_radius_meters ?? DEFAULT_VENUE_RADIUS_METERS);
        setDuration(
            existing?.check_in_duration_minutes ?? DEFAULT_VENUE_CHECK_IN_DURATION_MINUTES
        );
        setError(null);
        setLocating(false);
        savingRef.current = false;
        dispatch(clearGroupVenueWriteState());
        // `existing` is intentionally part of this: the detail read can land
        // after the drawer opens, and the form has to pick it up when it does.
    }, [dispatch, existing, open]);

    useEffect(
        () => () => {
            requestController.current?.abort();
        },
        []
    );

    // ONE place the save's outcome is reported, so a re-render cannot act twice.
    useEffect(() => {
        if (!savingRef.current) return;
        if (configureLoading) return;
        if (configureError) {
            savingRef.current = false;
            setError(configureError);
            dispatch(clearGroupVenueWriteState());
            return;
        }
        if (configureMessage) {
            savingRef.current = false;
            dispatch(clearGroupVenueWriteState());
            onConfigured?.(configureMessage);
            onClose();
        }
    }, [
        configureError,
        configureLoading,
        configureMessage,
        dispatch,
        onClose,
        onConfigured,
    ]);

    const close = () => {
        requestController.current?.abort();
        onClose();
    };

    const confirmLocation = async () => {
        requestController.current?.abort();
        const controller = new AbortController();
        requestController.current = controller;
        setLocating(true);
        setError(null);
        const result = await geolocationAdapter.requestBestReading({
            signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setLocating(false);
        if (!result.ok) {
            setReading(null);
            setError(VENUE_LOCATION_ERROR_COPY[result.outcome]);
            return;
        }
        // Same ceiling the endpoint enforces — caught here so the owner can walk
        // to a window instead of learning it from a 400.
        if (result.reading.accuracyMeters > VENUE_MAX_ACCEPTABLE_ACCURACY_METERS) {
            setReading(null);
            setError(
                `This location reading is only accurate to ${Math.round(
                    result.reading.accuracyMeters
                )} m. Move near an entrance or window and capture it again before saving.`
            );
            return;
        }
        setReading(result.reading);
    };

    const save = () => {
        if (!name.trim() || !displayAddress.trim()) {
            setError("Add a venue name and address label.");
            return;
        }
        // First setup CREATES the geofence, so it cannot proceed without one.
        // An update can: `/update` accepts a patch with no location precisely so
        // a typo does not require a trip to the venue.
        if (!existing && !reading) {
            setError("Use this venue’s current location before saving.");
            return;
        }
        setError(null);
        savingRef.current = true;

        if (existing) {
            dispatch(
                updateGroupVenueRequest({
                    group_id: arenaId,
                    name: name.trim(),
                    display_address: displayAddress.trim(),
                    verification_radius_meters: radius,
                    check_in_duration_minutes: duration,
                    // Latitude and longitude travel together or not at all — the
                    // endpoint refuses one axis, and rightly: a venue that moved
                    // on one is at a point nobody has ever been.
                    ...(reading
                        ? {
                            latitude: reading.latitude,
                            longitude: reading.longitude,
                            accuracy_meters: reading.accuracyMeters,
                        }
                        : {}),
                })
            );
            return;
        }

        dispatch(
            configureGroupVenueRequest({
                group_id: arenaId,
                name: name.trim(),
                display_address: displayAddress.trim(),
                latitude: reading!.latitude,
                longitude: reading!.longitude,
                accuracy_meters: reading!.accuracyMeters,
                verification_radius_meters: radius,
                check_in_duration_minutes: duration,
            })
        );
    };

    return (
        <LeftWorkspaceDrawer
            open={open}
            onClose={close}
            title={existing ? "Update venue" : "Venue Check-In"}
            side="right"
            size="compact"
            tone="neutral"
            className="arena-theme"
            contentClassName="pt-0"
            backdropLabel="Dismiss venue setup"
        >
            <div className="flex min-h-full flex-col">
                <div className="border-b border-white/10 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                        {existing
                            ? "Venue configuration"
                            : `Step ${step === "intro" ? 1 : 2} of 2`}
                    </p>
                    {!existing ? (
                        <div className="mt-2 flex gap-1.5" aria-hidden>
                            <span className="h-px flex-1 bg-white/65" />
                            <span
                                className={`h-px flex-1 ${step === "details" ? "bg-white/65" : "bg-white/10"
                                    }`}
                            />
                        </div>
                    ) : null}
                </div>

                {step === "intro" ? (
                    <section className="flex flex-1 flex-col py-6">
                        <h3 className="text-xl font-semibold text-white">
                            Set up Venue Check-In
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            Create one reusable Arena QR. Members scan it and confirm their
                            location before entering venue-required contests.
                        </p>

                        <ul className="mt-6 divide-y divide-white/10 border-y border-white/10 text-sm text-gray-300">
                            {[
                                "Confirm the venue once from a device at the location.",
                                "Print or share one permanent QR with members.",
                                "Staff do not need to approve each check-in.",
                            ].map((line) => (
                                <li key={line} className="flex gap-3 py-3.5">
                                    <span
                                        aria-hidden
                                        className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-500"
                                    />
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-auto flex justify-end border-t border-white/10 pt-5">
                            <button
                                type="button"
                                onClick={() => setStep("details")}
                                className="min-h-11 rounded-lg bg-white px-5 text-sm font-bold text-black transition hover:bg-gray-200"
                            >
                                Set Up Venue
                            </button>
                        </div>
                    </section>
                ) : (
                    <section className="py-6">
                        <h3 className="text-xl font-semibold text-white">Venue information</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            This is the member-facing venue label and the location used for
                            verification.
                        </p>

                        {/* Saving does NOT switch a disabled venue back on: that is
                            `/enable`'s job, because it has to rotate the token — the
                            old poster was declared finished and reviving its code
                            would resurrect every copy of it. */}
                        {isDisabledVenue ? (
                            <p
                                role="status"
                                className="mt-4 rounded-lg border border-amber-300/25 bg-amber-500/10 px-3.5 py-3 text-xs leading-5 text-amber-100"
                            >
                                This venue is switched off. Saving corrects its details but
                                leaves it off — use “Enable Venue Check-In” in Arena settings
                                to turn it back on, which issues a new QR to print.
                            </p>
                        ) : null}

                        <div className="mt-6 space-y-5">
                            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                                Venue name
                                <input
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="Downtown Sports Bar"
                                    className="mt-2 w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-3 text-sm normal-case text-white outline-none transition focus:border-violet-300/60"
                                />
                            </label>
                            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                                Address shown to members
                                <input
                                    value={displayAddress}
                                    onChange={(event) => setDisplayAddress(event.target.value)}
                                    placeholder="123 Main Street, Atlanta, GA"
                                    className="mt-2 w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-3 text-sm normal-case text-white outline-none transition focus:border-violet-300/60"
                                />
                            </label>

                            <section
                                aria-labelledby="venue-location-heading"
                                aria-busy={locating}
                                className="border-y border-white/10 py-4"
                            >
                                <h4
                                    id="venue-location-heading"
                                    className="text-sm font-semibold text-white"
                                >
                                    Venue location
                                </h4>
                                <p className="mt-1 text-xs leading-5 text-gray-400">
                                    {existing
                                        ? "Already set. Recapture only if the venue has moved — do it while physically at the new location."
                                        : "Complete this while physically at the venue. This device’s location becomes the verification point."}
                                </p>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => void confirmLocation()}
                                        disabled={locating}
                                        className="min-h-11 rounded-lg border border-violet-300/35 px-3.5 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/10 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        {locating
                                            ? "Reading venue location…"
                                            : reading
                                                ? "Use This Venue’s Current Location Again"
                                                : existing
                                                    ? "Recapture This Venue’s Location"
                                                    : "Use This Venue’s Current Location"}
                                    </button>
                                </div>
                                {reading ? (
                                    <p
                                        role="status"
                                        className="mt-3 border-l-2 border-emerald-300/40 pl-3 text-sm font-semibold text-emerald-300"
                                    >
                                        Venue location confirmed.
                                        <span className="mt-0.5 block text-xs font-normal text-gray-400">
                                            Accurate to about {Math.round(reading.accuracyMeters)} m.
                                        </span>
                                    </p>
                                ) : null}
                            </section>

                            <details className="group border-b border-white/10">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30 [&::-webkit-details-marker]:hidden">
                                    <span>
                                        <span className="block text-sm font-semibold text-gray-200">
                                            Advanced verification settings
                                        </span>
                                        <span className="mt-0.5 block text-xs text-gray-500">
                                            Recommended defaults work for most venues
                                        </span>
                                    </span>
                                    <svg
                                        aria-hidden="true"
                                        viewBox="0 0 16 16"
                                        data-directional-arrow="down"
                                        className="ui-directional-arrow h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                                    >
                                        <path
                                            d="m4 6 4 4 4-4"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.5"
                                        />
                                    </svg>
                                </summary>
                                <div className="grid gap-4 border-t border-white/10 py-4 sm:grid-cols-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-400">
                                        Verification radius
                                        <select
                                            value={radius}
                                            onChange={(event) => setRadius(Number(event.target.value))}
                                            className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm normal-case text-white"
                                        >
                                            {VENUE_RADIUS_OPTIONS_METERS.map((meters) => (
                                                <option key={meters} value={meters}>
                                                    {meters} meters
                                                    {meters === DEFAULT_VENUE_RADIUS_METERS
                                                        ? " (recommended)"
                                                        : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-400">
                                        Check-In duration
                                        <select
                                            value={duration}
                                            onChange={(event) => setDuration(Number(event.target.value))}
                                            className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm normal-case text-white"
                                        >
                                            {VENUE_CHECK_IN_DURATION_OPTIONS_MINUTES.map((minutes) => (
                                                <option key={minutes} value={minutes}>
                                                    {minutes / 60} hours
                                                    {minutes === DEFAULT_VENUE_CHECK_IN_DURATION_MINUTES
                                                        ? " (recommended)"
                                                        : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            </details>

                            {error ? (
                                <p
                                    role="alert"
                                    className="border-l-2 border-red-300/40 pl-3 text-sm leading-6 text-red-100"
                                >
                                    {error}
                                </p>
                            ) : null}

                            <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-5">
                                {!existing ? (
                                    <button
                                        type="button"
                                        onClick={() => setStep("intro")}
                                        className="min-h-11 rounded-lg px-4 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.05] hover:text-white"
                                    >
                                        Back
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={saving || locating}
                                    aria-busy={saving}
                                    className="min-h-11 rounded-lg bg-white px-5 text-sm font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving
                                        ? "Saving…"
                                        : existing
                                            ? "Update Venue"
                                            : "Activate Venue Check-In"}
                                </button>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </LeftWorkspaceDrawer>
    );
};

export default ArenaVenueSetupDialog;
