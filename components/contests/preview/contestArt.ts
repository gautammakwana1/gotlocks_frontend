import type { ContestPreviewArtworkKey } from "./model";

type ContestArtworkDefinition = {
    src: string;
    objectPosition: string;
};

/**
 * Card artwork, served from the COMPRESSED set.
 *
 * `public/contest-art/` holds the originals exactly as the MVP ships them —
 * 1672x941 PNGs, ~2 MB each, 18.3 MB for the nine. A contests tab draws up to
 * nine of these at once and the card renders them at 92px (compact) or roughly
 * a third of the viewport (poster), so shipping the originals is ~40x more
 * bytes than any pixel on screen can use and it visibly stalls the tab.
 *
 * `public/contest-art/compressed/` holds the same nine resized to 840px wide and
 * encoded as WebP q78 — 0.44 MB for the set, 97.6% smaller, still 2x the largest
 * rendered width. The originals stay checked in as the master copies: re-run the
 * resize from them rather than re-compressing a compressed file.
 */
const COMPRESSED_ROOT = "/contest-art/compressed";

export const CONTEST_ART: Record<
    ContestPreviewArtworkKey,
    ContestArtworkDefinition
> = {
    general_combo: {
        src: `${COMPRESSED_ROOT}/general-combo.webp`,
        objectPosition: "56% center",
    },
    sunday_pickem: {
        src: `${COMPRESSED_ROOT}/sunday-pickem.webp`,
        objectPosition: "center center",
    },
    td_psychic: {
        src: `${COMPRESSED_ROOT}/td-psychic-muted.webp`,
        objectPosition: "center center",
    },
    "fantasy-basketball": {
        src: `${COMPRESSED_ROOT}/fantasy-basketball.webp`,
        objectPosition: "center center",
    },
    "fantasy-football": {
        src: `${COMPRESSED_ROOT}/fantasy-football.webp`,
        objectPosition: "center center",
    },
    "fantasy-soccer": {
        src: `${COMPRESSED_ROOT}/fantasy-soccer.webp`,
        objectPosition: "center center",
    },
    "fantasy-hockey": {
        src: `${COMPRESSED_ROOT}/fantasy-hockey.webp`,
        objectPosition: "center center",
    },
    "fantasy-baseball": {
        src: `${COMPRESSED_ROOT}/fantasy-baseball.webp`,
        objectPosition: "center center",
    },
    "fantasy-multi-sport": {
        src: `${COMPRESSED_ROOT}/fantasy-multi-sport.webp`,
        objectPosition: "center center",
    },
};
