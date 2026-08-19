"use client";

import dynamic from "next/dynamic";
import type { ComponentType, RefObject } from "react";
import { LeftWorkspaceDrawer } from "@/components/ui/LeftWorkspaceDrawer";
import type {
    GroupFeedPostCreatorProps,
    GroupFeedPostCreatorTab,
} from "./GroupFeedPostCreator";
import type { StructuredFeedCapabilities } from "./types";

// The creator pulls in the whole Pick Builder, so it is only loaded once the
// drawer is actually opened.
const DrawerGroupFeedPostCreator = dynamic<GroupFeedPostCreatorProps>(
    () =>
        import("./GroupFeedPostCreator").then(
            ({ GroupFeedPostCreator }) =>
                GroupFeedPostCreator as ComponentType<GroupFeedPostCreatorProps>
        ),
    {
        ssr: false,
        loading: () => (
            <div
                className="flex min-h-48 items-center justify-center text-sm text-gray-500"
                role="status"
            >
                Loading post builder…
            </div>
        ),
    }
);

export type GroupFeedPostDrawerProps = GroupFeedPostCreatorProps & {
    open: boolean;
    onClose: () => void;
    returnFocusRef?: RefObject<HTMLElement | null>;
};

// MVP counterpart: components/feed/GroupFeedAnnouncementDrawer.tsx, which is
// titled "New Announcement" because it can only ever hold an announcement. This
// drawer still hosts the Pick Post / Staff Pick / Contest Entry tabs, so the
// title follows the panel that will actually open: the MVP wording when the
// viewer is opening the announcement panel (either because a caller asked for it
// or because it is the only thing they may post), "New Post" otherwise. Getting
// this wrong labels a Pick Builder as an announcement.
const isAnnouncementOnlyDrawer = (
    capabilities: StructuredFeedCapabilities,
    initialTab?: GroupFeedPostCreatorTab,
) => {
    if (initialTab === "announcement") return true;
    return (
        capabilities.canCreateStaffPost &&
        !capabilities.canCreateCommunityPick &&
        !capabilities.canCreateStaffPick &&
        !capabilities.canCreateCompetitivePick
    );
};

export const GroupFeedPostDrawer = ({
    open,
    onClose,
    returnFocusRef,
    ...creatorProps
}: GroupFeedPostDrawerProps) => {
    const announcementOnly = isAnnouncementOnlyDrawer(
        creatorProps.capabilities,
        creatorProps.initialTab,
    );

    return (
        <LeftWorkspaceDrawer
            open={open}
            onClose={onClose}
            title={announcementOnly ? "New Announcement" : "New Post"}
            returnFocusRef={returnFocusRef}
            backdropLabel={
                announcementOnly
                    ? "Dismiss new announcement workspace"
                    : "Dismiss new community post workspace"
            }
            // The MVP pairs this with an explicit "league-theme" fallback, but that
            // class has no rule in this app's globals.css — League brand tokens are
            // the :root defaults here — so the League branch stays undefined.
            className={creatorProps.context.kind === "arena" ? "arena-theme" : undefined}
        >
            <DrawerGroupFeedPostCreator {...creatorProps} />
        </LeftWorkspaceDrawer>
    );
};

export default GroupFeedPostDrawer;
