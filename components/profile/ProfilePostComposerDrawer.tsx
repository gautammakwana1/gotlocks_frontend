"use client";

import dynamic from "next/dynamic";
import type { ComponentType, RefObject } from "react";
import { LeftWorkspaceDrawer } from "@/components/ui/LeftWorkspaceDrawer";

type DrawerPickBuilderProps = {
    compact?: boolean;
    surface?: "drawer";
    onPostComplete?: () => void;
};

// Loaded on demand: the builder pulls in every sport module, and the profile must
// not pay for that until the composer is actually opened. ssr:false because the
// builder reads browser-only state during mount.
const DrawerPickBuilder = dynamic<DrawerPickBuilderProps>(
    () =>
        import("@/components/pick-builder/PickBuilderClient").then(
            (mod) => mod.default as ComponentType<DrawerPickBuilderProps>
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

type ProfilePostComposerDrawerProps = {
    open: boolean;
    onClose: () => void;
    returnFocusRef?: RefObject<HTMLElement | null>;
};

export const ProfilePostComposerDrawer = ({
    open,
    onClose,
    returnFocusRef,
}: ProfilePostComposerDrawerProps) => {
    return (
        <LeftWorkspaceDrawer
            open={open}
            onClose={onClose}
            title="New post"
            returnFocusRef={returnFocusRef}
            backdropLabel="Dismiss new post workspace"
        >
            <DrawerPickBuilder compact surface="drawer" onPostComplete={onClose} />
        </LeftWorkspaceDrawer>
    );
};

export default ProfilePostComposerDrawer;
