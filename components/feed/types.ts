import type { ReactNode } from "react";
import type { PickCardPresentation } from "@/components/social/PickCardContent";
import type { BuiltPickPayload, Pick, PickReaction, PickReactionSummary } from "@/lib/interfaces/interfaces";

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
 * `standings` is not a record filter — it swaps the feed body for the caller's
 * standings node, and the chip only renders when such a node is supplied.
 */
export type StructuredFeedFilter =
    | "all"
    | "community"
    | "competitive"
    | "staff"
    | "standings";
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
    /** Supplying this adds the Standings chip and renders it in place of the posts. */
    standings?: ReactNode;
    /** Resolves "view profile" links on pick cards to self vs other. */
    currentUserId?: string;
    /**
     * Reactions on Feed records. Both must be supplied for the buttons to render
     * — the Arena/League feed endpoints don't return reaction counts yet, so the
     * cards deliberately draw without them rather than showing empty tallies.
     */
    onReaction?: (recordId: string, reaction: PickReaction) => void;
    getPickReactionSummary?: (recordId: string, userId?: string) => PickReactionSummary;
    onSubmit: (
        submission: StructuredFeedSubmission,
    ) => StructuredFeedSubmitResponse | Promise<StructuredFeedSubmitResponse>;
    /**
     * Community Picks come from the full Pick Builder in the New-post drawer, so
     * they arrive as built payloads rather than a dropdown selection id.
     */
    onSubmitBuiltPicks: (
        picks: BuiltPickPayload[],
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
