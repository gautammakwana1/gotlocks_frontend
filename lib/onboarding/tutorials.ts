import { OnboardingStep } from "@/components/modals/OnboardingModal";

const PLACEHOLDER = "/onboarding/placeholder.jpg";

export const WELCOME_TUTORIAL: OnboardingStep[] = [
    {
        media: PLACEHOLDER,
        mediaAlt: "gotlocks welcome",
        label: "welcome",
        title: "Welcome to gotlocks",
        body: "You're in. gotlocks is where you and your crew compete on picks, build a record, and settle the debate on who actually knows sports.",
        imgFit: "contain",
        imgHeight: 420,
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Private groups",
        label: "private",
        title: "Your crew, your group",
        body: "Groups are private spaces for your people. Each one has its own slips, leaderboard, and chat. Join an existing group with an invite code, or start your own.",
        imgHeight: 460,
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "The global side",
        label: "public",
        title: "Or go global",
        body: "Outside your group there's the global feed — a public space where anyone can post picks, react, and follow those who always seem to win. Two sides of gotlocks, and you can play both.",
        imgHeight: 460,
    },
];

export const GROUP_TUTORIAL: OnboardingStep[] = [
    {
        media: PLACEHOLDER,
        mediaAlt: "Commissioner and members",
        label: "members",
        title: "Two roles in every group",
        body: "Every group has a commissioner and members. Commissioners create slips, push them through each stage, grade the results, and can even adjust scoring for custom house rules. Members join slips, make picks, and climb the leaderboard. If you start your own group, you're the commissioner by default.",
        imgHeight: 460,
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Slip types",
        label: "slips",
        title: "Two kinds of slips",
        body: "Leaderboard slips are made by the commissioner — everyone makes one pick and it counts toward the group standings. Vibe slips are casual: anyone can create one and add multiple picks.",
        playbackRate: 1.5,
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Slip lifecycle",
        label: "lifecycle",
        title: "How a slip moves",
        body: "Slips go from open → locked → grading → final. You add picks while it's open. Once games start the slip locks, then the commissioner grades the results and finalizes it to push scores to the leaderboard.",
        playbackRate: 1.5,
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Making a pick",
        label: "making a pick",
        title: "How to make a pick",
        body: "Open a slip and choose your games. Each pick gets a confidence tier based on its odds — higher risk means more points if you're right.",
        playbackRate: 1.5,
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Group scoring",
        label: "points",
        title: "How scoring works",
        body: "Wins earn points based on your confidence tier. Losses cost you. Your group leaderboard uses its own scoring system — check the scoring table in your group for the full breakdown. Commissioners can also make manual adjustments for custom house rules.",
        imgHeight: 460,
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "XP and leveling",
        label: "xp",
        title: "XP & leveling up",
        body: "Every pick you make earns XP — whether in a private group or on the global side. XP is what levels up your profile. It's separate from group points (your standing inside a group) and global points (the currency on the public side).",
        imgHeight: 460,
    },
];

export const GLOBAL_TUTORIAL: OnboardingStep[] = [
    {
        media: PLACEHOLDER,
        mediaAlt: "The global feed",
        label: "global",
        title: "The global feed",
        body: "The public side of gotlocks. For You tunes to your taste, Following is strictly people you follow, and Winners surfaces who's actually been hitting.",
        playbackRate: 1.5,
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Your public profile",
        label: "profile",
        title: "Your profile, your call",
        body: "Your public profile shows your level and your record. Keep it public so anyone can check your track, or flip it private so only approved followers can see.",
        imgHeight: 460,
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Global points",
        label: "global points",
        title: "Global points",
        body: "Every public pick you post earns global points. They aren't about climbing the global leaderboard — that's driven by your XP and level. Global points are what unlock the reward tiers in the GPS.",
        imgHeight: 460,
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Global Points Shop",
        label: "shop",
        title: "Cash in at the GPS",
        body: "Global points aren't just a number — redeem them for access to real rewards in the Global Points Shop.",
        imgHeight: 460,
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Reactions",
        label: "reactions",
        title: "React to picks",
        body: "Reactions are your easy way to boost a pick — liking one pushes it up the For You feed so more people see a good callout. Use them to catch picks before they grade so you remember to tail, or to validate a call after it lands in the Winners tab.",
        playbackRate: 1.5,
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Following users",
        label: "following",
        title: "Follow who you like",
        body: "Follow anyone to keep their posts in your feed. If their profile is private, you'll need to send a follow request and wait for approval.",
        playbackRate: 1.5,
    },
];
