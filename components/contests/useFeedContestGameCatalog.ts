"use client";

import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/lib/interfaces/interfaces";
import {
    clearFeedContestSchedules,
    fetchFeedContestSchedulesRequest,
} from "@/lib/redux/slices/feedContestScheduleSlice";
import {
    feedContestScheduleRequestKey,
    toContestGameOption,
    type ContestGameOption,
    type FeedContestSport,
} from "@/lib/contests/feedContestCatalog";

/**
 * The slate picker's data source: `/leagues/<sport>/schedules-for-all-tz` for
 * exactly the sports the organizer chose, over exactly the days the slate
 * covers. One call per league for the whole range — the wizard no longer pulls
 * all six priced feeds on every visit.
 *
 * The unpriced feed is the right one here: the wizard needs kickoff times and
 * team names, not markets. Nothing downstream reads odds either — `has_odds` is
 * deliberately omitted from the create payload so the server keeps its own
 * default rather than being told "no odds".
 */
export type FeedContestGameCatalog = {
    /** Upcoming, non-live matchups for the requested sports and dates. */
    options: ContestGameOption[];
    loading: boolean;
    error: string | null;
};

export const useFeedContestGameCatalog = (
    sports: readonly FeedContestSport[],
    /** `YYYY-MM-DD`, a comma list, or `YYYY-MM-DD-YYYY-MM-DD`. Empty = fetch nothing. */
    dateSpec: string
): FeedContestGameCatalog => {
    const dispatch = useDispatch();
    // Sports arrive as a fresh array on every render; the key keeps the effect
    // and the memo keyed on the contents instead of the identity.
    const requestKey = feedContestScheduleRequestKey(sports, dateSpec);
    const shouldFetch = Boolean(dateSpec) && sports.length > 0;

    const storedKey = useSelector((state: RootState) => state.feedContestSchedule.requestKey);
    const groups = useSelector((state: RootState) => state.feedContestSchedule.groups);
    const loading = useSelector((state: RootState) => state.feedContestSchedule.loading);
    const error = useSelector((state: RootState) => state.feedContestSchedule.error);

    useEffect(() => {
        if (!shouldFetch) {
            dispatch(clearFeedContestSchedules());
            return;
        }
        const [sportsPart, datePart] = requestKey.split("|");
        dispatch(
            fetchFeedContestSchedulesRequest({
                sports: sportsPart.split(",").filter(Boolean),
                date: datePart,
            })
        );
    }, [dispatch, requestKey, shouldFetch]);

    // Stored groups may still describe the previous slate while the next call is
    // in flight; reading them then would label an abandoned range's matchups as
    // this one's.
    const describesRequest = shouldFetch && storedKey === requestKey;

    const options = useMemo(() => {
        if (!describesRequest) return [] as ContestGameOption[];

        const now = Date.now();
        const byId = new Map<string, ContestGameOption>();

        groups.forEach((group) => {
            group.events?.forEach((event) => {
                // A live matchup is no longer a pregame event, which is what the
                // create endpoint requires of every included game. The server
                // only drops started games from TODAY's bucket, so the kickoff
                // guard still has to run here.
                if (event?.live || !event?.id || !event?.teams?.home || !event?.teams?.away) {
                    return;
                }
                if (!(Date.parse(event.date) > now)) return;
                if (byId.has(event.id)) return;
                byId.set(
                    event.id,
                    toContestGameOption(event, group.sport as FeedContestSport, group.competition)
                );
            });
        });

        return [...byId.values()].sort(
            (left, right) =>
                Date.parse(left.gameStartsAt) - Date.parse(right.gameStartsAt) ||
                left.sport.localeCompare(right.sport) ||
                left.id.localeCompare(right.id)
        );
    }, [describesRequest, groups]);

    return {
        options,
        // Anything not yet describing this request reads as loading, so the UI
        // never flashes "no matchups" between the dispatch and the answer.
        loading: shouldFetch && (loading || !describesRequest) && !error,
        error,
    };
};

export default useFeedContestGameCatalog;
