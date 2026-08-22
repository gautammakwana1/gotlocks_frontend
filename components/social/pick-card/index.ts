/* ----------------------------------------------------------------------------
 * THE PICK CARD FAMILY.
 *
 *   PickCard              dispatcher — picks the variant from the presentation
 *   SinglePickCard        one selection
 *   ComboPickCard         a priced parlay (ordinary combo + General Combo entry)
 *   PickemPickCard        a Sunday Pick'em card — independently scored tiles
 *   TdPsychicPickCard     a TD Psychic card — three scorers, ranked on hits
 *
 * Shared by all of them:
 *
 *   PickCardShell         the frame: metric rail, header band, footer, collapsed
 *   PickCardMetrics       the two metric tiles
 *   ContestEntryHeader    the linked "<Contest> · <Format> Entry ↗" eyebrow
 *   ComboOddsRow          the post-lock full-card combo price
 *   buildPickCardModel    every derived value, computed once
 * -------------------------------------------------------------------------- */

export { PickCard } from "./PickCard";
export { default } from "./PickCard";
export { PickCardShell } from "./PickCardShell";
export { PickCardMetrics } from "./PickCardMetrics";
export { ContestEntryHeader } from "./ContestEntryHeader";
export { ComboOddsRow } from "./ComboOddsRow";

export { SinglePickCard, SinglePickSelection } from "./variants/SinglePickCard";
export { ComboPickCard, ComboLegList } from "./variants/ComboPickCard";
export {
    PickemPickCard,
    PickemSelectionCarousel,
    PickemSelectionTile,
} from "./variants/PickemPickCard";
export {
    TdPsychicPickCard,
    TdPsychicSelectionGrid,
    TdPsychicSelectionTile,
    isTdPsychicCardPriced,
} from "./variants/TdPsychicPickCard";

export {
    buildPickCardModel,
    getComboLegVisualState,
    getSelectionVisualState,
    getSelectionVisualTone,
    type PickCardModel,
} from "./pickCardModel";

export type {
    ContestPresentation,
    FeedContestEntryFormat,
    FeedContestPresentation,
    PickCardAccent,
    PickCardBaseProps,
    PickCardContestStanding,
    PickCardPresentation,
    PickCardScale,
    PickCardVariant,
    SelectionVisualState,
} from "./types";
