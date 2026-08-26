"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import BackButton from "@/components/ui/BackButton";
import FeedContestCreateForm from "./FeedContestCreateForm";
import FeedContestEditForm from "./FeedContestEditForm";
import type { FeedGroupType, RootState } from "@/lib/interfaces/interfaces";
import { fetchGroupByIdRequest } from "@/lib/redux/slices/groupsSlice";
import useScopedGroup from "@/lib/groups/useScopedGroup";
import {
    clearFeedContestDetail,
    fetchFeedContestDetailRequest,
} from "@/lib/redux/slices/feedContestSlice";

/* ----------------------------------------------------------------------------
 * Which edit screen a Feed contest gets, decided by its lifecycle.
 *
 * The two are genuinely different edits, not two skins of one:
 *
 *   DRAFT  — nothing has been promised to anybody, so the whole wizard reopens
 *            prefilled and every step is editable. Saving REPLACES the row
 *            (PUT /replace-draft/:contest_id), keeping only its id.
 *   PUBLISHED — mechanics, slate and timing are frozen; an entrant who accepted
 *            a slate must never find it swapped underneath them. Only the
 *            member-facing copy can change (PUT /update/:contest_id).
 *
 * The branch cannot be made by the route, because the status is only known once
 * `GET /detail/:contest_id` lands — which is why this component owns the read
 * and neither form is mounted until it has.
 * -------------------------------------------------------------------------- */

export type FeedContestEditRouterProps = {
    contestId: string;
    /** The contest detail route, used for Back and for the post-save landing. */
    detailHref: string;
};

const EditSkeleton = ({ detailHref }: { detailHref: string }) => (
    <div className="flex flex-col gap-6 pb-10">
        <BackButton fallback={detailHref} preferFallback />
        <div className="space-y-2 border-b border-white/10 pb-5">
            <div className="h-3 w-40 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-8 w-2/3 animate-pulse rounded bg-white/[0.06]" />
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-white/[0.03]" />
    </div>
);

export const FeedContestEditRouter = ({
    contestId,
    detailHref,
}: FeedContestEditRouterProps) => {
    const dispatch = useDispatch();
    const { detail, detailError } = useSelector((state: RootState) => state.feedContest);

    useEffect(() => {
        if (!contestId) return;
        dispatch(fetchFeedContestDetailRequest({ contest_id: contestId }));
    }, [contestId, dispatch]);

    /*
     * The GROUP read, for one field the contest detail does not carry: the
     * Arena's reward contact email, which the Reward step's virtual-delivery
     * block needs. Fired only once the detail has named its group — this screen
     * is reached by contest id and has no group id of its own — and read back
     * through `useScopedGroup`, because `state.group.group` is a single-tenant
     * slot shared by every group screen.
     */
    const groupId = detail?.contest?.id === contestId ? detail.group.id : undefined;
    useEffect(() => {
        if (!groupId) return;
        dispatch(fetchGroupByIdRequest({ groupId }));
    }, [dispatch, groupId]);
    const scopedGroup = useScopedGroup(groupId);

    useEffect(
        () => () => {
            dispatch(clearFeedContestDetail());
        },
        [dispatch]
    );

    // Render-time scoping, and it matters more here than anywhere else: the
    // wizard's seeds are lazy `useState` initialisers, so ONE commit holding the
    // previously-viewed contest would permanently seed the wrong draft.
    const scoped = detail?.contest?.id === contestId ? detail : null;

    if (!scoped) {
        if (detailError) {
            return (
                <div className="space-y-5 pb-10">
                    <BackButton fallback={detailHref} preferFallback />
                    <section className="rounded-xl border border-dashed border-white/15 bg-black/30 p-6">
                        <h1 className="font-semibold text-white">Contest unavailable</h1>
                        <p className="mt-2 text-sm leading-6 text-gray-500">{detailError}</p>
                    </section>
                </div>
            );
        }
        return <EditSkeleton detailHref={detailHref} />;
    }

    const contest = scoped.contest;
    const editableDraft =
        contest.lifecycle_status === "draft" &&
        scoped.viewer?.is_organizer &&
        ["multi_pick", "sunday_pickem", "td_psychic"].includes(contest.template) &&
        !contest.canceled_at &&
        !contest.archived_at;

    if (editableDraft) {
        return (
            <FeedContestCreateForm
                groupId={scoped.group.id}
                groupType={
                    (scoped.group.group_type === "arena" ? "arena" : "league") as FeedGroupType
                }
                contextName={
                    scoped.group.name?.trim() ||
                    (scoped.group.group_type === "arena" ? "Arena" : "League")
                }
                backHref={detailHref}
                detailHref={() => detailHref}
                initialContest={contest}
                // The draft's saved reward. The draft endpoints REPLACE the row,
                // so a reopened draft that does not carry this back has deleted
                // the prizes it was holding.
                initialReward={scoped.reward ?? null}
                rewardContactEmail={scopedGroup.group?.reward_contact_email}
                isArenaOwner={scoped.viewer?.role === "commissioner"}
            />
        );
    }

    /* Published, canceled, archived, or a template this wizard does not build:
     * the copy-only form is the only edit left, and it re-reads the detail itself.
     *
     * `accent` is NOT optional in practice. The form defaults it to "league",
     * so an Arena contest opened here rendered the whole screen in slate/blue —
     * the League card gradient, the sky focus rings, the sky Save button — and
     * never emitted the `arena-theme` class its violet tokens hang off. Same
     * expression the draft branch above already uses. */
    return (
        <FeedContestEditForm
            contestId={contestId}
            detailHref={`${detailHref}?tab=entries`}
            accent={scoped.group.group_type === "arena" ? "arena" : "league"}
        />
    );
};

export default FeedContestEditRouter;
