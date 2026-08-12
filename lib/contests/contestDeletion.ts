/**
 * The fixed, system-authored half of a contest deletion notice, ported verbatim
 * from the MVP (gotlocks.app_mvp2/lib/contests/contestDeletion.ts).
 *
 * The organizer writes a free-text note; this sentence is NOT theirs to edit —
 * it is what tells the entrant which contest vanished and who removed it. The
 * deletion drawer previews the two together so the organizer sees the whole
 * message before confirming.
 *
 * TODO(api): once the delete endpoint exists the SERVER owns the notification
 * copy. Keep this in sync with it (or drop it and preview the server string),
 * so the preview cannot drift from what entrants actually receive.
 */
export const formatContestDeletionSystemMessage = (input: {
    contestName: string;
    organizerHandle: string;
}) => {
    const contestName = input.contestName.trim();
    const organizerHandle =
        input.organizerHandle.trim().replace(/^@+/, "") || "organizer";

    return `“${contestName}” was deleted by @${organizerHandle}. Your entry was removed.`;
};

/** The MVP's note ceiling — enforced by the drawer and re-checked server-side. */
export const CONTEST_DELETION_NOTE_MAX_LENGTH = 280;
