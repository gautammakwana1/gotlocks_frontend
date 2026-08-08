"use client";

import type { CommunityHubTone } from "./CommunityHubControls";

const retryToneClassNames: Record<CommunityHubTone, string> = {
    league:
        "border-sky-200/30 text-sky-100 hover:border-sky-200/60 hover:bg-sky-500/10 focus-visible:outline-sky-300",
    arena:
        "border-violet-300/30 text-violet-100 hover:border-violet-200/60 hover:bg-violet-500/10 focus-visible:outline-violet-300",
};

/**
 * Shown when a hub list request fails.
 *
 * Without this the failure is invisible: the slice leaves the list at `null` and
 * clears `loading`, so the hub falls through to its "No Leagues yet" empty state
 * and tells the user they have none when the truth is the request never landed.
 */
export const CommunityHubError = ({
    tone,
    message,
    onRetry,
    retrying,
}: {
    tone: CommunityHubTone;
    message: string;
    onRetry: () => void;
    retrying: boolean;
}) => (
    <div
        role="alert"
        className="flex flex-col gap-3 rounded-2xl border border-red-300/25 bg-red-500/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
        <p className="text-sm leading-5 text-red-100">{message}</p>
        <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${retryToneClassNames[tone]}`}
        >
            {retrying ? (
                <span
                    aria-hidden
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"
                />
            ) : null}
            Try again
        </button>
    </div>
);

export default CommunityHubError;
