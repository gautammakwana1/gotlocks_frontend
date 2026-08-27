"use client";

import { useEffect, useId } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/lib/redux/store";
import type { ArenaMemberContact } from "@/lib/arenas/memberContacts";
import type { PaginationMetadata } from "@/lib/interfaces/interfaces";
import {
    exportArenaMemberContactsRequest,
    fetchArenaMemberContactsRequest,
    retryArenaMemberContacts,
} from "@/lib/redux/slices/arenaSlice";

/* ============================================================================
 * MEMBER CONTACTS — the Members tab's staff-only contact list and CSV export.
 *
 * Ported from the MVP's components/arenas/ArenaMemberContactsPanel.tsx with the
 * markup kept verbatim. The differences are all consequences of the data being
 * remote rather than in a synchronous mock store:
 *
 *  - the list comes from GET /group/arena/member-contacts/list, which PAGES, so
 *    the count pill reads `pagination.total` (the whole Arena) rather than the
 *    number of rows currently loaded, and a "Show more" row follows the list.
 *  - the CSV comes from a SEPARATE call made only on a real click. That route is
 *    throttled to five a minute and writes an audit line each time, so the panel
 *    must never paint itself through it.
 *  - loading and error branches exist at all, which the MVP has no need of.
 *
 * The FETCH is gated on staff, not just the render: a plain member's browser
 * must never receive the addresses, so a non-staff viewer dispatches nothing and
 * the component returns null, exactly as the MVP's early return did.
 * ========================================================================== */

/** Owner or manager. Mirrors the server gate in resolveArenaForStaff. */
const isArenaStaffRole = (role: string | undefined) =>
    role === "commissioner" || role === "manager";

/* The list endpoint answers the RAW seat, so the panel labels it the same way
 * the roster directly above it does. `owner` is the CSV's word, not this one's. */
const contactRoleLabel = (role: string) =>
    role === "commissioner" ? "Owner" : role === "manager" ? "Manager" : "Member";

const PAGE_SIZE = 50;

type ArenaMemberContactsPanelProps = {
    arenaId: string;
    /** Viewer's role on THIS Arena — commissioner | manager | member. */
    viewerRole: string;
};

export const ArenaMemberContactsPanel = ({
    arenaId,
    viewerRole,
}: ArenaMemberContactsPanelProps) => {
    const titleId = useId();
    const dispatch = useDispatch();

    const contacts = useSelector(
        (state: RootState) => state.arena.memberContacts
    ) as ArenaMemberContact[];
    const pagination = useSelector(
        (state: RootState) => state.arena.memberContactsPagination
    ) as PaginationMetadata | undefined;
    const contactsForId = useSelector(
        (state: RootState) => state.arena.memberContactsForId
    ) as string | null;
    const loading = useSelector(
        (state: RootState) => state.arena.memberContactsLoading
    ) as boolean;
    const error = useSelector(
        (state: RootState) => state.arena.memberContactsError
    ) as string | null;
    const exporting = useSelector(
        (state: RootState) => state.arena.memberContactsExporting
    ) as boolean;
    const exportError = useSelector(
        (state: RootState) => state.arena.memberContactsExportError
    ) as string | null;

    const isStaff = isArenaStaffRole(viewerRole);
    // The slice is shared across Arenas, so rows stamped for another one are not
    // this Arena's rows — see the `...ForId` note on the slice.
    const isCurrent = contactsForId === arenaId;

    /* Page 1 only, once per Arena. The stamp is set in the REQUEST reducer, so
     * this cannot loop on failure and re-entering the tab costs nothing. */
    useEffect(() => {
        if (!isStaff || !arenaId || isCurrent) return;
        dispatch(
            fetchArenaMemberContactsRequest({
                arena_id: arenaId,
                page: 1,
                limit: PAGE_SIZE,
            })
        );
    }, [dispatch, arenaId, isStaff, isCurrent]);

    if (!isStaff) return null;

    const visibleContacts = isCurrent ? contacts : [];
    const loadedPage = pagination?.page ?? 1;
    const totalPages = pagination?.total_pages ?? 0;
    // The whole Arena, not the rows paged in so far — the MVP's pill counts
    // every contact, and a number that grows as you scroll would read as a bug.
    const total = isCurrent ? pagination?.total ?? visibleContacts.length : 0;
    const hasMore = isCurrent && loadedPage < totalPages;

    const countLabel = error
        ? "unavailable"
        : loading && visibleContacts.length === 0
            ? "loading..."
            : `${total} ${total === 1 ? "contact" : "contacts"}`;

    return (
        <section
            aria-labelledby={titleId}
            data-arena-member-contacts
            className="overflow-hidden rounded-xl border border-violet-300/20 bg-violet-500/[0.055]"
        >
            <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                    <h2
                        id={titleId}
                        className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-100"
                    >
                        Member contacts
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                        Account emails for active members of this Arena. Use them only for Arena
                        updates and reward fulfillment.
                    </p>
                </div>
                <button
                    type="button"
                    // Disabled on an empty Arena exactly as the MVP is, and while a
                    // download is already in flight — each click costs one of the
                    // five exports the server allows per minute.
                    disabled={total === 0 || exporting}
                    onClick={() =>
                        dispatch(exportArenaMemberContactsRequest({ arena_id: arenaId }))
                    }
                    className="min-h-9 shrink-0 rounded-lg border border-violet-300/30 bg-violet-500/10 px-3 text-[10px] font-semibold uppercase tracking-wide text-violet-100 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {exporting ? "Exporting..." : "Export contacts CSV"}
                </button>
            </div>

            {/* Neither branch exists in the MVP, which cannot fail: its contacts
                are already in memory. A silent empty list here would read as
                "nobody has an email on file", so a failure says so instead. */}
            {error ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
                    <p className="min-w-0 text-xs leading-5 text-red-200">{error}</p>
                    <button
                        type="button"
                        onClick={() => dispatch(retryArenaMemberContacts())}
                        className="shrink-0 rounded-lg border border-violet-300/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-100 transition hover:bg-violet-500/20"
                    >
                        Try again
                    </button>
                </div>
            ) : null}

            {exportError ? (
                <p className="border-t border-white/10 px-4 py-3 text-xs leading-5 text-red-200">
                    {exportError}
                </p>
            ) : null}

            <details className="group border-t border-white/10">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-xs font-semibold text-gray-300 marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-300">
                    <span>View contact list</span>
                    <span className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            {countLabel}
                        </span>
                        <span
                            aria-hidden
                            data-directional-arrow="down"
                            className="ui-directional-arrow text-violet-200 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                        >
                            ⌄
                        </span>
                    </span>
                </summary>

                <ul
                    aria-label="Arena member contact list"
                    className="divide-y divide-white/10 border-t border-white/10 px-4"
                >
                    {visibleContacts.map((contact) => (
                        <li
                            key={contact.user_id}
                            className="flex min-w-0 items-center justify-between gap-3 py-3"
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <p className="truncate text-sm font-semibold text-white">
                                    @{contact.username}
                                </p>
                                <p className="shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                    {contactRoleLabel(contact.role)}
                                </p>
                            </div>
                            <a
                                href={`mailto:${contact.email}`}
                                title={contact.email}
                                className="min-w-0 max-w-[58%] truncate whitespace-nowrap text-right text-sm text-violet-100 underline decoration-violet-300/35 underline-offset-4 transition hover:text-white"
                            >
                                {contact.email}
                            </a>
                        </li>
                    ))}
                </ul>

                {/* The MVP renders every contact at once because it has them all.
                    This list is paged, so the rest is one tap away rather than
                    silently missing. */}
                {hasMore ? (
                    <div className="border-t border-white/10 px-4 py-3">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                                dispatch(
                                    fetchArenaMemberContactsRequest({
                                        arena_id: arenaId,
                                        page: loadedPage + 1,
                                        limit: PAGE_SIZE,
                                    })
                                )
                            }
                            className="min-h-9 w-full rounded-lg border border-violet-300/30 px-3 text-[10px] font-semibold uppercase tracking-wide text-violet-100 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {loading ? "Loading..." : "Show more"}
                        </button>
                    </div>
                ) : null}
            </details>
        </section>
    );
};

export default ArenaMemberContactsPanel;
