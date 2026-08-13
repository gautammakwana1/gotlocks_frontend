import Image from "next/image";
import Link from "next/link";

import { CONTEST_ART } from "./contestArt";
import type {
  ContestPreviewAccent,
  ContestPreviewViewModel,
  ContestPreviewVisualState,
} from "./model";
import styles from "./ContestPreviewCard.module.css";

const visualStateClassNames: Record<ContestPreviewVisualState, string> = {
  open: styles.open,
  locked: styles.locked,
  finalized: styles.finalized,
};

const accentClassNames: Record<ContestPreviewAccent, string> = {
  league: styles.league,
  arena: styles.arena,
};

const winnerInitials = (name: string) => {
  const parts = name
    .trim()
    .replace(/^@/, "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2);
  const initials =
    parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : parts.map((part) => part.charAt(0).toUpperCase()).join("");

  return initials || "?";
};

export type ContestPreviewCardProps = {
  preview: ContestPreviewViewModel;
  className?: string;
  headingLevel?: 3 | 4;
};

export const ContestPreviewCard = ({
  preview,
  className = "",
  headingLevel = 3,
}: ContestPreviewCardProps) => {
  const artwork = CONTEST_ART[preview.artwork];
  const Heading = headingLevel === 4 ? "h4" : "h3";
  const isCompact = preview.visualState === "finalized";
  const hasResultSummary = isCompact && Boolean(preview.resultSummary);
  const secondaryMeta = preview.secondaryMeta ? (
    <p
      className={styles.secondaryMeta}
      data-contest-preview-identity-part="secondary"
    >
      {preview.secondaryMeta}
    </p>
  ) : null;

  return (
    <Link
      href={preview.action.href}
      aria-label={preview.action.ariaLabel}
      className={`${styles.card} ${isCompact ? styles.compact : styles.poster} ${hasResultSummary ? styles.withResult : ""} ${visualStateClassNames[preview.visualState]} ${accentClassNames[preview.accent]} ${className}`.trim()}
      data-contest-preview-artwork={preview.artwork}
      data-contest-preview-state={preview.visualState}
      data-contest-preview-accent={preview.accent}
      data-contest-preview-layout={isCompact ? "compact" : "poster"}
      data-contest-preview-finalized-surface={isCompact ? "gold" : undefined}
      data-contest-preview-compact-layout={
        isCompact
          ? hasResultSummary
            ? "artwork-identity-result"
            : "artwork-identity"
          : undefined
      }
    >
      {isCompact ? (
        <>
          <div
            className={styles.compactArtwork}
            data-contest-preview-compact-artwork="true"
            data-contest-preview-artwork-layer="flush-full-height"
            data-contest-preview-compact-artwork-layout="flush-square"
          >
            <Image
              src={artwork.src}
              alt=""
              aria-hidden="true"
              fill
              sizes="5.75rem"
              className={styles.compactArtworkImage}
              style={{ objectPosition: artwork.objectPosition }}
              data-contest-preview-artwork-treatment="finalized-resolved"
            />
          </div>
          <div
            className={styles.compactCopy}
            data-contest-preview-compact-identity="true"
          >
            <Heading
              className={styles.title}
              data-contest-preview-compact-title-overflow="ellipsis"
              data-contest-preview-identity-part="title"
            >
              {preview.title}
            </Heading>
            {secondaryMeta}
            <p
              className={styles.compactTiming}
              data-contest-preview-identity-part="timing"
            >
              {preview.timingLabel}
            </p>
          </div>
          {preview.resultSummary ? (
            <dl
              className={styles.resultSummary}
              data-contest-preview-result="summary"
              data-contest-preview-result-divider="none"
              data-contest-preview-result-height="identity-three-lines-tall"
              data-contest-preview-result-layout="inset-badge"
              data-contest-preview-result-responsive="condensed-stack"
              data-contest-preview-result-treatment="champion-plate"
              data-contest-preview-result-width="wide"
            >
              <div
                className={styles.resultIdentityRow}
                data-contest-preview-result-copy-layout="stacked-right"
                data-contest-preview-result-group="avatar-copy"
                data-contest-preview-result-row="winner-identity"
              >
                <dt
                  className={styles.resultSummaryLabel}
                  data-contest-preview-result-label-placement="avatar-right"
                  data-contest-preview-result-part="label"
                >
                  <span
                    className={styles.resultAvatarStack}
                    aria-hidden="true"
                    data-contest-preview-result-condensed-overflow={
                      preview.resultSummary.winners.length > 2
                        ? preview.resultSummary.winners.length - 2
                        : undefined
                    }
                    data-contest-preview-result-avatar-size="medium"
                    data-contest-preview-result-avatar-treatment="double-ring"
                    data-contest-preview-result-avatars="stack"
                  >
                    {preview.resultSummary.winners
                      .slice(0, 3)
                      .map((winner, index) => (
                        <span
                          key={`${winner.name}-${index}`}
                          className={styles.resultAvatar}
                          data-contest-preview-result-avatar={
                            winner.avatarUrl ? "image" : "initials"
                          }
                          data-contest-preview-result-winner={winner.name}
                        >
                          {winner.avatarUrl ? (
                            <Image
                              src={winner.avatarUrl}
                              alt=""
                              aria-hidden="true"
                              width={32}
                              height={32}
                              unoptimized
                              className={styles.resultAvatarImage}
                            />
                          ) : (
                            winnerInitials(winner.name)
                          )}
                        </span>
                      ))}
                    {preview.resultSummary.winners.length > 3 ? (
                      <span
                        className={`${styles.resultAvatar} ${styles.resultAvatarOverflow}`}
                        data-contest-preview-result-avatar="overflow"
                      >
                        +{preview.resultSummary.winners.length - 3}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={styles.resultLabelCopy}
                    data-contest-preview-result-label-copy="winner-with-crown"
                  >
                    <span>{preview.resultSummary.label}</span>
                    <span
                      className={styles.championMark}
                      aria-hidden="true"
                      data-contest-preview-result-accent="champion-crown"
                      data-contest-preview-result-accent-placement="label-right"
                      data-contest-preview-result-accent-silhouette="single-piece-sharp"
                      data-contest-preview-result-accent-tilt="up-right"
                    />
                  </span>
                </dt>
                <dd
                  className={styles.resultSummaryValue}
                  data-contest-preview-result-max-characters="10"
                  data-contest-preview-result-overflow="ellipsis"
                  data-contest-preview-result-part="value"
                  data-contest-preview-result-value-placement="below-label"
                >
                  {preview.resultSummary.value}
                </dd>
              </div>
            </dl>
          ) : null}
        </>
      ) : (
        <div
          className={styles.posterFrame}
          data-contest-preview-frame="solid-l"
          data-contest-preview-frame-tracks="three-equal"
        >
          <div
            className={styles.hero}
            data-contest-preview-hero="true"
            data-contest-preview-artwork-layer="contained"
          >
            <Image
              src={artwork.src}
              alt=""
              aria-hidden="true"
              fill
              sizes="(min-width: 768px) 35vw, 70vw"
              className={styles.artwork}
              style={{ objectPosition: artwork.objectPosition }}
              data-contest-preview-artwork-treatment={
                preview.visualState === "locked"
                  ? "subdued-dark-red"
                  : "subdued-green"
              }
            />
            <span className={styles.stateTreatment} aria-hidden="true" />
            <div
              className={styles.artworkStatus}
              data-contest-preview-info="status"
              data-contest-preview-status-placement="artwork-top-left"
            >
              <span className={styles.stateDot} aria-hidden="true" />
              <span>{preview.statusLabel}</span>
            </div>
          </div>

          <div
            className={`${styles.infoRail} ${preview.tertiaryFact ? styles.withTertiaryFact : ""}`.trim()}
            data-contest-preview-info-rail="true"
            data-contest-preview-rail-span="full-height"
            data-contest-preview-rail-layout={
              preview.tertiaryFact
                ? "three-equal-tracks"
                : "two-equal-tracks"
            }
            data-contest-preview-surface="rail"
          >
            <div
              className={`${styles.railRow} ${styles.railTiming}`}
              data-contest-preview-info="timing"
              data-contest-preview-rail-row="timing"
            >
              <span>{preview.timingLabel}</span>
            </div>
            <div
              className={`${styles.railRow} ${styles.railFact}`}
              data-contest-preview-divider="rail-upper"
              data-contest-preview-info="mechanic"
              data-contest-preview-info-spacing="eyebrow-detail"
              data-contest-preview-rail-row="format"
            >
              <span
                className={styles.railLabel}
                data-contest-preview-format-part="type"
              >
                {preview.contestTypeLabel}
              </span>
              <span
                className={styles.railFactValue}
                data-contest-preview-format-part="mechanic"
              >
                {preview.mechanicLabel}
              </span>
            </div>
            {preview.tertiaryFact ? (
              <div
                className={`${styles.railRow} ${styles.railFact}`}
                data-contest-preview-divider-align="tertiary-title"
                data-contest-preview-info={preview.tertiaryFact.kind}
                data-contest-preview-info-spacing="eyebrow-detail"
                data-contest-preview-rail-row={preview.tertiaryFact.kind}
              >
                <span
                  className={styles.railLabel}
                  data-contest-preview-tertiary-part="label"
                >
                  {preview.tertiaryFact.label}
                </span>
                <span
                  className={styles.railTertiaryValue}
                  data-contest-preview-tertiary-part="value"
                >
                  {preview.tertiaryFact.value}
                </span>
              </div>
            ) : null}
          </div>

          <div
            className={styles.titleRow}
            data-contest-preview-divider-align="tertiary-title"
            data-contest-preview-title-row="bottom"
            data-contest-preview-surface="title"
          >
            <div className={styles.titleCopy}>
              <Heading className={styles.posterTitle}>{preview.title}</Heading>
              {secondaryMeta}
            </div>
          </div>
        </div>
      )}
    </Link>
  );
};

export default ContestPreviewCard;
