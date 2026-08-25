"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* ----------------------------------------------------------------------------
 * "This group is gone" — and then it takes you somewhere real.
 *
 * A member sitting on /league/L or /arena/A when its owner deletes it sees
 * nothing until they refresh; the refresh then 404s and the page used to park
 * them on a dead end with no way out but the browser's Back button, which leads
 * straight back to the same dead page.
 *
 * TWO jobs, and the grace period does both at once:
 *
 *   1. It is a WAIT. This notice renders whenever the group slot is settled and
 *      empty, and that is briefly true in states the fetch is about to fix — a
 *      re-read in flight, a slot cleared for a different id. The caller
 *      unmounts this the moment a record lands, which clears the timer, so a
 *      late response cancels the redirect instead of racing it.
 *
 *   2. It is a READ. Redirecting instantly would flash a sentence nobody could
 *      finish, and the member would arrive at the hub with no idea why.
 *
 * `router.replace`, never `push`: the deleted group's URL must not stay in
 * history, or Back returns to the same 404 this is rescuing them from.
 *
 * The link is not decoration — it is the accessible escape hatch for anyone who
 * does not want to wait out the countdown, and the only route out if the timer
 * is ever throttled by a backgrounded tab.
 * -------------------------------------------------------------------------- */

/** Long enough to read the sentence, short enough not to feel stuck. */
const REDIRECT_DELAY_SECONDS = 4;

export type GroupNotFoundNoticeProps = {
    /** Where to land — the hub this group belonged to. */
    href: string;
    /** That hub's name, for the countdown line and the link. */
    label: string;
};

export const GroupNotFoundNotice = ({ href, label }: GroupNotFoundNoticeProps) => {
    const router = useRouter();
    const [secondsLeft, setSecondsLeft] = useState(REDIRECT_DELAY_SECONDS);

    useEffect(() => {
        // One interval drives both the countdown and the navigation, so the
        // number on screen cannot disagree with when it actually leaves.
        const timer = window.setInterval(() => {
            setSecondsLeft((current) => {
                if (current <= 1) {
                    window.clearInterval(timer);
                    router.replace(href);
                    return 0;
                }
                return current - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [href, router]);

    return (
        <div
            role="status"
            aria-live="polite"
            className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400"
        >
            <p>Group not found. Head back to Home and pick a different crew</p>
            <p className="mt-2 text-xs text-gray-500">
                {secondsLeft > 0
                    ? `Taking you back to ${label} in ${secondsLeft}…`
                    : `Taking you back to ${label}…`}
            </p>
            <Link
                href={href}
                className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/5"
            >
                Go to {label} now
            </Link>
        </div>
    );
};

export default GroupNotFoundNotice;
