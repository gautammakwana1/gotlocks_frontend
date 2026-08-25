"use client";

import { useEffect, useId, useState } from "react";
import type { GroupJoinPolicy } from "@/lib/interfaces/interfaces";

/* ----------------------------------------------------------------------------
 * HOW THIS ARENA ADMITS PEOPLE — ported from the MVP's
 * components/arenas/ArenaJoinPolicySettings.tsx.
 *
 * PERMANENT OWNER ONLY. `PUT /group/arena/join-policy` answers 403 for anyone
 * else, and this decides who gets into the Arena at all — a narrower rule than
 * the identity fields a manager may edit.
 *
 * Rendered only once setup has happened. A NULL `join_policy` means the owner
 * never finished the wizard, and the endpoint refuses that case (409) precisely
 * because this screen changes a choice rather than making the first one — the
 * caller passes `null` through and shows nothing.
 *
 * Switching to `automatic` is NOT an amnesty. The queue keeps whoever is
 * already in it, because the four people waiting may include the one the owner
 * meant to decline — hence the pending-count line, which says out loud what
 * happens to them.
 * -------------------------------------------------------------------------- */

const OPTIONS: Array<{
    id: GroupJoinPolicy;
    title: string;
    description: string;
}> = [
        {
            id: "automatic",
            title: "Automatic entry",
            description:
                "A valid Arena code or venue QR admits the member immediately.",
        },
        {
            id: "approval_required",
            title: "Approval required",
            description:
                "Every code or venue QR join becomes a request that you approve or decline.",
        },
    ];

export type ArenaJoinPolicySettingsProps = {
    joinPolicy: GroupJoinPolicy;
    pendingRequestCount: number;
    onSave: (joinPolicy: GroupJoinPolicy) => void;
    saving?: boolean;
};

export const ArenaJoinPolicySettings = ({
    joinPolicy,
    pendingRequestCount,
    onSave,
    saving = false,
}: ArenaJoinPolicySettingsProps) => {
    const titleId = useId();
    const [selected, setSelected] = useState<GroupJoinPolicy>(joinPolicy);
    /**
     * What the last submit sent. The saved line appears only once the ARENA
     * RECORD comes back carrying it — the write saga re-reads the group, so a
     * failed write never reaches this state and never claims a save. Same
     * contract as ArenaRewardContactSettings beside it.
     */
    const [lastSubmitted, setLastSubmitted] = useState<GroupJoinPolicy | null>(null);

    useEffect(() => {
        setSelected(joinPolicy);
    }, [joinPolicy]);

    const dirty = selected !== joinPolicy;
    const saved = lastSubmitted !== null && lastSubmitted === joinPolicy;

    const save = () => {
        if (!dirty || saving) return;
        setLastSubmitted(selected);
        onSave(selected);
    };

    return (
        <section
            aria-labelledby={titleId}
            data-arena-join-policy-settings
            className="space-y-4 px-5 py-7 sm:px-6"
        >
            <div>
                <h2
                    id={titleId}
                    className="text-sm font-semibold uppercase tracking-[0.14em] text-white"
                >
                    Joining this Arena
                </h2>
                <p className="mt-1 max-w-2xl text-xs normal-case leading-5 text-gray-500">
                    Choose what happens after someone uses the Arena invite code or scans its
                    venue QR.
                </p>
            </div>

            <div
                role="radiogroup"
                aria-label="Arena join policy"
                className="grid gap-3 sm:grid-cols-2"
            >
                {OPTIONS.map((option) => {
                    const active = selected === option.id;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={saving}
                            onClick={() => setSelected(option.id)}
                            className={`rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-55 ${active
                                ? "border-violet-300/55 bg-violet-500/15"
                                : "border-white/10 bg-white/[0.025] hover:border-violet-300/30"
                                }`}
                        >
                            <span className="block text-sm font-semibold text-white">
                                {option.title}
                            </span>
                            <span className="mt-1 block text-xs normal-case leading-5 text-gray-400">
                                {option.description}
                            </span>
                        </button>
                    );
                })}
            </div>

            {pendingRequestCount > 0 ? (
                <p className="rounded-xl border border-amber-300/20 bg-amber-500/[0.07] px-4 py-3 text-xs normal-case leading-5 text-amber-100">
                    {pendingRequestCount} pending join{" "}
                    {pendingRequestCount === 1 ? "request remains" : "requests remain"}
                    {selected === "automatic"
                        ? " queued until you explicitly approve or decline it."
                        : " ready for review in Members."}
                </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3">
                {saved && !dirty ? (
                    <p role="status" className="mr-auto text-xs text-emerald-200">
                        Arena join policy saved.
                    </p>
                ) : null}
                <button
                    type="button"
                    onClick={save}
                    disabled={!dirty || saving}
                    className="rounded-xl bg-violet-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-violet-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {saving ? "Saving…" : "Save join policy"}
                </button>
            </div>
        </section>
    );
};

export default ArenaJoinPolicySettings;
