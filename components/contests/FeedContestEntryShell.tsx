"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import BackButton from "@/components/ui/BackButton";
import ContestPickBuilder from "@/components/pick-builder/contest/ContestPickBuilder";
import {
    FEED_CONTEST_MAX_LEGS,
    FEED_CONTEST_MIN_LEGS,
    formatContestDateTime,
} from "@/lib/contests/feedContestCatalog";
import {
    feedContestOddsRequestKey,
    withEnrichedContestOdds,
} from "@/lib/contests/feedContestOdds";
import { formatParticipationRulesForContext } from "@/lib/contests/participationRules";
import {
    PICKEM_ENTRY_API_READY,
    PICKEM_ENTRY_PLACEHOLDER_NOTICE,
    pickemMatchupOptionsFromMoneyline,
} from "@/lib/contests/pickemEntry";
import {
    TD_PSYCHIC_SELECTION_COUNT,
    buildTdPsychicSelections,
    tdPsychicCardDescription,
    tdPsychicMatchupsFromScorers,
    tdPsychicPrefillFromLegs,
    tdPsychicScorerCatalog,
    type TdPsychicCatalogSelection,
    type TdPsychicScorerIdentity,
} from "@/lib/contests/tdPsychicEntry";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/lib/state/ToastContext";
import type {
    FeedContestEntryLegPayload,
    FeedContestEntryRow,
    FeedContestGameOddsEntry,
    FeedContestGameOddsSource,
    FeedContestOddsGroup,
    RootState,
} from "@/lib/interfaces/interfaces";
import {
    clearFeedContestDetail,
    clearFeedContestEntries,
    clearFeedContestEntryMessage,
    enterFeedContestRequest,
    enterPickemFeedContestRequest,
    replacePickemFeedContestEntryRequest,
    fetchFeedContestDetailRequest,
    fetchFeedContestEntriesRequest,
    replaceFeedContestEntryRequest,
    enterTdPsychicFeedContestRequest,
    replaceTdPsychicFeedContestEntryRequest,
} from "@/lib/redux/slices/feedContestSlice";
import {
    clearFeedContestOdds,
    fetchContestGameOddsRetryRequest,
    fetchContestMatchOddsRequest,
    fetchFeedContestOddsRequest,
} from "@/lib/redux/slices/feedContestOddsSlice";
import {
    clearPickemMoneyline,
    fetchPickemMoneylineRequest,
} from "@/lib/redux/slices/pickemMoneylineSlice";
import { clearTdScorers, fetchTdScorersRequest } from "@/lib/redux/slices/tdScorersSlice";
import { fetchVenueCheckInDetailRequest } from "@/lib/redux/slices/venueSlice";
import ContestEntryFeedCard from "./ContestEntryFeedCard";
import PickemCardEntryEditor from "./PickemCardEntryEditor";
import TdPsychicCardBuilder from "./TdPsychicCardBuilder";
import VenueContestAccessPanel from "./VenueContestAccessPanel";
import type { FeedContestAccent } from "./FeedContestDetail";

/* ----------------------------------------------------------------------------
 * "Create your entry" — the member-facing entry route, ported from the MVP's
 * StructuredContestEntryShell (gotlocks.app_mvp2/components/contests/
 * StructuredContestDetail.tsx, ~line 3441).
 *
 * Layout, copy and gating are the MVP's. What changed is where the data comes
 * from: the MVP reads a synchronous mock catalog, so it can render the whole
 * builder on the first commit. Here the slate rides on the contest detail and
 * the markets arrive over the network, so the builder carries its own loading
 * and error states and the rules gate is rendered before either lands.
 *
 * THREE ENTRY MODELS, and SIX endpoints — one pair each, never crossed. Each
 * endpoint refuses the other models' contests by name, so the choice here is not
 * cosmetic:
 *
 *          board                              join                    swap
 *   combo  /schedules-with-odds-by-events     POST /enter             PUT /replace-entry
 *   card   /leagues/nfl/moneyline-odds        POST /enter-pickem      PUT /replace-pickem-entry
 *   td     /leagues/nfl/td-scorers-by-events  POST /enter-td-psychic  PUT /replace-td-psychic-entry
 *
 * The TD row differs from the two above it in what it SENDS, not merely in where
 * it sends it: a combo and a card each carry a price per leg and are priced at
 * acceptance. A TD card carries three player identities and NO prices at all —
 * one shared price per scorer is captured at the contest lock, the same number
 * for everyone holding that player, which is the only way its correct-scorer
 * tiebreak can compare two cards
 *
 * Joining is ONE call in both models — it accepts the rules, opts the member in
 * and submits, so nobody is ever left opted in with no entry. Once an entry
 * exists the swap replaces it in place, and a card is swapped WHOLE: the
 * replacement is validated exactly as a first submission is.
 * -------------------------------------------------------------------------- */

/**
 * Stable empties. A contest whose board has not landed yet must not hand the
 * builder a fresh array/object identity every render — its whole slate↔odds join
 * is memoised on exactly these two references.
 */
const NO_ODDS_GROUPS: readonly FeedContestOddsGroup[] = [];
const NO_GAME_ODDS: Readonly<Record<string, FeedContestGameOddsEntry>> = {};

const accentClassesFor = (accent: FeedContestAccent) =>
    accent === "arena"
        ? { textSoft: "text-violet-200" }
        : { textSoft: "text-sky-200" };

/**
 * The ONLY status `/replace-entry` accepts. `gateParticipantForReplace` refuses
 * everything else, and it splits the refusal two ways for a reason: 'locked' and
 * 'completed' are past the deadline ("your entry is locked"), while every other
 * status has nothing to replace ("join first"). Those call for opposite actions
 * from the member, so this must not be widened to "holds a spot".
 */
const REPLACEABLE_STATUS = "entered";

/** Committed, but past the point where either write applies. */
const SETTLED_STATUSES = ["locked", "completed"];

/** Statuses that can never enter again, whatever the clock says. */
const BARRED_STATUSES = ["withdrawn", "disqualified", "missed_deadline"];

export type FeedContestEntryShellProps = {
    contestId: string;
    /** Where Back and Close return to — the contest detail route. */
    detailHref: string;
    /**
     * FALSE disables the write without hiding the screen — the Arena hosting
     * gate. A League has no hosting state and never passes it.
     */
    writable?: boolean;
    /**
     * The Arena tier's participating-member ceiling, for the "Contest full"
     * notice. An Arena route reads it from hosting; a League Feed contest has no
     * cap at all and leaves it unset, which is why the notice never fires there.
     */
    participantLimit?: number | null;
    accent?: FeedContestAccent;
};

export const FeedContestEntryShell = ({
    contestId,
    detailHref,
    writable = true,
    participantLimit,
    accent = "league",
}: FeedContestEntryShellProps) => {
    const accentClasses = accentClassesFor(accent);
    const router = useRouter();
    const dispatch = useDispatch();
    const { setToast } = useToast();
    const currentUser = useCurrentUser();

    const {
        detail,
        detailLoading,
        detailError,
        entries,
        entrySubmitLoading,
        entrySubmitMessage,
        entrySubmitError,
        submittedEntry,
    } = useSelector((state: RootState) => state.feedContest);
    const odds = useSelector((state: RootState) => state.feedContestOdds);
    const moneyline = useSelector((state: RootState) => state.pickemMoneyline);
    const tdScorers = useSelector((state: RootState) => state.tdScorers);
    const venueDetail = useSelector((state: RootState) => state.venue.detail);
    const venueDetailForId = useSelector((state: RootState) => state.venue.detailForId);

    const [rulesAccepted, setRulesAccepted] = useState(false);
    const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string }>();

    useEffect(() => {
        if (!contestId) return;
        dispatch(fetchFeedContestDetailRequest({ contest_id: contestId }));
        // The full first page, not the default 20: this screen needs the
        // CALLER's own row, and the endpoint pages the field by submission time
        // with no way to pin the caller's entry to page 1. 100 is the server's
        // own maximum.
        // TODO(api): a `?mine=1` filter (or the caller's row returned outside the
        // page window) would make this exact; past 100 entries a member who
        // entered early can still see an empty receipt and a blank replacement.
        dispatch(
            fetchFeedContestEntriesRequest({ contest_id: contestId, page: 1, limit: 100 })
        );
    }, [contestId, dispatch]);

    // Every slot this screen reads is single-tenant and shared with the detail
    // screen, so all three are dropped on the way out.
    useEffect(
        () => () => {
            dispatch(clearFeedContestDetail());
            dispatch(clearFeedContestEntries());
            dispatch(clearFeedContestOdds());
            dispatch(clearPickemMoneyline());
            dispatch(clearTdScorers());
        },
        [dispatch]
    );

    // Read during RENDER, never from an effect: a record belonging to another id
    // is never used, whatever the loading flags say.
    const scoped = detail?.contest?.id === contestId ? detail : null;
    const contest = scoped?.contest ?? null;
    const slate = useMemo(() => contest?.eligible_games_json ?? [], [contest]);

    // A new rules_version invalidates whatever the member ticked.
    useEffect(() => {
        setRulesAccepted(false);
    }, [contest?.id, contest?.rules_version]);

    /* ---------- The markets for this contest's frozen slate ---------- */
    const requestKey = useMemo(
        () =>
            contest
                ? feedContestOddsRequestKey(
                      contest.id,
                      "fanduel",
                      slate.map((game) => game.game_id)
                  )
                : "",
        [contest, slate]
    );
    const oddsDescribeThisContest = Boolean(requestKey) && odds.requestKey === requestKey;
    // Both boards key their cache the same way, so each is read through the same
    // "is this MY slate?" check rather than trusting whatever is in the slot.
    const moneylineDescribesThisContest =
        Boolean(requestKey) && moneyline.requestKey === requestKey;
    const tdScorersDescribeThisContest =
        Boolean(requestKey) && tdScorers.requestKey === requestKey;

    /*
     * WHICH board this contest needs.
     *
     * A Pick'em card asks one question per game, so it reads the narrow
     * `/leagues/nfl/moneyline-odds` endpoint — the moneyline only, already
     * flattened — instead of the full market board. Only ONE of the two is ever
     * fetched: pulling every market and discarding all but the moneyline is the
     * cost this endpoint exists to remove.
     */
    const usesMoneylineBoard = contest?.entry_model === "pickem_card";
    /*
     * And the board a TD PSYCHIC card needs — the anytime-touchdown-scorer read,
     * where the question is which PLAYER scores rather than which team wins. It
     * arrives already filtered to the full-game 1+ line, so the builder cannot
     * offer a selection (a 2+ alternate, a first-scorer market, a passing TD)
     * that the entry endpoint would then refuse.
     */
    const usesTdScorerBoard = contest?.entry_model === "td_psychic_card";

    const dispatchOddsFetch = useCallback(() => {
        if (!contest || !slate.length) return;
        // Exactly ONE of the three is ever fetched. Pulling the full market
        // board and discarding all but one market is the cost the two narrow
        // endpoints exist to remove.
        dispatch(
            usesTdScorerBoard
                ? fetchTdScorersRequest({
                      contest_id: contest.id,
                      game_ids: slate.map((game) => game.game_id),
                      sportsbook: "fanduel",
                  })
                : usesMoneylineBoard
                  ? fetchPickemMoneylineRequest({
                        contest_id: contest.id,
                        game_ids: slate.map((game) => game.game_id),
                        sportsbook: "fanduel",
                    })
                  : fetchFeedContestOddsRequest({
                        contest_id: contest.id,
                        games: slate,
                        sportsbook: "fanduel",
                    })
        );
    }, [contest, dispatch, slate, usesMoneylineBoard, usesTdScorerBoard]);

    // Keyed on the REQUEST KEY string, not on the slate array: the array is a new
    // identity every render and would loop.
    const requestedKeyRef = useRef("");
    useEffect(() => {
        if (!contest || !slate.length || !requestKey) return;
        if (requestedKeyRef.current === requestKey) return;
        requestedKeyRef.current = requestKey;
        dispatchOddsFetch();
    }, [contest, dispatchOddsFetch, requestKey, slate]);

    const refetchOdds = () => {
        requestedKeyRef.current = requestKey;
        dispatchOddsFetch();
    };

    /**
     * The batch board with every TARGETED per-game answer folded into it — ONE
     * array, so the builder keeps a single render path.
     *
     * `withEnrichedContestOdds` folds in only the entries that actually came back
     * with markets, and returns its input by identity when none did. An empty,
     * failed or in-flight enrichment therefore cannot blank a game the batch
     * already priced, and cannot churn the memos downstream either.
     */
    const enrichedOddsGroups = useMemo(
        () =>
            oddsDescribeThisContest
                ? withEnrichedContestOdds(odds.groups, odds.byGame)
                : NO_ODDS_GROUPS,
        [odds.byGame, odds.groups, oddsDescribeThisContest]
    );

    /**
     * The two targeted per-game reads, scoped to the BATCH answer's request key.
     *
     * That key is what every per-game reducer case checks before it stores
     * anything, so a fetch that outlives this screen — or lands after the slate
     * re-quoted under a new key — is dropped rather than filed under another
     * contest's games. Dispatching from here rather than from the builder is what
     * makes that possible: the key is derived here and nowhere else.
     */
    const requestGameOdds = useCallback(
        ({
            gameId,
            sport,
            source,
        }: {
            gameId: string;
            sport: string;
            source: FeedContestGameOddsSource;
        }) => {
            if (!requestKey || !oddsDescribeThisContest) return;
            const payload = {
                contestRequestKey: requestKey,
                gameId,
                sport,
                // The same book the batch read asked for. The by-match-id family
                // bakes the book into the PATH, so a mismatch here would quietly
                // show a board priced by the other one.
                sportsbook: "fanduel" as const,
            };
            dispatch(
                source === "match_odds"
                    ? fetchContestMatchOddsRequest(payload)
                    : fetchContestGameOddsRetryRequest(payload)
            );
        },
        [dispatch, oddsDescribeThisContest, requestKey]
    );

    /**
     * The Pick'em card's matchups — the same slate↔odds join the combo builder
     * does internally, narrowed to one moneyline per team.
     *
     * Unlike the combo builder this does NOT drop started or unpriced games: a
     * card is the WHOLE slate, so a dropped game would let it read "complete"
     * while the server still refuses it. They arrive flagged and the editor
     * disables them.
     */
    const pickemMatchups = useMemo(
        () =>
            moneylineDescribesThisContest
                ? pickemMatchupOptionsFromMoneyline(slate, moneyline.events)
                : [],
        [moneyline.events, moneylineDescribesThisContest, slate]
    );

    /**
     * The TD Psychic card's matchups — the same slate↔board join, narrowed to
     * one player list per game.
     *
     * Like the Pick'em join and unlike the combo builder's, this does NOT drop
     * started or unpriced games: the slate is what the contest froze, and a
     * silently dropped matchup reads to a member as "this game is not in the
     * contest". A game with no scorers posted yet arrives with an empty list and
     * says so in its own page.
     */
    const tdPsychicMatchups = useMemo(
        () =>
            tdScorersDescribeThisContest
                ? tdPsychicMatchupsFromScorers(slate, tdScorers.events)
                : [],
        [slate, tdScorers.events, tdScorersDescribeThisContest]
    );
    /** Every distinct scorer on the slate — what a replacement re-resolves against. */
    const tdPsychicCatalog = useMemo(
        () => tdPsychicScorerCatalog(tdPsychicMatchups),
        [tdPsychicMatchups]
    );

    /* ---------- Who may enter, and whether this is a join or a replacement ---------- */
    const participation = contest?.my_participation ?? null;
    const participantStatus = participation?.status ?? null;
    const rulesCurrent =
        Boolean(participation?.rules_version_accepted) &&
        participation?.rules_version_accepted === contest?.rules_version;
    // Exactly the server's replace gate. Widening this to "already holds a spot"
    // would send a PUT for a 'locked' participant, which answers 409 — the
    // decision between the two writes has to agree with the endpoint that
    // enforces it, not merely approximate it.
    const hasAcceptedEntry = participantStatus === REPLACEABLE_STATUS;
    const settled = SETTLED_STATUSES.includes(participantStatus ?? "");
    const barred = BARRED_STATUSES.includes(participantStatus ?? "");

    const opensAt = contest?.opens_at ? Date.parse(contest.opens_at) : Number.NEGATIVE_INFINITY;
    const locksAt = contest?.locks_at ? Date.parse(contest.locks_at) : Number.NaN;
    const entryWindowOpen = Boolean(
        contest &&
            writable &&
            contest.lifecycle_status === "open" &&
            !contest.canceled_at &&
            !contest.archived_at &&
            Date.now() >= opensAt &&
            Number.isFinite(locksAt) &&
            Date.now() < locksAt
    );

    /* ---------- Venue Check-In ----------
     *
     * `resolveVenueEntryAccess` re-runs at BOTH the submit and the replace, so an
     * entry can never outlive the session that authorised it — which is why this
     * gates the BUILDER rather than only warning: offering a submit that is
     * certain to answer 403 wastes the member's whole entry.
     *
     * The read is fired from the contest, not from the route: only the detail
     * response knows this contest's group, and only its `entry_access_mode` says
     * whether the venue tables need to be touched at all. An 'open' contest never
     * makes the call.
     */
    const venueRequired = contest?.entry_access_mode === "venue_check_in_required";
    const venueGroupId = scoped?.group?.id ?? "";

    useEffect(() => {
        if (!venueRequired || !venueGroupId) return;
        dispatch(fetchVenueCheckInDetailRequest({ group_id: venueGroupId }));
    }, [dispatch, venueGroupId, venueRequired]);

    // Read through an id check, like every other group-scoped slot here.
    const scopedVenue = venueGroupId && venueDetailForId === venueGroupId ? venueDetail : null;
    const venueSession = scopedVenue?.session ?? null;
    const checkedInAtVenue = venueSession?.is_checked_in === true;
    // Optimistic until the read lands: a not-yet-answered slot must not look
    // like a missing check-in and hide a builder the server would accept.
    const venueAllowsBuilder = !venueRequired || !scopedVenue || checkedInAtVenue;
    // Whether the check-in panel is ALREADY on screen above the fold. A submit
    // that was refused re-renders the same panel under the error, and one screen
    // must never carry two of them.
    const venuePanelShown = Boolean(
        venueRequired && entryWindowOpen && scopedVenue && !checkedInAtVenue
    );

    // Three entry models have a builder. `multi_pick` is the General Combo
    // board; `pickem_card` is the Sunday Pick'em card — one moneyline in every
    // included matchup; `td_psychic_card` is three anytime touchdown scorers
    // across the slate. Anything else has no UI here.
    const isComboContest = contest?.entry_model === "multi_pick";
    const isPickemContest = contest?.entry_model === "pickem_card";
    const isTdPsychicContest = contest?.entry_model === "td_psychic_card";
    const buildableModel = isComboContest || isPickemContest || isTdPsychicContest;
    const canBuildEntry =
        entryWindowOpen && buildableModel && !barred && !settled && venueAllowsBuilder;
    // A join needs the rules ticked here; a replacement already accepted them.
    const needsRulesAcceptance = canBuildEntry && !hasAcceptedEntry;
    const acceptedCurrentRules = hasAcceptedEntry || rulesCurrent || rulesAccepted;

    /* ---------- The legs already accepted, for a replacement ---------- */
    // The entries list is the source; the just-written reply is the fallback, so
    // the receipt appears in the commit that wrote it rather than waiting for the
    // refetch. The reply carries no row, so a minimal one is synthesised — the
    // receipt card needs an author and a timestamp, both of which are known.
    const ownRow = useMemo<FeedContestEntryRow | null>(() => {
        const fromList =
            entries?.contest?.id === contestId
                ? (entries.entries.find((row) => row.is_own) ?? null)
                : null;
        if (fromList?.pick) return fromList;

        const written = submittedEntry?.pick;
        if (!written) return fromList;
        return {
            id: written.id ?? `${contestId}-own-entry`,
            is_own: true,
            is_revealed: true,
            member: {
                id: written.user_id ?? currentUser?.userId ?? "",
                username: currentUser?.username ?? null,
                // The session carries no avatar; the card falls back to its
                // placeholder, and the refetch replaces this row moments later.
                profile_image: null,
            },
            participant_status: "entered",
            joined_at: null,
            entered_at: written.created_at ?? null,
            submitted_at: written.created_at ?? new Date().toISOString(),
            updated_at: written.updated_at ?? written.created_at ?? "",
            pick: written,
        };
    }, [contestId, currentUser, entries, submittedEntry]);
    const ownEntry = ownRow?.pick ?? null;
    const initialLegKeys = useMemo(
        () => (ownEntry?.legs ?? []).map((leg) => leg.external_pick_key),
        [ownEntry]
    );
    const initialLegLabels = useMemo(
        () =>
            Object.fromEntries(
                (ownEntry?.legs ?? []).map((leg) => [leg.external_pick_key, leg.description])
            ),
        [ownEntry]
    );

    /**
     * The accepted TD card's three players, re-resolved against the CURRENT
     * board — what a replacement opens pre-filled with.
     *
     * NOT read straight off the stored legs, and it cannot be: every
     * member-facing read redacts `providerMarketId`, `providerSelectionId` and
     * `external_pick_key` out of them (`redactTdPsychicPickForMember`), so a card
     * genuinely cannot be re-submitted from its own receipt. The player identity
     * survives redaction, and re-matching it against the live board is both the
     * only way to rebuild a payload the endpoint accepts AND the right
     * behaviour: a scorer whose line has since been pulled drops out of the
     * pre-fill rather than being re-sent and refused.
     */
    const tdPsychicPrefill = useMemo(
        () =>
            tdPsychicPrefillFromLegs(
                (ownEntry?.legs ?? []) as Parameters<typeof tdPsychicPrefillFromLegs>[0],
                tdPsychicCatalog
            ),
        [ownEntry, tdPsychicCatalog]
    );
    /**
     * How many of the accepted card's scorers the current board could NOT
     * re-resolve — a line the book has since pulled.
     *
     * Counted only from a board that answered COMPLETELY. Two guards, and both
     * are load-bearing:
     *
     *   `tdScorersDescribeThisContest` — before the read lands every scorer is
     *   "missing" simply because nothing has loaded.
     *
     *   `!tdScorers.partial` — when a chunk fails, its games come back with no
     *   players at all. Counting that as "pulled" tells a member their pick is
     *   gone and asks them to replace a perfectly valid one, over a transient
     *   upstream error.
     */
    const tdPsychicDroppedScorers =
        isTdPsychicContest &&
        tdScorersDescribeThisContest &&
        !tdScorers.partial &&
        ownEntry?.legs?.length
            ? ownEntry.legs.length - tdPsychicPrefill.length
            : 0;

    /**
     * The MVP's `replacingExistingEntry` — an accepted entry that the builder
     * below is about to edit in place. It suppresses the receipt, so the screen
     * never shows the same entry twice.
     */
    const replacingExistingEntry = Boolean(ownEntry && hasAcceptedEntry && canBuildEntry);

    /**
     * What contest points are CALLED on this surface, and the stored rules copy
     * narrowed to match.
     *
     * ONE rules string is stored on the contest and the same template ships to
     * both surfaces, so it reads "League Points or Arena Points" — a disjunction
     * that is noise on a League contest and actively wrong about where the points
     * land on an Arena one. Narrowed at RENDER time only, exactly as the detail
     * screen does it: the text on record stays neutral, so a member who ticked
     * the box is never held to terms different from the ones stored.
     */
    const contextualPointsLabel: "League Points" | "Arena Points" =
        scoped?.context_type === "arena" ? "Arena Points" : "League Points";
    const contextualRulesText = contest?.rules_text
        ? formatParticipationRulesForContext(contest.rules_text, contextualPointsLabel)
        : contest?.rules_text;

    /**
     * Why this screen has no builder on it, when it has none — or null when the
     * builder is up, or when the reason is already stated by a panel of its own.
     */
    const readOnlyNote = canBuildEntry
        ? null
        : barred
          ? "You are not eligible to enter this contest."
          : settled
            ? "Your entry is locked and can no longer be replaced. Results and your live rank update automatically."
            : !buildableModel
              ? "This contest does not take a General Combo, Sunday Pick'em or TD Psychic entry, so it cannot be built here yet."
              : !entryWindowOpen
                ? "This entry is read-only because the contest is not currently accepting submissions. Results and your live rank update automatically."
                : null;

    /**
     * The contest is at its tier's participating-member ceiling AND the viewer
     * holds NO PARTICIPATION ROW AT ALL — so there is nothing here for them to
     * submit. Capacity bars a new participant, never an existing one.
     *
     * Gated on `participation`, not on `hasAcceptedEntry`: a member who is
     * `opted_in`, `locked` or `completed` already counts toward
     * `participant_count`, so testing "has an accepted entry" would tell someone
     * holding a spot that the spots are all taken — including above their own
     * locked receipt. This is the MVP's condition (StructuredContestDetail:4039).
     */
    const contestFullForViewer = Boolean(
        contest &&
            participantLimit !== null &&
            participantLimit !== undefined &&
            (contest.participant_count ?? 0) >= participantLimit &&
            !participation
    );

    /* ---------- Report the write once ---------- */
    // Set the moment the screen navigates away on a successful write, so a
    // re-render before the route change lands cannot fire a second replace.
    const navigatedAfterSubmitRef = useRef(false);
    useEffect(() => {
        if (!entrySubmitMessage && !entrySubmitError) return;
        // `/replace-entry` returns what it displaced, precisely so the swap can
        // be shown without the client having kept the old entry to diff against.
        // Appended to the server's own copy rather than replacing it.
        const swap =
            !entrySubmitError && submittedEntry && "previous_entry" in submittedEntry
                ? submittedEntry.previous_entry
                : null;
        /*
         * The two replace endpoints describe what they displaced DIFFERENTLY,
         * because the two models are different: a combo reports one parlay
         * (`leg_count` at a `combined_american_odds`), a card reports how many
         * picks it held (`pick_count`) and never a combined price — a card has
         * none. Read whichever the reply actually carries.
         */
        const swapNote = !swap
            ? ""
            : "leg_count" in swap && typeof swap.leg_count === "number"
              ? ` Replaced a ${swap.leg_count}-leg entry${
                    "combined_american_odds" in swap &&
                    typeof swap.combined_american_odds === "number"
                        ? ` at ${swap.combined_american_odds > 0 ? "+" : ""}${swap.combined_american_odds}`
                        : ""
                }.`
              : "pick_count" in swap && typeof swap.pick_count === "number"
                ? ` Replaced a ${swap.pick_count}-pick card.`
                : "";
        const message = entrySubmitError ?? `${entrySubmitMessage ?? ""}${swapNote}`;
        setFeedback({ tone: entrySubmitError ? "error" : "success", message });
        setToast({
            id: Date.now(),
            type: entrySubmitError ? "error" : "success",
            message,
            duration: entrySubmitError ? 4000 : 3000,
        });
        dispatch(clearFeedContestEntryMessage());
        /*
         * An ACCEPTED write is done with this screen — the MVP leaves for
         * `?tab=entries`, and all three entry models do the same here.
         *
         * Staying put was the worse behaviour and not merely a different one:
         * the "am I replacing?" flag flips as soon as the re-read of the
         * participant row lands, so the steady state after a submit was a
         * re-seeded "Replace" builder rather than the receipt the member just
         * earned. The detail route re-reads the contest on mount, which is why
         * the refetch this used to fire is gone with it.
         *
         * A FAILED write stays, so the error and the builder holding the
         * member's picks are still on screen.
         */
        if (!entrySubmitError && !navigatedAfterSubmitRef.current) {
            navigatedAfterSubmitRef.current = true;
            router.replace(`${detailHref}?tab=entries`);
        }
        // `submittedEntry` outlives the message it came with, but the guard above
        // means only the commit that carries a message can get past it — so this
        // still reports exactly once per write.
    }, [
        detailHref,
        dispatch,
        entrySubmitError,
        entrySubmitMessage,
        router,
        setToast,
        submittedEntry,
    ]);

    /*
     * A submit that the SERVER refused re-reads the venue session, because a
     * refusal is the one moment the cached read is known to be capable of being
     * stale: `resolveVenueEntryAccess` runs again at the submit, so a session
     * that expired between this screen's read and the write answers 403 while
     * the store still shows a live check-in. The re-read is what puts the
     * check-in panel back under the error.
     *
     * TODO(api): the entry error arrives as a plain string with no code, so this
     * cannot tell a venue refusal from any other failure and re-reads on all of
     * them. The MVP keys the same behaviour off a structured entry-access code
     * (`isStructuredContestEntryAccessErrorCode`); string-matching the message
     * here would break on the first copy edit, so the endpoints need to return
     * that code before this can be narrowed.
     */
    useEffect(() => {
        if (!entrySubmitError || !venueRequired || !venueGroupId) return;
        dispatch(fetchVenueCheckInDetailRequest({ group_id: venueGroupId }));
    }, [dispatch, entrySubmitError, venueGroupId, venueRequired]);

    const handleSubmit = (legs: FeedContestEntryLegPayload[]) => {
        if (!contest) return;
        if (!hasAcceptedEntry && !acceptedCurrentRules) {
            const message = "Accept the current contest rules before submitting your entry.";
            setFeedback({ tone: "error", message });
            setToast({ id: Date.now(), type: "error", message, duration: 4000 });
            return;
        }
        const body = {
            contest_id: contest.id,
            legs,
            description: legs.map((leg) => leg.description).join(" + ").slice(0, 300),
            source_tab: "Feed Contest",
            build_mode: "ODDS",
        };
        // A member who already holds an accepted entry REPLACES it; /enter would
        // answer 409 "You have already entered this contest."
        dispatch(
            hasAcceptedEntry
                ? replaceFeedContestEntryRequest({
                      ...body,
                      rules_version: contest.rules_version,
                  })
                : enterFeedContestRequest({ ...body, rules_version: contest.rules_version })
        );
    };

    /**
     * The Sunday Pick'em write.
     *
     * The legs it builds are already the right ones — byte-compatible with what
     * the combo path sends — but the endpoint behind `handleSubmit` refuses a
     * `pickem_card` contest twice over (see PICKEM_ENTRY_API_READY for the two
     * guards and their file:line). So while that flag is false this stops at a
     * placeholder rather than firing a request that is certain to 400.
     *
     * When the real endpoint ships: flip PICKEM_ENTRY_API_READY to true. If it is
     * a NEW route rather than the existing one, replace the `handleSubmit(legs)`
     * call below with its dispatch — this function is the only place to change.
     */
    const handlePickemSubmit = (legs: FeedContestEntryLegPayload[]) => {
        if (!contest) return;
        if (!PICKEM_ENTRY_API_READY) {
            console.info("[pickem] card built, endpoint not live yet", {
                contest_id: contest.id,
                entry_model: contest.entry_model,
                leg_count: legs.length,
                legs,
            });
            setFeedback({ tone: "success", message: PICKEM_ENTRY_PLACEHOLDER_NOTICE });
            setToast({
                id: Date.now(),
                type: "success",
                message: PICKEM_ENTRY_PLACEHOLDER_NOTICE,
                duration: 5000,
            });
            return;
        }
        if (!hasAcceptedEntry && !acceptedCurrentRules) {
            const message = "Accept the current contest rules before submitting your card.";
            setFeedback({ tone: "error", message });
            setToast({ id: Date.now(), type: "error", message, duration: 4000 });
            return;
        }
        const body = {
            contest_id: contest.id,
            legs,
            description: legs.map((leg) => leg.description).join(" • ").slice(0, 300),
            source_tab: "Feed Contest",
            build_mode: "ODDS",
            rules_version: contest.rules_version,
        };
        // A member holding an accepted card REPLACES it; /enter-pickem would
        // answer 409. Both endpoints take the same body — the replacement is a
        // WHOLE card, validated exactly as a first submission is.
        dispatch(
            hasAcceptedEntry
                ? replacePickemFeedContestEntryRequest(body)
                : enterPickemFeedContestRequest(body)
        );
    };

    /**
     * The TD Psychic write.
     *
     * The one place in this screen where NOTHING PRICED travels. The other two
     * models send `legs[]` with an `american_odds` each; this sends
     * `selections[]` of five identity fields and no numbers, because a TD card
     * has no price until the shared capture at `locks_at` gives every member
     * holding a scorer the same one.
     *
     * A member holding an accepted card REPLACES it; `/enter-td-psychic` would
     * answer 409. Both endpoints take the same body — the replacement is a WHOLE
     * card of three, validated exactly as a first submission is.
     */
    const handleTdPsychicSubmit = (
        selections: TdPsychicScorerIdentity[],
        chosen: TdPsychicCatalogSelection[]
    ) => {
        if (!contest) return;
        if (selections.length !== TD_PSYCHIC_SELECTION_COUNT) {
            const message = `Pick ${TD_PSYCHIC_SELECTION_COUNT} different touchdown scorers before submitting your card.`;
            setFeedback({ tone: "error", message });
            setToast({ id: Date.now(), type: "error", message, duration: 4000 });
            return;
        }
        if (!hasAcceptedEntry && !acceptedCurrentRules) {
            const message = "Accept the current contest rules before submitting your card.";
            setFeedback({ tone: "error", message });
            setToast({ id: Date.now(), type: "error", message, duration: 4000 });
            return;
        }
        const body = {
            contest_id: contest.id,
            selections: buildTdPsychicSelections(selections),
            description: tdPsychicCardDescription(chosen),
            source_tab: "Feed Contest",
            build_mode: "ODDS",
            rules_version: contest.rules_version,
        };
        dispatch(
            hasAcceptedEntry
                ? replaceTdPsychicFeedContestEntryRequest(body)
                : enterTdPsychicFeedContestRequest(body)
        );
    };

    if (!contest) {
        return (
            <div className="space-y-5 pb-10">
                <BackButton fallback={detailHref} preferFallback />
                <section className="rounded-xl border border-dashed border-white/15 bg-black/30 p-6">
                    <h1 className="font-semibold text-white">
                        {detailLoading ? "Loading entry…" : "Entry unavailable"}
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        {detailLoading
                            ? "Reading this contest."
                            : (detailError ?? "This contest entry could not be loaded.")}
                    </p>
                </section>
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-5 pb-10 ${accent === "arena" ? "arena-theme" : ""}`}>
            <BackButton fallback={`${detailHref}?tab=entries`} preferFallback />
            {/* No bottom rule under the header any more — the MVP lets the builder
                section's own top border be the first line on the page. */}
            <header className="pb-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        {scoped?.group?.name ?? "Contest"} · Contest entry
                    </p>
                    {/* The MVP's arena-only entry-access chip. It drops the violet
                        on a TD Psychic contest: the template is deliberately
                        neutral dark with white controls — the only colour on the
                        screen below is the players' own team tints — so an accent
                        chip in the header is the one thing that would fight them. */}
                    {scoped?.context_type === "arena" ? (
                        <span
                            className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${
                                isTdPsychicContest
                                    ? "border-white/10 bg-white/[0.03] text-gray-300"
                                    : "border-violet-300/25 bg-violet-500/10 text-violet-100"
                            }`}
                        >
                            {venueRequired ? "VENUE CHECK-IN" : "OPEN ENTRY"}
                        </span>
                    ) : null}
                </div>
                <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
                    {contest.name}
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                    Entries lock {formatContestDateTime(contest.locks_at)} in your local time.
                </p>
                {venueRequired && checkedInAtVenue && venueSession?.expires_at ? (
                    <p className="mt-2 text-sm font-semibold text-emerald-200">
                        Venue check-in active until{" "}
                        {formatContestDateTime(venueSession.expires_at)}
                    </p>
                ) : null}
            </header>

            {/* Bled to the edges on mobile, like the MVP's: this is a fact about
                the whole screen rather than a card inside it. */}
            {contestFullForViewer ? (
                <section className="-mx-5 border-y border-amber-300/20 bg-amber-500/[0.07] px-5 py-4 text-amber-100 sm:mx-0 sm:px-4">
                    <h2 className="text-sm font-semibold">Contest full</h2>
                    <p className="mt-1 text-xs leading-5 text-amber-100/75">
                        All {participantLimit} participant spots are in use. Existing
                        participants can keep their entries, but this contest is no longer
                        accepting new entries.
                    </p>
                </section>
            ) : null}

            {/* Shown only once the venue read has answered and says there is no
                live session — the builder is hidden in the same breath, because
                the server re-checks this at submit AND at replace. */}
            {venuePanelShown && scopedVenue ? (
                <VenueContestAccessPanel
                    venue={scopedVenue.venue_check_in.venue}
                    lastStatus={venueSession?.last_status}
                    lastExpiresAt={venueSession?.last_expires_at}
                    revocationReason={venueSession?.revocation_reason}
                />
            ) : null}

            {/* A TD Psychic card reports its own outcome, immediately under the
                submit button the member is looking at, so repeating it here would
                put the same sentence on the screen twice. Only while the builder
                is actually mounted, though — a refused submit can hide it (a
                revoked venue session does exactly that), and the explanation must
                not leave with it. */}
            {feedback && !(isTdPsychicContest && canBuildEntry) ? (
                <p
                    role={feedback.tone === "error" ? "alert" : "status"}
                    className={
                        feedback.tone === "error"
                            ? "text-sm text-red-200"
                            : "text-sm text-emerald-200"
                    }
                >
                    {feedback.message}
                </p>
            ) : null}

            {/* The MVP re-renders the check-in panel whenever the submit failed
                with an entry-access code. This error carries no code (see the
                TODO on the re-read effect), so the panel is offered on a refusal
                of a venue-gated contest ONLY WHEN THE RE-READ FOUND A DEAD
                SESSION.
                That last clause is what keeps it honest: without it, a member who
                is checked in and gets any other refusal — "you already have an
                accepted entry", a 409 on replace, a moved slate — gets a check-in
                panel bolted underneath telling them to fix a session that is
                fine. */}
            {feedback?.tone === "error" &&
                venueRequired &&
                scopedVenue &&
                !checkedInAtVenue &&
                !venuePanelShown ? (
                <VenueContestAccessPanel
                    venue={scopedVenue.venue_check_in.venue}
                    lastStatus={venueSession?.last_status}
                    lastExpiresAt={venueSession?.last_expires_at}
                    revocationReason={venueSession?.revocation_reason}
                />
            ) : null}

            {/* Hidden while the member is REPLACING it: the builder below opens
                pre-loaded with these same legs, so the MVP no longer shows the
                receipt and the editor for one entry at the same time. It returns
                once the window closes and the entry is read-only. */}
            {ownEntry && !replacingExistingEntry ? (
                <section
                    aria-label="Accepted entry receipt"
                    className="rounded-2xl border border-white/10 bg-black/25 p-5"
                >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                        Accepted entry receipt
                    </p>
                    {venueRequired ? (
                        <p className="mt-2 text-xs font-semibold text-emerald-200">
                            Entry accepted during a verified venue check-in.
                        </p>
                    ) : null}
                    {/* EVERY model reads like the pick post it is, in the same feed
                        card the Entries tab and the Standings expansion already
                        render — a TD card included, which is what makes this the
                        third consistent surface rather than a fourth shape of the
                        same entry. Not bled to the edges here: the MVP only does
                        that inside the detail screen's flush entries list, not
                        inside this padded card. */}
                    <ContestEntryFeedCard
                        row={ownRow!}
                        pick={ownEntry}
                        contextualPointsLabel={contextualPointsLabel}
                        currentUserId={currentUser?.userId}
                        entryFormat={
                            isTdPsychicContest
                                ? "td_psychic"
                                : isPickemContest
                                  ? "sunday_pickem"
                                  : "general_combo"
                        }
                        pickemCorrectBonus={contest.pickem_correct_bonus}
                        contestName={contest.name}
                        contestHref={detailHref}
                    />
                </section>
            ) : null}

            {canBuildEntry ? (
                <section
                    aria-label="Build contest entry"
                    className="-mx-5 space-y-4 border-t border-white/10 px-5 pt-3 sm:-mx-6 sm:px-6 sm:pt-3.5"
                >
                    <div>
                        <div className="mb-1 flex items-center justify-between gap-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">
                                entry builder
                            </p>
                            {/* Neutral grey on a TD Psychic card, for the same
                                reason its header chip is: the accent belongs to
                                the League/Arena chrome, and this template puts no
                                colour on screen but the players' team tints. */}
                            <span
                                className={`text-[10px] uppercase tracking-[0.16em] ${
                                    isTdPsychicContest
                                        ? "text-gray-400"
                                        : accentClasses.textSoft
                                }`}
                            >
                                {isTdPsychicContest
                                    ? "touchdown scorers"
                                    : isPickemContest
                                      ? "moneyline card"
                                      : "contest lines"}
                            </span>
                        </div>
                        {/* The MVP gates this on there being NO participant row at
                            all — an already opted-in member has claimed their spot,
                            even though they have not entered yet. */}
                        {!participation ? (
                            <p className="mt-1 text-xs leading-5 text-gray-400">
                                Your contest spot is claimed only after this complete entry is
                                accepted.
                            </p>
                        ) : null}
                    </div>

                    {isTdPsychicContest ? (
                        <TdPsychicCardBuilder
                            contestId={contest.id}
                            matchups={tdPsychicMatchups}
                            accent={accent}
                            loading={
                                tdScorers.loading ||
                                (!tdScorersDescribeThisContest && !tdScorers.error)
                            }
                            error={tdScorers.error}
                            /*
                             * A PARTIAL board is not an error and not a complete
                             * one either: some of this contest's games could not be
                             * read, so their scorers are missing rather than absent.
                             * Surfaced as a retryable warning — picking from what
                             * did arrive is still valid, and the entry endpoint
                             * re-resolves every selection anyway.
                             */
                            partialNotice={
                                tdScorersDescribeThisContest && tdScorers.partial
                                    ? "Some of this contest's games could not be read, so their touchdown scorers are missing from the list below. Try again to load the full slate."
                                    : null
                            }
                            onRetry={refetchOdds}
                            submitting={entrySubmitLoading}
                            submitLabel={hasAcceptedEntry ? "Replace TD Psychic card" : undefined}
                            initialSelections={tdPsychicPrefill}
                            /*
                             * Rendered by the builder rather than here, because
                             * only the builder knows when it stops being true: it
                             * hides the notice the moment the card is whole again,
                             * which this screen cannot see.
                             */
                            prefillNotice={
                                tdPsychicDroppedScorers > 0
                                    ? tdPsychicDroppedScorers === 1
                                        ? "One of your scorers is no longer an available anytime touchdown pick, so it could not be carried over — choose a replacement."
                                        : `${tdPsychicDroppedScorers} of your scorers are no longer available anytime touchdown picks, so they could not be carried over — choose replacements.`
                                    : null
                            }
                            /*
                             * CARD IDENTITY ONLY — this is the builder's hard-reset
                             * key, so nothing that merely arrives late belongs in
                             * it. The prefill is handled separately (and idempotently)
                             * by the builder's own seeding effect; folding its
                             * readiness in here would make a late board re-run the
                             * reset and wipe picks the member had already made.
                             */
                            versionKey={`${ownEntry?.id ?? "new"}:${contest.rules_version}`}
                            rulesAcceptance={
                                needsRulesAcceptance
                                    ? {
                                          accepted: rulesAccepted,
                                          onAcceptedChange: setRulesAccepted,
                                          label: "I accept the current rules for this complete card.",
                                          rulesText: contextualRulesText,
                                          rulesVersion: contest.rules_version,
                                      }
                                    : undefined
                            }
                            /*
                             * The outcome, rendered under the submit button rather
                             * than only at the top of the screen: a three-square
                             * card plus its rules block is taller than the viewport
                             * on a phone, so a banner above the header is off screen
                             * exactly when the member is waiting to hear back. The
                             * shell's own copy of it is suppressed while this is
                             * mounted, so the sentence appears once.
                             */
                            submitError={feedback?.tone === "error" ? feedback.message : null}
                            submitMessage={
                                feedback?.tone === "success" ? feedback.message : null
                            }
                            onSubmit={handleTdPsychicSubmit}
                        />
                    ) : isPickemContest ? (
                        <PickemCardEntryEditor
                            contestId={contest.id}
                            matchups={pickemMatchups}
                            accent={accent}
                            loading={
                                moneyline.loading ||
                                (!moneylineDescribesThisContest && !moneyline.error)
                            }
                            error={moneyline.error}
                            onRetry={refetchOdds}
                            submitting={entrySubmitLoading}
                            submitLabel={hasAcceptedEntry ? "Replace complete card" : undefined}
                            initialLegs={ownEntry?.legs ?? undefined}
                            versionKey={`${contest.id}:${ownEntry?.id ?? "new"}:${contest.rules_version}`}
                            rulesAcceptance={
                                needsRulesAcceptance
                                    ? {
                                          accepted: rulesAccepted,
                                          onAcceptedChange: setRulesAccepted,
                                          label: "I accept the current rules for this complete card.",
                                          rulesText: contextualRulesText,
                                          rulesVersion: contest.rules_version,
                                      }
                                    : undefined
                            }
                            onSubmit={handlePickemSubmit}
                        />
                    ) : (
                        <ContestPickBuilder
                            context={{
                                contestId: contest.id,
                                contestName: contest.name,
                                slate,
                                // Only ever the odds that describe THIS request; a
                                // stale group set would price another slate's games.
                                // Enrichment rides inside it, so the builder never
                                // has to choose between two boards.
                                oddsGroups: enrichedOddsGroups,
                                // The ledger behind the two targeted reads: the
                                // builder uses it to de-dupe and to show
                                // "Checking for markets…", never for markets.
                                gameOdds: oddsDescribeThisContest
                                    ? odds.byGame
                                    : NO_GAME_ODDS,
                                onRequestGameOdds: requestGameOdds,
                                allowedSports: contest.sports ?? undefined,
                                locksAt: contest.locks_at,
                                rules: {
                                    minLegs: contest.minimum_legs ?? FEED_CONTEST_MIN_LEGS,
                                    maxLegs: contest.maximum_legs ?? FEED_CONTEST_MAX_LEGS,
                                    minimumCombinedOdds: contest.minimum_odds ?? null,
                                    allowSameGameLegs: contest.allow_same_game_legs === true,
                                },
                                initialLegKeys,
                                initialLegLabels,
                                // "Not yet this contest's odds" counts as loading, so
                                // the builder never flashes "no eligible markets"
                                // before the first read lands — but NOT when the read
                                // failed, since a failure also clears the request key
                                // and would otherwise hide the error behind a
                                // spinner that never resolves.
                                loading:
                                    odds.loading || (!oddsDescribeThisContest && !odds.error),
                                error: odds.error,
                                onRetry: refetchOdds,
                                submitting: entrySubmitLoading,
                                submitLabel: hasAcceptedEntry ? "Replace entry" : undefined,
                                // `rulesAccepted`, NOT the derived `acceptedCurrentRules`:
                                // the sheet's checkbox and the section above it are one
                                // control in two places, and feeding the derived value
                                // here renders it pre-ticked and un-untickable whenever
                                // the member's stored acceptance is already current.
                                // The rules themselves ride along now: the MVP moved
                                // the whole review into the sheet, so this is where a
                                // joiner reads them before ticking.
                                rulesAcceptance: needsRulesAcceptance
                                    ? {
                                          accepted: rulesAccepted,
                                          onAcceptedChange: setRulesAccepted,
                                          label: "I accept the current rules for this complete entry.",
                                          rulesText: contextualRulesText,
                                          rulesVersion: contest.rules_version,
                                      }
                                    : undefined,
                                onSubmit: handleSubmit,
                            }}
                            onDismiss={() => router.push(`${detailHref}?tab=entries`)}
                            showDismissButton
                            surface="page"
                        />
                    )}
                </section>
            ) : null}

            {/* The generic sentence is gated on the ENTRY WINDOW, not on
                `canBuildEntry`, and the difference is a contradiction the member
                would otherwise read on one screen: `canBuildEntry` folds in the
                venue check-in, so a member who is not checked in on an OPEN
                venue-gated contest was being shown the "scan the QR to enter"
                panel and "this contest is not currently accepting submissions"
                at the same time. The three branches above it stay on their own
                conditions — each says something the MVP's single sentence does
                not. */}
            {readOnlyNote ? (
                <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-gray-400">
                    {readOnlyNote}
                </section>
            ) : null}
        </div>
    );
};

export default FeedContestEntryShell;
