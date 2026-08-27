"use client";

import { useEffect, useId, useState } from "react";
import {
    SettingsActionBar,
    SettingsSection,
    SettingsStatus,
    settingsPrimaryButtonClassName,
} from "@/components/settings/SettingsUI";
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
        <SettingsSection
            data-arena-join-policy-settings
            title="Joining this Arena"
            description="Choose what happens after someone uses the Arena invite code or scans its venue QR."
            bodyClassName="space-y-4"
        >
            {/* Real radios in a fieldset rather than the old two-up card grid:
                the choice is exclusive, so it should arrive at a screen reader
                as one group with a selected member, and arrow keys should move
                between the options for free. `titleId` still namespaces the
                radio group so two Arena panels on one page cannot share a name. */}
            <fieldset className="divide-y divide-white/10 border-y border-white/10">
                <legend className="sr-only">Arena join policy</legend>
                {OPTIONS.map((option) => {
                    const active = selected === option.id;
                    return (
                        <label
                            key={option.id}
                            className={`flex min-h-16 cursor-pointer gap-3 py-4 text-left transition focus-within:outline focus-within:outline-2 focus-within:outline-violet-300 ${active ? "text-violet-100" : "text-gray-300 hover:text-white"
                                }`}
                        >
                            <input
                                type="radio"
                                name={`${titleId}-join-policy`}
                                value={option.id}
                                checked={active}
                                disabled={saving}
                                onChange={() => setSelected(option.id)}
                                className="mt-0.5 h-5 w-5 shrink-0 accent-violet-300 disabled:cursor-not-allowed disabled:opacity-55"
                            />
                            <span>
                                <span className="block text-sm font-semibold text-white">
                                    {option.title}
                                </span>
                                <span className="mt-1 block text-xs normal-case leading-5 text-gray-400">
                                    {option.description}
                                </span>
                            </span>
                        </label>
                    );
                })}
            </fieldset>

            {pendingRequestCount > 0 ? (
                <p className="rounded-xl border border-amber-300/20 bg-amber-500/[0.07] px-4 py-3 text-xs normal-case leading-5 text-amber-100">
                    {pendingRequestCount} pending join{" "}
                    {pendingRequestCount === 1 ? "request remains" : "requests remain"}
                    {selected === "automatic"
                        ? " queued until you explicitly approve or decline it."
                        : " ready for review in Members."}
                </p>
            ) : null}

            <SettingsActionBar>
                <SettingsStatus tone="success" className="border-0 bg-transparent px-0 py-0">
                    {saved && !dirty ? "Arena join policy saved." : null}
                </SettingsStatus>
                <button
                    type="button"
                    onClick={save}
                    disabled={!dirty || saving}
                    className={settingsPrimaryButtonClassName}
                >
                    {saving ? "Saving…" : "Save join policy"}
                </button>
            </SettingsActionBar>
        </SettingsSection>
    );
};

export default ArenaJoinPolicySettings;
