import type { GroupObject } from "@/lib/interfaces/interfaces";

/**
 * Appends a page of communities, dropping ids the list already holds.
 *
 * The hub list endpoints order by `joined_at DESC` and page with OFFSET, so a
 * concurrent join shifts every later row down one and page N+1 can repeat the
 * last row of page N. A duplicate React key re-mounts the card, which is visible
 * as a flicker; deduping on merge is cheaper than keying on index.
 */
export const mergeGroupPage = (
    existing: GroupObject[] | null,
    incoming: GroupObject[]
): GroupObject[] => {
    const seen = new Set((existing ?? []).map((group) => group.id));
    return [...(existing ?? []), ...incoming.filter((group) => !seen.has(group.id))];
};
