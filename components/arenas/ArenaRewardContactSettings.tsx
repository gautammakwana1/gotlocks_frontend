"use client";

import { useEffect, useId, useState } from "react";
import {
    SettingsActionBar,
    SettingsSection,
    SettingsStatus,
    settingsFieldLabelClassName,
    settingsInputClassName,
    settingsPrimaryButtonClassName,
} from "@/components/settings/SettingsUI";
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
    /**
     * Drop the settings-screen chrome. The Arena settings tab wants the
     * full-bleed ruled SettingsSection; the contest wizard drops this panel
     * inside its own bordered violet card mid-draft, where that section rule
     * would land right on top of the card border and read as a doubled line.
     */
    embedded?: boolean;
};

export const ArenaRewardContactSettings = ({
    rewardContactEmail,
    onSave,
    saving = false,
    embedded = false,
}: ArenaRewardContactSettingsProps) => {
    const headingId = useId();
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

    const description = (
        <span id={descriptionId}>
            Users can expect Arena emails from this address and contact it with questions. An
            Arena contact email is required before contest prizes can be added or changed.
        </span>
    );

    const body = (
        <div className="space-y-4">
            <label className={`block ${settingsFieldLabelClassName}`}>
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
                    className={`${settingsInputClassName} mt-2 bg-black/60 normal-case`}
                />
            </label>

            {touched && !valid ? (
                <p id={validationErrorId} role="alert" className="text-xs text-amber-100">
                    Enter a valid Arena contact email.
                </p>
            ) : null}

            <SettingsActionBar>
                <SettingsStatus tone="success" className="border-0 bg-transparent px-0 py-0">
                    {saved && !dirty ? "Arena contact email saved." : null}
                </SettingsStatus>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!valid || !dirty || saving}
                    className={settingsPrimaryButtonClassName}
                >
                    {saving ? "Saving…" : "Save Arena contact email"}
                </button>
            </SettingsActionBar>
        </div>
    );

    /* The wizard's copy of this panel. Same controls, no section rule — the
       card it sits in draws its own border, and SettingsSection's would land
       directly on it. */
    if (embedded) {
        return (
            <section
                aria-labelledby={headingId}
                data-arena-reward-contact-settings
                className="space-y-4 px-5 py-7 sm:px-6"
            >
                <div className="space-y-1">
                    <h2 id={headingId} className="text-base font-semibold tracking-tight text-white">
                        Arena contact email
                    </h2>
                    <p className="text-sm normal-case leading-6 text-[var(--text-secondary)]">
                        {description}
                    </p>
                </div>
                {body}
            </section>
        );
    }

    return (
        <SettingsSection
            data-arena-reward-contact-settings
            title="Arena contact email"
            description={description}
        >
            {body}
        </SettingsSection>
    );
};

export default ArenaRewardContactSettings;
