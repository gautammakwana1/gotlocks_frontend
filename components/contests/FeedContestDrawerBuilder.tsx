"use client";

import dynamic from "next/dynamic";
import type { FeedContestCreateFormProps } from "./FeedContestCreateForm";

/* ----------------------------------------------------------------------------
 * The Feed contest wizard, mounted INSIDE the "Start a contest" sidebar —
 * the MVP's `DrawerStructuredContestCreateForm` (ContestCreationDrawer.tsx:41).
 *
 * WHY IT IS ITS OWN FILE, rather than a dynamic() inside ContestCreationDrawer:
 * that drawer is deliberately generic here. The MVP's version knows about every
 * builder it can host and switches on a `kind` union; ours takes `children`, so
 * it has no reason to import a 125KB wizard it may never render. Keeping the
 * import in this leaf means the drawer stays cheap for the Fantasy choice too.
 *
 * WHY DYNAMIC AT ALL: the wizard is the single largest component in the contests
 * tree — the schedule catalog, the slate browser, the calendar and three
 * template branches — and the Arena dashboard and League page both mount this
 * drawer on pages a member reaches constantly without ever opening it. The MVP
 * lazy-loads it for the same reason. `ssr: false` because the wizard reads the
 * browser's time zone and `useSearchParams` on its first commit.
 *
 * The `surface` prop is fixed here rather than left to the caller: a host that
 * forgot it would get a wizard writing `?step=` into the page URL underneath the
 * drawer, which is the one thing this surface exists to avoid.
 * -------------------------------------------------------------------------- */

const LazyFeedContestCreateForm = dynamic(
    () => import("./FeedContestCreateForm").then((module) => module.FeedContestCreateForm),
    {
        ssr: false,
        loading: () => (
            <div
                role="status"
                aria-label="Loading the contest builder"
                className="space-y-4"
            >
                <div className="h-4 w-40 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-8 w-3/4 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-56 w-full animate-pulse rounded-2xl bg-white/[0.04]" />
            </div>
        ),
    }
);

export type FeedContestDrawerBuilderProps = Omit<FeedContestCreateFormProps, "surface">;

export const FeedContestDrawerBuilder = (props: FeedContestDrawerBuilderProps) => (
    <LazyFeedContestCreateForm {...props} surface="drawer" />
);

export default FeedContestDrawerBuilder;
