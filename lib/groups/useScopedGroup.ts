"use client";

import { useSelector } from "react-redux";
import type { Group, GroupSelector } from "@/lib/interfaces/interfaces";

export type ScopedGroup =
    | { status: "loading"; group: null; groupId: string }
    | { status: "missing"; group: null; groupId: string }
    | { status: "ready"; group: Group; groupId: string };

/**
 * The only sanctioned way to read `state.group.group`.
 *
 * That slot is single-tenant and shared by every group screen — Leagues AND Arenas,
 * since there is no separate arena record slot. `fetchGroupByIdRequest` does null it
 * when a different id is requested (groupsSlice), but it is dispatched from an
 * EFFECT, and React flushes child effects before parent effects. So the first commit
 * after a navigation still holds the PREVIOUS group, with `loading` already false
 * because that group's fetch settled long ago. Children mounted in that commit fire
 * their own requests with the previous group's id — which is how five Arena reads
 * went out carrying a League id.
 *
 * This check runs during RENDER, so it holds on that very first commit. A record
 * belonging to any other id is never returned, whatever the loading flag says:
 * a mistake yields NO data rather than another group's data.
 */
export function useScopedGroup(requestedId: string | undefined): ScopedGroup {
    const { group, loading, error } = useSelector((state: GroupSelector) => state.group);
    const id = requestedId ?? "";

    if (id && group && group.id === id) {
        return { status: "ready", group, groupId: id };
    }
    // Only a settled, errored, empty slot counts as "missing". A mismatched record
    // and a not-yet-fetched slot both read as "loading" — fail closed, so a foreign
    // row can never be mistaken for this screen's own.
    if (id && !group && !loading && error) {
        return { status: "missing", group: null, groupId: id };
    }
    return { status: "loading", group: null, groupId: id };
}

export default useScopedGroup;
