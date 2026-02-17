export const APP_NAME = "gotLocks?"
export const TAGLINE = "trust your gut. 🔒 it in. climb the rankings."

export const SLIP_STATUS = {
  OPEN: "open",
  LOCKED: "locked",
  FINALIZED: "finalized",
  VOIDED: "voided",
}

export const JAGGED_CLIP_PATH =
  "polygon(0 0, 100% 0, 100% calc(100% - var(--jagged-valley, 12px)), 94% calc(100% - var(--jagged-tip, 2px)), 88% calc(100% - var(--jagged-valley, 12px)), 82% calc(100% - var(--jagged-tip, 2px)), 76% calc(100% - var(--jagged-valley, 12px)), 70% calc(100% - var(--jagged-tip, 2px)), 64% calc(100% - var(--jagged-valley, 12px)), 58% calc(100% - var(--jagged-tip, 2px)), 52% calc(100% - var(--jagged-valley, 12px)), 46% calc(100% - var(--jagged-tip, 2px)), 40% calc(100% - var(--jagged-valley, 12px)), 34% calc(100% - var(--jagged-tip, 2px)), 28% calc(100% - var(--jagged-valley, 12px)), 22% calc(100% - var(--jagged-tip, 2px)), 16% calc(100% - var(--jagged-valley, 12px)), 10% calc(100% - var(--jagged-tip, 2px)), 4% calc(100% - var(--jagged-valley, 12px)), 0 calc(100% - var(--jagged-valley, 12px)))";

export const SPORT_OPTIONS = [
  { label: "NFL (default)", value: "nfl" },
  { label: "NCAAF", value: "ncaaf" },
  { label: "NBA", value: "nba" },
  { label: "MLB", value: "mlb" },
  { label: "NHL", value: "nhl" },
  { label: "Soccer", value: "soccer" },
  { label: "Other", value: "other" },
]

export const COLORS = {
  BACKGROUND: "#000000",
  ACCENT: "#00FF99",
  SECONDARY: "#12420e",
  TEXT_PRIMARY: "#FFFFFF",
  TEXT_MUTED: "#A3A3A3",
  ERROR: "#FF4D4D",
}

export const DEFAULT_LOCK_CYCLE = {
  PICK_LOCK_DAY: "Sunday",
  PICK_LOCK_TIME_ET: "12:00 AM",
  RESULTS_DEADLINE_DAY: "Tuesday",
  RESULTS_DEADLINE_TIME_ET: "11:59 PM",
}

export const MAX_PICKS_PER_USER = 10;

export const LOSS_PICK_POINTS = -15;

export const SLIP_STATUSES = ["open", "final"] as const;

export const PICK_LIMIT_OPTIONS: Array<{
  label: string;
  value: 1 | "unlimited";
}> = [
    { label: "Single pick mode", value: 1 },
    { label: "Multi-pick mode", value: "unlimited" },
  ];

export const ODDS_BRACKETS = [
  {
    tier: 1,
    tierIndex: 1,
    label: "<= -300",
    minOdds: null,
    maxOdds: -300,
    points: 5,
    name: "LOCK",
    color: "from-[#8A5BFF]/60 via-[#8A5BFF]/30 to-[#8A5BFF]/12",
  },
  {
    tier: 2,
    tierIndex: 2,
    label: "-299 to -150",
    minOdds: -299,
    maxOdds: -150,
    points: 15,
    name: "SAFE",
    color: "from-[#5B6CFF]/60 via-[#5B6CFF]/30 to-[#5B6CFF]/12",
  },
  {
    tier: 3,
    tierIndex: 3,
    label: "-149 to +150",
    minOdds: -149,
    maxOdds: 150,
    points: 25,
    name: "EVEN",
    color: "from-[#4C7BFF]/60 via-[#4C7BFF]/30 to-[#4C7BFF]/12",
  },
  {
    tier: 4,
    tierIndex: 4,
    label: "+151 to +450",
    minOdds: 151,
    maxOdds: 450,
    points: 35,
    name: "EDGE",
    color: "from-[#007BFF]/70 via-[#007BFF]/35 to-[#007BFF]/15",
  },
  {
    tier: 5,
    tierIndex: 5,
    label: "+451 to +850",
    minOdds: 451,
    maxOdds: 850,
    points: 45,
    name: "RISKY",
    color: "from-[#00B6FF]/70 via-[#00B6FF]/35 to-[#00B6FF]/15",
  },
  {
    tier: 6,
    tierIndex: 6,
    label: "+851 to +1350",
    minOdds: 851,
    maxOdds: 1350,
    points: 60,
    name: "SPICY",
    color: "from-[#00E6FF]/70 via-[#00E6FF]/35 to-[#00E6FF]/15",
  },
  {
    tier: 7,
    tierIndex: 7,
    label: "+1351 to +1950",
    minOdds: 1351,
    maxOdds: 1950,
    points: 75,
    name: "HAIL MARY",
    color: "from-[#00E6B5]/70 via-[#00E6B5]/35 to-[#00E6B5]/15",
  },
  {
    tier: 8,
    tierIndex: 8,
    label: "+1951 to +3000",
    minOdds: 1951,
    maxOdds: 3000,
    points: 90,
    name: "MOONSHOT",
    color: "from-[#00994B]/70 via-[#00994B]/35 to-[#00994B]/15",
  },
  {
    tier: 9,
    tierIndex: 9,
    label: "+3001 to +5000",
    minOdds: 3001,
    maxOdds: 5000,
    points: 120,
    name: "EPIC",
    color: "from-[#52FF75]/75 via-[#52FF75]/40 to-[#52FF75]/18",
  },
  {
    tier: 10,
    tierIndex: 10,
    label: "+5001 to +8000",
    minOdds: 5001,
    maxOdds: 8000,
    points: 150,
    name: "INSANE",
    color: "from-[#7EE600]/70 via-[#7EE600]/35 to-[#7EE600]/15",
  },
  {
    tier: 11,
    tierIndex: 11,
    label: "+8001 to +11000",
    minOdds: 8001,
    maxOdds: 11000,
    points: 180,
    name: "ELITE",
    color: "from-[#C7E600]/70 via-[#C7E600]/35 to-[#C7E600]/15",
  },
  {
    tier: 12,
    tierIndex: 12,
    label: "+11001 to +15000",
    minOdds: 11001,
    maxOdds: 15000,
    points: 210,
    name: "ALL-TIME",
    color: "from-[#F5D400]/70 via-[#F5D400]/35 to-[#F5D400]/15",
  },
  {
    tier: 13,
    tierIndex: 13,
    label: "+15001 to +25000",
    minOdds: 15001,
    maxOdds: 25000,
    points: 240,
    name: "ICONIC",
    color: "from-[#F4A300]/70 via-[#F4A300]/35 to-[#F4A300]/15",
  },
  {
    tier: 14,
    tierIndex: 14,
    label: ">= +25001",
    minOdds: 25001,
    maxOdds: null,
    points: 300,
    name: "LEGENDARY",
    color: "from-[#F07B00]/70 via-[#F07B00]/35 to-[#F07B00]/15",
  },
] as const;
