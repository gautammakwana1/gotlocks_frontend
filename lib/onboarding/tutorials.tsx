import { OnboardingStep } from "@/components/modals/OnboardingModal";
import { GroupStep1Animation, GroupStep2Animation, GroupStep3Animation } from "@/components/ui/onboarding/animation/GroupAnimation";
import { GlobalStep1Animation, GlobalStep2Animation, GlobalStep3Animation } from "@/components/ui/onboarding/animation/GlobalAnimation";
import { WelcomeStep1Animation, WelcomeStep2Animation, WelcomeStep3Animation } from "@/components/ui/onboarding/animation/WelcomeAnimation";

export const WELCOME_TUTORIAL: OnboardingStep[] = [
    {
        mediaNode: <WelcomeStep1Animation />,
        mediaAlt: "gotlocks welcome",
        title: "Welcome to gotlocks",
        body: "You're in. Pick games. Call props. Prove you know ball. Make free predictions, build a record, and find out who actually had it figured out all along. No real money, no gambling. Just your takes, your track record, and the receipts to back it up.",
    },
    {
        mediaNode: <WelcomeStep2Animation />,
        mediaAlt: "Your league",
        title: "Your crew, your league",
        body: "Leagues are your private space to get on the same page with your people before the games kick off. Join an existing league with an invite code or start your own.",
    },
    {
        mediaNode: <WelcomeStep3Animation />,
        mediaAlt: "The global side",
        title: "Or go global",
        body: "Beyond your league is the global feed, a public space where anyone can post picks, react, and follow the ones who keep hitting. Two sides of the app, and you can play both.",
    },
];

export const GROUP_TUTORIAL: OnboardingStep[] = [
    {
        mediaNode: <GroupStep1Animation />,
        mediaAlt: "Commissioner and members",
        title: "Know your role",
        body: "Leagues are where your crew gets organized. Every league has a commissioner and members — start your own and you're the commissioner by default. Move as a unit, compete against each other, or both.",
    },
    {
        mediaNode: <GroupStep2Animation />,
        mediaAlt: "Leaderboard slip",
        title: "The leaderboard slip",
        body: "Created by the commissioner. Choose from the available games and lock in one pick. Your odds determine your league scoring tier, so the bolder the call the bigger the league score. Losses are -15 by default but the commissioner can adjust. Once finalized, results push straight to the private league standings.",
    },
    {
        mediaNode: <GroupStep3Animation />,
        mediaAlt: "Vibe slips",
        title: "Just for fun? Vibe slips",
        body: "The commissioner can open one for casual play, then members stack their own picks on top. Vibe Slips do not change Slip standings or award Slip Points, League Points, or XP.",
    },
];

export const GLOBAL_TUTORIAL: OnboardingStep[] = [
    {
        mediaNode: <GlobalStep1Animation />,
        mediaAlt: "Public profile",
        title: "Your public profile",
        body: "Your public profile shows your level and your record. Drop single picks or bundle multiple into one post and let everyone see where you stand. Every post grades automatically when the games finish and your record updates in real time.",
    },
    {
        mediaNode: <GlobalStep2Animation />,
        mediaAlt: "Rewards",
        title: "How you get rewarded",
        body: "Winning Global Social posts earn XP calculated from the exact odds accepted when the post is submitted. Up to 1,000 XP can be applied per account day. Losses earn none and never remove XP.",
    },
    {
        mediaNode: <GlobalStep3Animation />,
        mediaAlt: "Global feed tabs",
        title: "Discover & connect",
        body: "For You, Following, Winners. Three tabs that make up your global feed. Scroll to find picks worth tailing, react to boost the ones that deserve more eyes, and follow anyone whose record speaks for itself.",
    },
];
