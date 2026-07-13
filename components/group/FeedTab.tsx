"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { Feed, FeedSelector } from "@/lib/interfaces/interfaces";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllActivitiesRequest } from "@/lib/redux/slices/activitySlice";
import { generateProfileImageUrl } from "@/lib/utils/helpers";
import { UserIcon } from "@/components/layout/MainTabBar";
import ActivitiesSkeleton from "../skeletons/leagues/ActivitiesSkeleton";

type Props = {
  groupId?: string;
};

const formatRelativeTime = (iso: string) => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const formatFullTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const FeedAvatar = ({ name, image }: { name: string; image?: string | null }) => {
  const src = image ? generateProfileImageUrl(image) : null;
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.05] text-[10px] font-semibold uppercase text-gray-200 ring-1 ring-inset ring-white/10"
      aria-hidden
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={32}
          height={32}
          className="h-full w-full object-cover"
          draggable={false}
          unoptimized
        />
      ) : (
        <UserIcon className="h-4 w-4 text-white/70" />
      )}
    </span>
  );
};

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

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading && !activities.length) {
    return <ActivitiesSkeleton />;
  }

  return (
    <section className="space-y-3 pb-6">
      {/* Header row: label + count and limit selector */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-baseline gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
          Activity
          {total > 0 && (
            <span className="text-[11px] font-medium tracking-normal text-gray-500">
              {total}
            </span>
          )}
        </h2>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-gray-200 outline-none transition focus:border-sky-400/60"
        >
          {[10, 20, 30, 50].map((n) => (
            <option key={n} className="bg-black" value={n}>
              Show {n}
            </option>
          ))}
        </select>
      </div>

      {sorted.length === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-8 text-center text-sm text-gray-400">
          <p className="font-medium text-gray-300">No activity yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Picks and updates will appear here as soon as they’re made.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {sorted.map((event) => {
            const name =
              event.profiles?.full_name?.trim() ||
              event.profiles?.username ||
              "Unknown member";
            return (
              <li
                key={event.id}
                className="flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-white/[0.03] sm:px-4"
              >
                <FeedAvatar name={name} image={event.profiles?.profile_image} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-white">
                      {name}
                    </span>
                    <time
                      suppressHydrationWarning
                      dateTime={event.created_at}
                      title={formatFullTime(event.created_at)}
                      className="shrink-0 text-[11px] tabular-nums text-gray-500"
                    >
                      {formatRelativeTime(event.created_at)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-snug text-gray-300">
                    {event.action}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>

          <span className="text-xs tabular-nums text-gray-400">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-gray-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
};

export default FeedTab;
