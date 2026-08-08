"use client";

import dynamic from "next/dynamic";
import type { ComponentType, RefObject } from "react";
import { LeftWorkspaceDrawer } from "@/components/ui/LeftWorkspaceDrawer";
import type { GroupFeedPostCreatorProps } from "./GroupFeedPostCreator";

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

export const GroupFeedPostDrawer = ({
    open,
    onClose,
    returnFocusRef,
    ...creatorProps
}: GroupFeedPostDrawerProps) => (
    <LeftWorkspaceDrawer
        open={open}
        onClose={onClose}
        title="New Post"
        returnFocusRef={returnFocusRef}
        backdropLabel="Dismiss new community post workspace"
        className={creatorProps.context.kind === "arena" ? "arena-theme" : undefined}
    >
        <DrawerGroupFeedPostCreator {...creatorProps} />
    </LeftWorkspaceDrawer>
);

export default GroupFeedPostDrawer;
