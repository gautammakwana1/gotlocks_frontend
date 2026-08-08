import type { ArenaHostingTier } from "@/lib/domain/community";

export type ArenaActionResult =
    | { success: true; data?: unknown }
    | { success: false; error: string };

export type ArenaShellActions = {
    unlockArena: (payload: {
        arenaId: string;
        actorId: string;
    }) => ArenaActionResult;
    activateArenaHosting: (payload: {
        arenaId: string;
        actorId: string;
        tier: ArenaHostingTier;
    }) => ArenaActionResult;
    scheduleArenaPause: (payload: {
        arenaId: string;
        actorId: string;
    }) => ArenaActionResult;
    cancelArenaPause: (payload: {
        arenaId: string;
        actorId: string;
    }) => ArenaActionResult;
    advanceArenaHostingPeriod: (payload: {
        arenaId: string;
        actorId: string;
    }) => ArenaActionResult;
    updateArena: (payload: {
        arenaId: string;
        actorId: string;
        name: string;
        description: string;
        timeZone: string;
        externalCommunityUrl: string | null;
    }) => ArenaActionResult;
    promoteArenaManager: (payload: {
        arenaId: string;
        actorId: string;
        memberId: string;
    }) => ArenaActionResult;
    demoteArenaManager: (payload: {
        arenaId: string;
        actorId: string;
        memberId: string;
    }) => ArenaActionResult;
    removeArenaMember: (payload: {
        arenaId: string;
        actorId: string;
        memberId: string;
    }) => ArenaActionResult;
    leaveArena: (payload: {
        arenaId: string;
        actorId: string;
    }) => ArenaActionResult;
    transferArenaOwnership: (payload: {
        arenaId: string;
        actorId: string;
        newOwnerUserId: string;
    }) => ArenaActionResult;
    respondToArenaOwnershipTransfer: (payload: {
        transferId: string;
        actorId: string;
        accept: boolean;
    }) => ArenaActionResult;
    deleteArena: (payload: {
        arenaId: string;
        actorId: string;
        confirmationName: string;
    }) => ArenaActionResult;
};
