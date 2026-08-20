import type { ReactNode, Ref } from "react";
import type { PickCardPresentation } from "@/components/social/PickCardContent";
import type {
    Pick,
    PickReaction,
    PickReactionSummary,
    PickResult,
} from "@/lib/interfaces/interfaces";

export type StructuredFeedContextKind = "global" | "league" | "arena";

export type StructuredFeedContextMetadata = {
    kind: StructuredFeedContextKind;
    id: string;
    name: string;
    timeZone?: string;
};

export type StructuredFeedRole = "member" | "owner" | "manager" | "commissioner";
export type StructuredFeedStaffRole = Exclude<StructuredFeedRole, "member">;

export type StructuredFeedCapabilities = {
    canCreateCommunityPick: boolean;
    canCreateCompetitivePick: boolean;
    canCreateStaffPick: boolean;
    canCreateStaffPost: boolean;
};

/**
 * The Feed's VIEWS, matching the MVP's swipe pager: "updates" is everything the
 * group posts to itself (member picks, Staff Picks, announcements) and "entries"
 * is contest entries. There is deliberately no "all" — the Feed opens on Updates
 * and every record kind is reachable from one of the two.
 *
 * Renamed from the old "community" / "competitive" ids to match the MVP's
 * labels. `structuredFeedRecordMatchesFilter` treats "updates" as the CATCH-ALL
 * (`kind !== "competitive_pick"`) rather than as a list of kinds, so a record
 * kind added later cannot fall out of every view and vanish from the Feed.
 *
 * `standings` is not a record view — it swaps the feed body for the caller's
 * standings node, and the dot only appears when such a node is supplied.
 */
export type StructuredFeedFilter = "updates" | "entries" | "standings";

/**
 * The contest phase an entry is in, used by the Entries view's own filter drawer.
 * A SECOND, independent axis layered on the view: the view chooses which records
 * are listed, this chooses which of the contest entries survive.
 */
export type ContestEntryLifecycle = "open" | "locked_live" | "settled";

export type ContestEntryLifecycleFilter = "all" | ContestEntryLifecycle;
export type StructuredFeedComposerMode =
    | "community_pick"
    | "competitive_pick"
    | "staff_pick"
    | "staff_post";
export type StructuredFeedPickComposerMode = Exclude<StructuredFeedComposerMode, "staff_post">;

export type StructuredFeedQuote = {
    revision: number;
    americanOdds: number;
    potentialPoints: number;
    quotedAt: string;
    providerReference?: string | null;
};

export type StructuredFeedSelectionOption = {
    id: string;
    label: string;
    marketLabel?: string;
    description?: string;
    quote: StructuredFeedQuote;
    modes?: readonly StructuredFeedPickComposerMode[];
    disabled?: boolean;
};

export type StructuredFeedContestOption = {
    id: string;
    name: string;
    locksAtLabel?: string;
    acceptsEntries?: boolean;
};

export type StructuredFeedRollingWindow = {
    used: number;
    limit: number;
    windowHours?: number;
    nextSlotAtLabel?: string;
};

export type StructuredFeedAuthor = {
    id: string;
    displayName: string;
    handle?: string;
    /** Raw stored path; the card runs it through `generateProfileImageUrl`. */
    profileImage?: string;
};

export type StructuredFeedRecordKind =
    | "community_pick"
    | "competitive_pick"
    | "staff_pick"
    | "staff_announcement";

export type StructuredFeedRecordSelection = {
    summary: string;
    marketLabel?: string;
    acceptedAmericanOdds: number;
    potentialPoints: number;
    awardedPoints?: number | null;
    /**
     * Graded outcome, which tints the selection line emerald / rose / slate.
     * Optional: a source that only carries `resultLabel` leaves this undefined
     * and the line stays in its neutral pending tone.
     */
    result?: PickResult;
    resultLabel?: string;
};

/**
 * Presentation-ready record consumed by the shared Feed. Callers retain ownership
 * of domain joins, permissions, time formatting, and competitive visibility.
 */
export type StructuredFeedRecord = {
    id: string;
    kind: StructuredFeedRecordKind;
    author: StructuredFeedAuthor;
    createdAtLabel: string;
    /** Announcement headline. Optional — only edits can set one today. */
    title?: string;
    body?: string;
    selection?: StructuredFeedRecordSelection;
    /**
     * The full pick row. When present (and not hidden until lock) the card
     * renders the canonical pick card via `FeedList` instead of the compact
     * `selection` block — the same body Global Social and profiles draw.
     */
    pick?: Pick;
    /**
     * Card treatment for the pick body. Competitive entries keep this metadata
     * even when their payload is redacted until lock.
     */
    presentation?: PickCardPresentation;
    contest?: { id: string; name: string; locksAtLabel?: string; href?: string };
    staffRole?: StructuredFeedStaffRole;
    visibility?: "visible" | "hidden_until_lock";
    /**
     * Canonical contest-entry phase used by the Entries view's filter drawer.
     * Only meaningful on `competitive_pick`. Left undefined when the source row
     * cannot say — such a record stays reachable from "All entries" rather than
     * being assigned a phase it may not be in.
     */
    entryLifecycle?: ContestEntryLifecycle;
    actions?: {
        canReplace?: boolean;
        canDelete?: boolean;
        canEdit?: boolean;
        canPin?: boolean;
        /** Current pin state, so the card can label the toggle Pin vs Unpin. */
        pinned?: boolean;
    };
};

export type StructuredFeedPickSubmission = {
    mode: StructuredFeedPickComposerMode;
    context: StructuredFeedContextMetadata;
    selectionId: string;
    contestId: string | null;
    note: string;
    acceptedQuote: StructuredFeedQuote;
    confirmPriceChange: boolean;
};

export type StructuredFeedStaffPostSubmission = {
    mode: "staff_post";
    context: StructuredFeedContextMetadata;
    body: string;
};

export type StructuredFeedSubmission =
    | StructuredFeedPickSubmission
    | StructuredFeedStaffPostSubmission;

export type StructuredFeedSubmitResponse =
    | { status: "accepted"; message?: string }
    | { status: "price_changed"; quote: StructuredFeedQuote; message?: string }
    | { status: "rejected"; message: string };

export type StructuredFeedProps = {
    context: StructuredFeedContextMetadata;
    currentRole: StructuredFeedRole;
    capabilities: StructuredFeedCapabilities;
    records: readonly StructuredFeedRecord[];
    selectionOptions: readonly StructuredFeedSelectionOption[];
    contestOptions?: readonly StructuredFeedContestOption[];
    communityPickWindow?: StructuredFeedRollingWindow;
    initialFilter?: StructuredFeedFilter;
    /** Supplying this adds the Standings page and renders it in place of the posts. */
    standings?: ReactNode;
    /**
     * An extra icon action shown in the header while the Standings view is
     * active — the League uses it to flip between its two boards. Omitted means
     * no button, and the header's reserved slot simply stays empty.
     */
    standingsAction?: {
        ariaLabel: string;
        onClick: () => void;
        className?: string;
    };
    /**
     * Opens a host-owned announcement workspace instead of this component's own
     * four-tab composer drawer. Supplying it does NOT remove the other post
     * types — the host has to keep a route to them — so the header trigger only
     * changes owner, never scope.
     */
    onCreateAnnouncement?: () => void;
    createAnnouncementOpen?: boolean;
    createAnnouncementTriggerRef?: Ref<HTMLButtonElement>;
    /**
     * The finalized-contest Winners strip, drawn ABOVE the posts rather than in
     * place of them — unlike `standings`, it adds no filter chip, because it is
     * not a view of the feed but a banner over every view of it.
     */
    winners?: ReactNode;
    /** Resolves "view profile" links on pick cards to self vs other. */
    currentUserId?: string;
    /**
     * Reactions on Feed records. Both must be supplied for the buttons to render,
     * and the summary is resolved PER RECORD: returning null means "this kind
     * carries no reaction data", which draws the card without the buttons rather
     * than with a permanently-zero tally. Announcements aren't `picks` rows at
     * all and contest entries arrive without counts, so only Community Picks
     * answer with a summary today.
     */
    onReaction?: (recordId: string, reaction: PickReaction) => void;
    getPickReactionSummary?: (
        recordId: string,
        userId?: string,
    ) => PickReactionSummary | null;
    onSubmit: (
        submission: StructuredFeedSubmission,
    ) => StructuredFeedSubmitResponse | Promise<StructuredFeedSubmitResponse>;
    onReplaceSubmit?: (
        record: StructuredFeedRecord,
        submission: StructuredFeedPickSubmission,
    ) => StructuredFeedSubmitResponse | Promise<StructuredFeedSubmitResponse>;
    /** Optional observer fired when the embedded replacement editor opens. */
    onReplace?: (record: StructuredFeedRecord) => void;
    onDelete?: (record: StructuredFeedRecord) => void;
    onEdit?: (record: StructuredFeedRecord) => void;
    onPin?: (record: StructuredFeedRecord) => void;
    emptyMessage?: string;
    className?: string;
};
