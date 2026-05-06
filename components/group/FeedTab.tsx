"use client";

import { useEffect, useMemo, useState } from "react";
import type { Feed, FeedSelector } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllActivitiesRequest } from "@/lib/redux/slices/activitySlice";
import ActivitiesSkeleton from "../skeletons/leagues/ActivitiesSkeleton";

type Props = {
  groupId?: string;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const FeedTab = ({ groupId }: Props) => {
  const dispatch = useDispatch();

  const { feed, loading } = useSelector((state: FeedSelector) => state.feed);
  const [activities, setActivities] = useState<Feed[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!groupId) return;

    dispatch(fetchAllActivitiesRequest({
      group_id: groupId,
      start: (page - 1) * limit,
      limit: limit
    }));
  }, [dispatch, groupId, page, limit]);

  useEffect(() => {
    if (feed) {
      setActivities(feed.activities || []);
      setTotal(feed.pagination.count || 0);
    }
  }, [feed]);

  const sorted = useMemo(
    () =>
      [...activities].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [activities]
  );

  const totalPages = Math.ceil(total / limit);

  if (loading && !activities.length) {
    return <ActivitiesSkeleton />
  }

  return (
    <section className="space-y-5 pb-10">

      {/* 🔽 Limit Selection */}
      <div className="flex justify-end">
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
          className="rounded-xl bg-white/10 px-3 py-1 text-sm border border-white/20 text-gray-200"
        >
          {[10, 20, 30, 50].map((n) => (
            <option key={n} className="bg-black" value={n}>
              Show {n}
            </option>
          ))}
        </select>
      </div>

      {sorted.length === 0 && !loading ? (
        <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-sm text-gray-400">
          No activity yet — picks will appear here as soon as they’re made.
        </div>
      ) : (sorted.map((event) => {
        return (
          <div
            key={event.id}
            className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-black/60 p-5 shadow-inner"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
              <span>{event.profiles?.username ?? "Unknown"}</span>
              <time dateTime={event.created_at}>
                {formatTime(event.created_at)}
              </time>
            </div>

            <p className="text-sm text-gray-200">{event.action}</p>
          </div>
        );
      }))}

      <div className="flex justify-center items-center gap-3 pt-6">

        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded-xl px-3 py-2 bg-white/10 text-gray-200 border border-white/20 disabled:opacity-40"
        >
          Prev
        </button>

        <span className="text-gray-300 text-sm">
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-xl px-3 py-2 bg-white/10 text-gray-200 border border-white/20 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  );
};

export default FeedTab;
