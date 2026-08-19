"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
    clearArenaCheckoutState,
    fetchArenaCheckoutStatusRequest,
} from "@/lib/redux/slices/arenaSlice";

/**
 * Handles the browser's return from Stripe Checkout.
 *
 * This exists because the redirect and the webhook race. Stripe sends the user
 * back the instant the card clears, but the webhook that actually provisions the
 * Arena may land a second or two later — or fail. So the browser cannot treat
 * "I'm back on the success URL" as "it worked", and it must not silently show a
 * locked Arena either.
 *
 * The endpoint polled here calls the SAME idempotent fulfilment function the
 * webhook calls, so this is self-healing rather than merely informational: if
 * the webhook never arrives, the poll completes the provisioning itself.
 *
 * The session_id is stripped from the URL after the first read so a refresh —
 * or a shared link — cannot re-enter this flow.
 */

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 15; // ~30s, comfortably longer than a healthy webhook round trip.

export type ArenaCheckoutReturnProps = { arenaId: string };

const ArenaCheckoutReturn = ({ arenaId }: ArenaCheckoutReturnProps) => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { checkoutStatus, checkoutStatusError, checkoutArenaId } = useAppSelector(
        (state) => state.arena
    );

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [gaveUp, setGaveUp] = useState(false);
    const pollsRef = useRef(0);

    // Read the session id once, on mount, then clean the URL. Reading from
    // window rather than useSearchParams keeps this out of a Suspense boundary
    // on a statically prerendered route.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("checkout") !== "success") return;
        const id = params.get("session_id");
        if (!id) return;

        setSessionId(id);
        pollsRef.current = 0;
        dispatch(fetchArenaCheckoutStatusRequest({ session_id: id }));

        params.delete("checkout");
        params.delete("session_id");
        const query = params.toString();
        router.replace(`${window.location.pathname}${query ? `?${query}` : ""}`);
    }, [dispatch, router]);

    // Keep polling while the backend says "pending".
    useEffect(() => {
        if (!sessionId || checkoutStatus !== "pending" || gaveUp) return;

        if (pollsRef.current >= MAX_POLLS) {
            setGaveUp(true);
            return;
        }

        const timer = window.setTimeout(() => {
            pollsRef.current += 1;
            dispatch(fetchArenaCheckoutStatusRequest({ session_id: sessionId }));
        }, POLL_INTERVAL_MS);

        return () => window.clearTimeout(timer);
    }, [sessionId, checkoutStatus, gaveUp, dispatch]);

    useEffect(() => () => { dispatch(clearArenaCheckoutState()); }, [dispatch]);

    // The session must be for THIS Arena. A stale session_id pasted onto another
    // Arena's URL would otherwise show that Arena a success banner it never
    // earned. Rendering nothing is the correct answer — the poll still ran, so
    // the real Arena is still fulfilled.
    if (!sessionId || !checkoutStatus) return null;
    if (checkoutArenaId && checkoutArenaId !== arenaId) return null;

    if (checkoutStatus === "complete") {
        return (
            <div
                role="status"
                className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
            >
                <p className="font-semibold">Payment received — your Arena is live.</p>
                <p className="mt-0.5 text-emerald-100/80">
                    Your first month is included. We&apos;ll email a receipt.
                </p>
            </div>
        );
    }

    if (checkoutStatus === "expired") {
        return (
            <div
                role="alert"
                className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
            >
                <p className="font-semibold">That checkout expired.</p>
                <p className="mt-0.5 text-amber-100/80">
                    Nothing was charged. Start again to create this Arena.
                </p>
            </div>
        );
    }

    // pending — and, once we stop polling, the honest version of pending: the
    // money is safe, we just have not seen confirmation yet. Never tell the user
    // the payment failed, because it did not.
    return (
        <div
            role="status"
            aria-live="polite"
            className="mb-4 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/80"
        >
            <p className="font-semibold text-white">
                {gaveUp ? "Still finishing up" : "Confirming your payment…"}
            </p>
            <p className="mt-0.5">
                {gaveUp
                    ? "Your payment went through. This Arena will activate shortly — refresh in a moment, and contact support if it stays like this."
                    : "This usually takes a few seconds. You can stay on this page."}
            </p>
            {checkoutStatusError && (
                <p className="mt-1 text-white/60">{checkoutStatusError}</p>
            )}
        </div>
    );
};

export default ArenaCheckoutReturn;
