"use client";

import { useMemo, useState } from "react";
import PickBuilderShell from "@/components/pick-builder/core/PickBuilderShell";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type { BuiltPickPayload, League, PostDestinationGroups } from "@/lib/interfaces/interfaces";
import { StructuredFeedComposer } from "./StructuredFeedComposer";
import type {
    StructuredFeedCapabilities,
    StructuredFeedContestOption,
    StructuredFeedContextMetadata,
    StructuredFeedRole,
    StructuredFeedRollingWindow,
    StructuredFeedSelectionOption,
    StructuredFeedSubmission,
    StructuredFeedSubmitResponse,
} from "./types";

const ANNOUNCEMENT_MAX = 2000;

// MVP counterpart: components/feed/GroupFeedAnnouncementCreator.tsx (its drawer,
// GroupFeedAnnouncementDrawer.tsx, maps to GroupFeedPostDrawer here). The MVP cut
// its composer down to a single announcement panel because its mock store has no
// Community Pick / Staff Pick / contest-entry write path. Ours are live REST
// wiring, so the announcement panel below is ported one-for-one and the tab strip
// stays — the Feed header's "New Announcement" control opens this same drawer on
// the announcement tab (see `initialTab`) instead of replacing it.
export type GroupFeedPostCreatorTab =
    | "community_pick"
    | "announcement"
    | "staff_pick"
    | "competitive_pick";

type CreatorTab = GroupFeedPostCreatorTab;

const TAB_LABELS: Record<CreatorTab, string> = {
    community_pick: "Pick Post",
    announcement: "Announcement",
    staff_pick: "Staff Pick",
    competitive_pick: "Contest Entry",
};

// The drawer header now describes the panel below it rather than the composer as
// a whole: one blanket sentence was wrong for three of the four panels, and the
// MVP header only ever had to describe announcements. The announcement line is
// the MVP's verbatim (GroupFeedAnnouncementCreator.tsx:55-57).
const TAB_DESCRIPTIONS: Record<CreatorTab, string> = {
    community_pick:
        "Share an ordinary post with this community, your Profile, and Global. Contest entries are submitted from their Contest pages and stay inside this community.",
    announcement: "Share an official update with everyone in this community.",
    staff_pick:
        "Share a noncompetitive Staff Pick — Staff Picks do not affect standings.",
    competitive_pick:
        "Submit an entry to an open contest. Entries stay inside this community.",
};

export type GroupFeedPostCreatorProps = {
    context: StructuredFeedContextMetadata;
    contextName: string;
    currentRole: StructuredFeedRole;
    capabilities: StructuredFeedCapabilities;
    selectionOptions: readonly StructuredFeedSelectionOption[];
    contestOptions?: readonly StructuredFeedContestOption[];
    communityPickWindow?: StructuredFeedRollingWindow;
    /**
     * Which panel opens first. The Feed header's announcement control is
     * announcement-specific, so it passes "announcement"; every other entry point
     * omits this and keeps the historic default (Pick Post when the viewer can
     * post one). An unavailable tab still falls back to the first allowed one.
     */
    initialTab?: GroupFeedPostCreatorTab;
    /** Legacy composer path — announcements, Staff Picks, competitive entries. */
    onSubmit: (
        submission: StructuredFeedSubmission
    ) => StructuredFeedSubmitResponse | Promise<StructuredFeedSubmitResponse>;
    /** Community Picks are built in the full Pick Builder, not the odds dropdown. */
    onSubmitBuiltPicks: (
        picks: BuiltPickPayload[]
    ) => StructuredFeedSubmitResponse | Promise<StructuredFeedSubmitResponse>;
    onPostComplete: () => void;
};

export const GroupFeedPostCreator = ({
    context,
    contextName,
    currentRole,
    capabilities,
    selectionOptions,
    contestOptions = [],
    communityPickWindow,
    initialTab,
    onSubmit,
    onSubmitBuiltPicks,
    onPostComplete,
}: GroupFeedPostCreatorProps) => {
    const currentUser = useCurrentUser();
    const isArena = context.kind === "arena";

    const [activeLeague, setActiveLeague] = useState<League>("NFL");
    const [announcementBody, setAnnouncementBody] = useState("");
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string>();

    // Only the post types this viewer may actually create become tabs, so a
    // League member sees one panel and never an empty tab strip.
    const tabs = useMemo<CreatorTab[]>(() => {
        const next: CreatorTab[] = [];
        if (capabilities.canCreateCommunityPick) next.push("community_pick");
        if (capabilities.canCreateStaffPost) next.push("announcement");
        if (capabilities.canCreateStaffPick) next.push("staff_pick");
        if (capabilities.canCreateCompetitivePick) next.push("competitive_pick");
        return next;
    }, [capabilities]);

    const [activeTab, setActiveTab] = useState<CreatorTab>(
        () =>
            initialTab ??
            (capabilities.canCreateCommunityPick ? "community_pick" : "announcement")
    );
    const resolvedTab = tabs.includes(activeTab) ? activeTab : tabs[0];

    const publishBuiltPicks = async (picks: BuiltPickPayload[], reset?: () => void) => {
        if (!picks.length || publishing) return;
        setPublishing(true);
        setError(undefined);
        const response = await onSubmitBuiltPicks(picks);
        setPublishing(false);
        if (response.status !== "accepted") {
            setError(
                response.status === "rejected"
                    ? response.message
                    : "That price moved. Rebuild the pick and try again."
            );
            return;
        }
        reset?.();
        onPostComplete();
    };

    const publishAnnouncement = async () => {
        const body = announcementBody.trim();
        if (!body || publishing) return;
        setPublishing(true);
        setError(undefined);
        const response = await onSubmit({ mode: "staff_post", context, body });
        setPublishing(false);
        if (response.status !== "accepted") {
            setError(response.status === "rejected" ? response.message : undefined);
            return;
        }
        setAnnouncementBody("");
        onPostComplete();
    };

    // The legacy odds-dropdown composer still owns Staff Picks and competitive
    // contest entries. It renders one mode at a time, so each tab hands it only
    // its own capability.
    const composerCapabilitiesFor = (tab: CreatorTab): StructuredFeedCapabilities => ({
        canCreateCommunityPick: false,
        canCreateCompetitivePick: tab === "competitive_pick",
        canCreateStaffPick: tab === "staff_pick",
        canCreateStaffPost: false,
    });

    if (!resolvedTab) {
        return (
            <p className="text-sm text-gray-500">
                You do not have permission to post in this Feed.
            </p>
        );
    }

    return (
        <div className={`flex flex-col gap-6 pb-16 ${isArena ? "arena-theme" : ""}`}>
            <header className="space-y-2 border-b border-white/10 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {contextName}
                </p>
                <p className="max-w-2xl text-sm leading-6 text-gray-400">
                    {TAB_DESCRIPTIONS[resolvedTab]}
                </p>
            </header>

            {tabs.length > 1 ? (
                <div
                    role="tablist"
                    aria-label="Feed post type"
                    className="flex gap-5 overflow-x-auto border-b border-white/10"
                >
                    {tabs.map((tab) => {
                        const active = resolvedTab === tab;
                        return (
                            <button
                                key={tab}
                                type="button"
                                role="tab"
                                id={`group-feed-${tab}-tab`}
                                aria-controls={`group-feed-${tab}-panel`}
                                aria-selected={active}
                                onClick={() => {
                                    setActiveTab(tab);
                                    setError(undefined);
                                }}
                                className={`shrink-0 border-b-2 pb-3 text-sm font-semibold transition ${active
                                    ? isArena
                                        ? "border-violet-300 text-violet-50"
                                        : "border-sky-300 text-white"
                                    : "border-transparent text-gray-400 hover:text-white"
                                    }`}
                            >
                                {TAB_LABELS[tab]}
                            </button>
                        );
                    })}
                </div>
            ) : null}

            {error ? (
                <p role="alert" className="text-sm text-red-300">
                    {error}
                </p>
            ) : null}

            {resolvedTab === "community_pick" ? (
                <section
                    id="group-feed-community_pick-panel"
                    role={tabs.length > 1 ? "tabpanel" : undefined}
                    aria-labelledby={tabs.length > 1 ? "group-feed-community_pick-tab" : undefined}
                >
                    {communityPickWindow ? (
                        <p className="mb-4 text-xs text-gray-500">
                            {communityPickWindow.used}/{communityPickWindow.limit} community picks
                            used{communityPickWindow.windowHours ? ` in the last ${communityPickWindow.windowHours}h` : ""}.
                        </p>
                    ) : null}
                    {/* The same shell the Slip and standalone builders use, in its
                        standalone "post" intent. Nothing about the Slip flow changes:
                        this is a new consumer, not a modification. */}
                    <PickBuilderShell
                        compact
                        surface="drawer"
                        initialLeague={activeLeague}
                        context={{
                            mode: "standalone",
                            currentUser,
                            slip: [],
                            intent: "post",
                            onComplete: (payload: BuiltPickPayload) => {
                                void publishBuiltPicks([payload]);
                            },
                            onSelectPostDestination: (
                                groups: PostDestinationGroups,
                                reset: () => void
                            ) => {
                                void publishBuiltPicks(groups.profilePayloads, reset);
                            },
                            onSelectActiveLeague: setActiveLeague,
                        }}
                    />
                </section>
            ) : resolvedTab === "announcement" ? (
                <section
                    id="group-feed-announcement-panel"
                    role={tabs.length > 1 ? "tabpanel" : undefined}
                    aria-labelledby={tabs.length > 1 ? "group-feed-announcement-tab" : undefined}
                    className={`rounded-2xl border p-5 sm:p-6 ${isArena
                        ? "border-violet-300/15 bg-violet-500/[0.055]"
                        : "border-white/10 bg-white/[0.04]"
                        }`}
                >
                    <div>
                        <h2 className="text-lg font-semibold text-white">Post an announcement</h2>
                        {/* The MVP's subline here reads "Announcements and finalized
                            contest results are the only posts shown in Community"
                            (GroupFeedAnnouncementCreator.tsx:70-72). That is true of
                            the MVP's feed taxonomy only — ours keeps Community Picks
                            and Staff Picks in the same view — so it is deliberately
                            not ported. */}
                        <p className="mt-1 text-sm text-gray-400">
                            Share an update with everyone in {contextName}.
                        </p>
                    </div>

                    <label
                        htmlFor="group-feed-announcement-body"
                        className="mt-5 block text-xs font-semibold uppercase tracking-wide text-gray-300"
                    >
                        Announcement
                    </label>
                    <textarea
                        id="group-feed-announcement-body"
                        value={announcementBody}
                        onChange={(event) => setAnnouncementBody(event.target.value)}
                        rows={7}
                        maxLength={ANNOUNCEMENT_MAX}
                        placeholder="Write your announcement..."
                        className={`mt-2 w-full resize-y rounded-2xl border border-white/12 bg-black/70 px-4 py-3 text-sm normal-case leading-6 text-white outline-none transition placeholder:text-gray-600 ${isArena ? "caret-violet-300 focus:border-violet-300/60" : "ui-input-accent"
                            }`}
                    />

                    <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-[11px] tabular-nums text-gray-600">
                            {announcementBody.trim().length}/{ANNOUNCEMENT_MAX}
                        </span>
                        <button
                            type="button"
                            onClick={publishAnnouncement}
                            disabled={!announcementBody.trim() || publishing}
                            className={`rounded-xl border px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${isArena
                                ? "border-violet-300/45 bg-violet-500/20 text-violet-50 hover:border-violet-200/70 hover:bg-violet-500/30"
                                : "ui-accent-button"
                                }`}
                        >
                            {publishing ? "Publishing..." : "Post Announcement"}
                        </button>
                    </div>
                </section>
            ) : (
                <section
                    id={`group-feed-${resolvedTab}-panel`}
                    role="tabpanel"
                    aria-labelledby={`group-feed-${resolvedTab}-tab`}
                >
                    <StructuredFeedComposer
                        context={context}
                        currentRole={currentRole}
                        capabilities={composerCapabilitiesFor(resolvedTab)}
                        selectionOptions={selectionOptions}
                        contestOptions={contestOptions}
                        communityPickWindow={communityPickWindow}
                        onSubmit={async (submission) => {
                            const response = await onSubmit(submission);
                            if (response.status === "accepted") onPostComplete();
                            return response;
                        }}
                    />
                </section>
            )}
        </div>
    );
};

export default GroupFeedPostCreator;
