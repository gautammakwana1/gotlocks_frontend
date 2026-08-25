/* ============================================================================
 * MEMBER CONTACTS — the client half of the Arena's staff-only contact surface.
 *
 * TWO endpoints, deliberately, because they are two different acts:
 *
 *   GET /group/arena/member-contacts/list   JSON, paged — the on-screen list.
 *   GET /group/arena/member-contacts        text/csv    — the download.
 *
 * They were one call at first, with the CSV parsed back into rows to render the
 * panel. That is why this file no longer has a CSV reader. Splitting them fixed
 * two things a single call could not:
 *
 *   - The export endpoint is throttled to 5/minute per user and writes an audit
 *     line every time it is called. Rendering the panel through it meant merely
 *     LOOKING at the list logged an export and spent an export slot, so five
 *     glances locked the owner out of the actual download and the audit trail
 *     could not tell a view from a file leaving the building.
 *   - A CSV round-trip cannot page. The list endpoint pages server-side and
 *     answers the raw role (`commissioner`), so the panel labels roles the same
 *     way the roster beside it does, with no formula-guard apostrophes to undo.
 *
 * Both endpoints share one server-side selection and one sort order, so the
 * list on screen and the file that downloads can never disagree.
 * ========================================================================== */

/** One row of the panel. Mirrors the list endpoint's JSON exactly. */
export type ArenaMemberContact = {
    user_id: string;
    /** No `@` — the panel adds it, exactly as the MVP does. */
    username: string;
    email: string;
    /** RAW seat: `commissioner` | `manager` | `member`. The CSV humanises it. */
    role: string;
    /** Nullable in the schema, so a row can legitimately carry no join time. */
    joined_at: string | null;
};

const FALLBACK_FILENAME = "arena-member-contacts.csv";

/**
 * The name the server chose, read off Content-Disposition.
 *
 * Taken from the response rather than rebuilt from the Arena name so the two
 * can never disagree; `Content-Disposition` is CORS-exposed by the API for
 * exactly this. The header is absent on a cached or proxied response, hence the
 * fallback.
 */
export const memberContactsFilenameFrom = (contentDisposition: unknown): string => {
    if (typeof contentDisposition !== "string") return FALLBACK_FILENAME;

    /* The server slugs the Arena name to ASCII, so the plain `filename=` form is
     * always enough today. RFC 5987 `filename*` is read first anyway, because it
     * is what would appear if that slugging were ever relaxed. */
    const extended = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
    if (extended?.[1]) {
        try {
            return decodeURIComponent(extended[1].trim());
        } catch {
            // A malformed encoding is not worth failing the download over.
        }
    }

    const plain = /filename="?([^";]+)"?/i.exec(contentDisposition);
    return plain?.[1]?.trim() || FALLBACK_FILENAME;
};

/**
 * Saves the CSV the API already built.
 *
 * A plain <a href> cannot reach the endpoint — authenticateUser wants a Bearer
 * header a browser navigation will not send — so the bytes come over XHR and
 * are handed to the user as a blob here.
 */
export const downloadMemberContactsCsv = (csv: string, filename: string) => {
    // No BOM prefix: the server already sent one, and a second lands as a stray
    // glyph in cell A1.
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};
