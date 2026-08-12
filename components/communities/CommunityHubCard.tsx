"use client";

import Link from "next/link";
import {
    getCombinedContestCapacityLabel,
    getGroupCapacityLabel,
} from "@/lib/groups/limits";
import type { GroupObject } from "@/lib/interfaces/interfaces";
import { displayNameGradientStyle } from "@/lib/styles/text";
import InviteCodeCopy from "../group/InviteCodeCopy";
import {
    groupPreviewKickerTextClassName,
    groupPreviewMetaTextClassName,
    GroupTypeMetaLabel,
} from "../group/GroupPreviewChip";
import type { CommunityHubTone } from "./CommunityHubControls";

/**
 * The caller's role inside a community, as the hub displays it.
 *
 * Derived from `current_user_member.role`, NOT from which list the row came in
 * on: /owned-* is commissioner-only, but /joined-* mixes managers and plain
 * members, and a manager card must not read "MEMBER".
 */
export const getCommunityRoleLabel = (group: GroupObject): string => {
    const role = group.current_user_member?.role;
    if (role === "commissioner") return "OWNER";
    if (role === "manager") return "MANAGER";
    return "MEMBER";
};

/**
 * The occupancy number to show against the community's member cap.
 *
 * The two products count seats differently, and the label has to match what the
 * server actually enforces on join or a full community reads as having room:
 *   - League — `groups.max_members` counts EVERY role, commissioner included, so
 *     the numerator is `total_member_count`.
 *   - Arena  — the cap counts role='member' rows only (owner and managers are
 *     capped separately by the tier's manager_limit), so it is `member_count`.
 * See joinLeagueByInviteCode / joinArenaByInviteCode in the backend.
 */
const getMemberOccupancy = (group: GroupObject): number =>
    group.group_type === "arena"
        ? group.member_count ?? 0
        : group.total_member_count ?? group.member_count ?? 0;

const cardToneClassNames: Record<CommunityHubTone, string> = {
    league:
        "border-sky-200/15 bg-[linear-gradient(145deg,rgba(14,42,67,0.82),rgba(8,15,27,0.98))] hover:border-sky-200/30 hover:shadow-sky-950/30 focus-within:border-sky-200/35",
    arena:
        "border-violet-300/15 bg-[linear-gradient(145deg,rgba(64,34,105,0.88),rgba(10,10,24,0.98))] hover:border-violet-300/30 hover:shadow-violet-950/30 focus-within:border-violet-200/35",
};

const glowToneClassNames: Record<CommunityHubTone, string> = {
    league: "bg-sky-400/[0.08] group-hover/card:bg-sky-400/[0.13]",
    arena: "bg-violet-400/[0.1] group-hover/card:bg-violet-400/[0.15]",
};

const outlineToneClassNames: Record<CommunityHubTone, string> = {
    league: "focus-visible:outline-sky-300",
    arena: "focus-visible:outline-violet-300",
};

/**
 * Arena names run violet→fuchsia; League names use the shared white/silver
 * `displayNameGradientStyle`. Two mechanisms because they are two different
 * gradients — the arena one is a plain Tailwind background with no text-shadow
 * or extra letter-spacing, so it cannot be expressed as a tone of the inline
 * style. Applying one to the other tone is the bug this pair exists to prevent;
 * see the same split on the Home page cards.
 */
const nameToneClassNames: Record<CommunityHubTone, string> = {
    league: "",
    arena: "bg-gradient-to-r from-white via-violet-100 to-fuchsia-200",
};

const metaToneClassNames: Record<CommunityHubTone, string> = {
    league: "text-gray-500",
    arena: "text-gray-400",
};

export const CommunityHubCard = ({
    group,
    tone,
    href,
}: {
    group: GroupObject;
    tone: CommunityHubTone;
    href: string;
}) => (
    <article
        data-community-card={group.id}
        className={`group/card relative flex min-h-[152px] overflow-hidden rounded-[22px] border p-5 shadow-lg shadow-black/25 transition hover:-translate-y-0.5 sm:min-h-[164px] sm:p-6 lg:min-h-[185px] motion-reduce:transform-none motion-reduce:transition-none ${cardToneClassNames[tone]}`}
    >
        <div
            aria-hidden
            className={`pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full blur-2xl transition motion-reduce:transition-none ${glowToneClassNames[tone]}`}
        />
        {/* Stretched link, not an onClick on the article: the invite-code copy
            button sits inside the card and must stay independently clickable. */}
        <Link
            href={href}
            aria-label={`Open ${group.name}`}
            className={`absolute inset-0 rounded-[22px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${outlineToneClassNames[tone]}`}
        />

        <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
                <div
                    className={`flex min-w-0 flex-wrap items-center gap-1.5 text-gray-400 ${groupPreviewKickerTextClassName}`}
                >
                    <GroupTypeMetaLabel
                        group={group}
                        ownerPlan={group.hosting_tier === "pro" ? "pro" : "free"}
                        textClassName={groupPreviewKickerTextClassName}
                    />
                    <span aria-hidden className="text-gray-600">
                        ·
                    </span>
                    <span className="text-gray-300">{getCommunityRoleLabel(group)}</span>
                </div>
                <InviteCodeCopy
                    code={group.invite_code}
                    accent={tone}
                    className="pointer-events-auto relative z-20 shrink-0 text-right"
                />
            </div>

            <div className="flex min-w-0 flex-1 items-center py-4">
                <h3
                    className={`allow-caps line-clamp-2 break-words bg-clip-text text-xl font-extrabold leading-tight text-transparent sm:text-2xl ${nameToneClassNames[tone]}`}
                    style={tone === "arena" ? undefined : displayNameGradientStyle}
                >
                    {group.name}
                </h3>
            </div>

            <div
                className={`flex flex-wrap items-center gap-2 ${metaToneClassNames[tone]} ${groupPreviewMetaTextClassName}`}
            >
                <span>{getGroupCapacityLabel(group, getMemberOccupancy(group))}</span>
                <span>{getCombinedContestCapacityLabel(group, [], [])}</span>
            </div>
        </div>
    </article>
);

export default CommunityHubCard;
