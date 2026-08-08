"use client";

import { Pick, PickReaction, Picks } from "@/lib/interfaces/interfaces";
import PostCard from "./PostCard";
import { PostCardSkeleton } from "../skeletons/profile/ProfileSkeleton";

type PostFeedProps = {
    picks: Picks;
    totalCount: number;
    displayName: string;
    mode: "self" | "public";
    variant?: "card" | "embedded";
    canDeletePick: (pick: Pick) => boolean;
    onDeletePick: (pickId: string) => void;
    onReaction: (reaction: PickReaction, pickId: string) => void;
    lastItemRef?: (node: HTMLDivElement | null) => void;
    loading?: boolean;
    highlightPickId?: string | null;
};

const PostFeed = ({
    picks,
    totalCount,
    displayName,
    mode,
    variant = "card",
    canDeletePick,
    onDeletePick,
    onReaction,
    lastItemRef,
    loading,
    highlightPickId,
}: PostFeedProps) => {
    const countLabel =
        totalCount === picks.length
            ? `${picks.length} total`
            : `${picks.length} of ${totalCount}`;
    const description =
        mode === "self"
            ? "Your latest straight picks and combo posts."
            : `Latest straight picks and combo posts from ${displayName}.`;
    const emptyMessage =
        mode === "self"
            ? "No posts yet. Share a pick from the builder to show it here."
            : "No posts yet. Check back once they share new picks.";
    const showFooterCount = variant === "embedded";
    const showHeader = variant === "card";

    const wrapperClass = `space-y-4 ${variant === "card"
        ? "rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-soft)]"
        : ""
        }`;
    // Embedded in the profile page the rows bleed to the card edge to line up
    // with ProfileHeader's -mx-5 sm:-mx-6; the standalone card stays inset.
    const feedRowsClass =
        variant === "embedded"
            ? "-mx-5 divide-y divide-white/10 overflow-visible border-b border-white/10 sm:-mx-6"
            : "-mx-5 divide-y divide-white/10 overflow-visible border-y border-white/10 sm:mx-0";

    return (
        <section className={wrapperClass}>
            {showHeader ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            recent posts
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
                    </div>
                    <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                        {countLabel}
                    </span>
                </div>
            ) : null}

            <div className={feedRowsClass}>
                {picks.map((pick, index) => (
                    <div
                        key={pick.id}
                        ref={index === picks.length - 1 ? lastItemRef : undefined}
                    >
                        <PostCard
                            pick={pick}
                            displayName={displayName}
                            mode={mode}
                            canDelete={canDeletePick(pick)}
                            onDelete={onDeletePick}
                            onReaction={onReaction}
                            highlightPickId={highlightPickId}
                            className={index % 2 === 1 ? "bg-white/[0.025]" : undefined}
                        />
                    </div>
                ))}

                {!loading && picks.length === 0 && (
                    <div className="px-5 py-4 sm:px-6">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
                            {emptyMessage}
                        </div>
                    </div>
                )}
                {loading && (
                    <div className="divide-y divide-white/10">
                        {[1, 2].map((i) => (
                            <PostCardSkeleton key={i} />
                        ))}
                    </div>
                )}
            </div>
            {showFooterCount ? (
                <div className="flex justify-end text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    {countLabel}
                </div>
            ) : null}
        </section>
    );
};

export default PostFeed;
