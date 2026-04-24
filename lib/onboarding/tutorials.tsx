import { OnboardingStep } from "@/components/modals/OnboardingModal";
import { WelcomeStep1Animation, WelcomeStep2Animation, WelcomeStep3Animation } from "@/components/ui/onboarding/animation/WelcomeAnimation";

const PLACEHOLDER = "/onboarding/placeholder.jpg";

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
        media: PLACEHOLDER,
        mediaAlt: "Commissioner and members",
        title: "Know your role",
        body: "Leagues are where your crew gets organized. Every league has a commissioner and members — start your own and you're the commissioner by default. Move as a unit, compete against each other, or both.",
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Leaderboard slip",
        title: "The leaderboard slip",
        body: "Created by the commissioner. Open the slip, choose from the games available in the selected league and window, and lock in one pick. Every pick gets a confidence tier based on its odds. Once finalized, results push straight to the league standings.",
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Vibe slips",
        title: "Just for fun? Vibe slips",
        body: "Anyone can create one. Bundle multiple picks into a single submission and share the results with the league. No leaderboard impact, just gut feels and wild combos.",
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "How points work",
        title: "How the points work",
        body: "Wins earn points based on your tier. Higher odds mean more points and a quicker climb up the rankings. Losses are -15 by default, but the commissioner can adjust scores during review for custom house rules.",
    },
];

export const GLOBAL_TUTORIAL: OnboardingStep[] = [
    {
        media: PLACEHOLDER,
        mediaAlt: "Public profile",
        title: "Your public profile",
        body: "Your public profile shows your level and your record. Keep it public so anyone can follow your picks, or flip it private so only approved followers can see.",
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Posting a pick",
        title: "Post your locks",
        body: "Posts are your public callouts. Drop a single pick or bundle multiple into one post and let the world see where you stand. Every post grades automatically when the games finish and your record updates in real time.",
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Rewards",
        title: "How you get rewarded",
        body: "Wins earn both XP and Lock Chips based on your tier. Higher odds mean bigger rewards and faster level gains. Losses deduct 15 chips from your balance by default.",
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Lock Chips",
        title: "But what are Lock Chips?",
        body: "Lock Chips and XP are both earned by being right. XP levels up your profile and unlocks new ways to customize your experience. Lock Chips are your currency, stack them up and spend them in The Shop on exclusive access and limited rewards.",
    },
    {
        media: PLACEHOLDER,
        mediaAlt: "Global feed tabs",
        title: "Discover & connect",
        body: "For You, Following, Winners. Three tabs that make up your global feed. Scroll to find picks worth tailing, react to boost the ones that deserve more eyes, and follow anyone whose record speaks for itself.",
    },
];
