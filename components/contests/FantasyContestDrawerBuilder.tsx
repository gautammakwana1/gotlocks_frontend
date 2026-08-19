"use client";

import dynamic from "next/dynamic";
import type { LeagueFantasyContestCreateFormProps } from "./LeagueFantasyContestCreateForm";

/* ----------------------------------------------------------------------------
 * The Fantasy contest form, mounted INSIDE the "Start a contest" sidebar — the
 * MVP's `DrawerLeagueFantasyContestCreateContent` (ContestCreationDrawer.tsx:21).
 *
 * Same shape and same reasoning as FeedContestDrawerBuilder: the drawer itself
 * stays generic and takes `children`, so the import of a whole create form lives
 * out here in a leaf that only the League host pulls in. Lazy because the League
 * page mounts this drawer on every visit and most visits never open it, and
 * `ssr: false` because the form reads the browser's clock on its first commit.
 *
 * `surface` is fixed here rather than left to the caller, for the same reason it
 * is on the Feed builder: a host that forgot it would get a Back chevron inside
 * a drawer that already has one in its header.
 * -------------------------------------------------------------------------- */

const LazyLeagueFantasyContestCreateForm = dynamic(
    () =>
        import("./LeagueFantasyContestCreateForm").then(
            (module) => module.LeagueFantasyContestCreateForm
        ),
    {
        ssr: false,
        loading: () => (
            <div role="status" aria-label="Loading the contest form" className="space-y-4">
                <div className="h-4 w-40 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-8 w-3/4 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-56 w-full animate-pulse rounded-2xl bg-white/[0.04]" />
            </div>
        ),
    }
);

export type FantasyContestDrawerBuilderProps = Omit<
    LeagueFantasyContestCreateFormProps,
    "surface"
>;

export const FantasyContestDrawerBuilder = (props: FantasyContestDrawerBuilderProps) => (
    <LazyLeagueFantasyContestCreateForm {...props} surface="drawer" />
);

export default FantasyContestDrawerBuilder;
