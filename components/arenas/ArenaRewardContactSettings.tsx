"use client";

import { useEffect, useId, useState } from "react";
import {
    ARENA_REWARD_CONTACT_EMAIL_MAX,
    isValidArenaRewardContactEmail,
    normalizeArenaRewardContactEmail,
} from "@/lib/contests/arenaReward";

/* ----------------------------------------------------------------------------
 * THE ARENA'S REWARD INBOX — ported from the MVP's
 * components/arenas/ArenaRewardContactSettings.tsx.
 *
 * PERMANENT OWNER ONLY, and the narrower rule is deliberate rather than
 * inherited: this address is published to winners as the way to claim a
 * real-world prize, so whoever controls it controls where a prize claim lands.
 * That belongs to the person who is on the hook for the prize, not to every
 * manager they have ever appointed. `PUT /group/arena/details` answers 403 for a
 * manager who sends the field, so the caller must not render this for one.
 *
 * The value is normalised — trimmed and lower-cased — BEFORE it is compared or
 * sent, because that is the form the column's CHECK requires. Typing
 * "Rewards@Bar.com" and saving stores "rewards@bar.com", and the input is
 * rewritten to match so the next comparison is against what was actually stored.
 * -------------------------------------------------------------------------- */

export type ArenaRewardContactSettingsProps = {
    /**
     * `GET /group/:id` returns this key ONLY to the owner, so `undefined` here
     * can mean "not yours to see" as well as "not configured". Render this
     * component for the owner alone and the ambiguity does not arise.
     */
    rewardContactEmail: string | null | undefined;
    /** Receives the NORMALISED address, or null to clear it. */
    onSave: (rewardContactEmail: string | null) => void;
    saving?: boolean;
};

export const ArenaRewardContactSettings = ({
    rewardContactEmail,
    onSave,
    saving = false,
}: ArenaRewardContactSettingsProps) => {
    const titleId = useId();
    const descriptionId = useId();
    const validationErrorId = useId();
    const [email, setEmail] = useState(rewardContactEmail ?? "");
    const [touched, setTouched] = useState(false);
    /**
     * What the last submit sent. The saved line appears only once the ARENA
     * RECORD comes back carrying it — the update saga re-reads the group, so a
     * failed write never reaches this state and never claims a save.
     */
    const [lastSubmitted, setLastSubmitted] = useState<string | null>(null);

    useEffect(() => {
        setEmail(rewardContactEmail ?? "");
        setTouched(false);
    }, [rewardContactEmail]);

    const normalizedEmail = normalizeArenaRewardContactEmail(email);
    const normalizedCurrentEmail = normalizeArenaRewardContactEmail(rewardContactEmail ?? "");
    const saved = lastSubmitted !== null && lastSubmitted === normalizedCurrentEmail;
    // An empty box is a valid answer — it clears the inbox. Only a non-empty
    // value that is not an address is a mistake worth flagging.
    const valid = normalizedEmail.length === 0 || isValidArenaRewardContactEmail(normalizedEmail);
    const dirty = normalizedEmail !== normalizedCurrentEmail;

    const handleSave = () => {
        if (!valid || !dirty || saving) return;
        setEmail(normalizedEmail);
        setLastSubmitted(normalizedEmail);
        onSave(normalizedEmail || null);
    };

    return (
        <section
            aria-labelledby={titleId}
            data-arena-reward-contact-settings
            className="space-y-4 px-5 py-7 sm:px-6"
        >
            <div>
                <h2
                    id={titleId}
                    className="text-sm font-semibold uppercase tracking-[0.14em] text-white"
                >
                    Arena contact email
                </h2>
                <p
                    id={descriptionId}
                    className="mt-1 max-w-2xl text-xs normal-case leading-5 text-gray-500"
                >
                    Users can expect Arena emails from this address and contact it with questions.
                    An Arena contact email is required before contest prizes can be added or
                    changed.
                </p>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                Arena contact email
                <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={ARENA_REWARD_CONTACT_EMAIL_MAX}
                    value={email}
                    disabled={saving}
                    onChange={(event) => {
                        setEmail(event.target.value);
                        setTouched(true);
                    }}
                    placeholder="contact@yourbusiness.com"
                    aria-invalid={touched && !valid}
                    aria-describedby={
                        touched && !valid
                            ? `${descriptionId} ${validationErrorId}`
                            : descriptionId
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm normal-case text-white outline-none transition placeholder:text-gray-600 focus:border-violet-300/60 disabled:cursor-not-allowed disabled:opacity-55"
                />
            </label>

            {touched && !valid ? (
                <p id={validationErrorId} role="alert" className="text-xs text-amber-100">
                    Enter a valid Arena contact email.
                </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3">
                {saved && !dirty ? (
                    <p role="status" className="mr-auto text-xs text-emerald-200">
                        Arena contact email saved.
                    </p>
                ) : null}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!valid || !dirty || saving}
                    className="rounded-xl bg-violet-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-violet-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {saving ? "Saving…" : "Save Arena contact email"}
                </button>
            </div>
        </section>
    );
};

export default ArenaRewardContactSettings;
