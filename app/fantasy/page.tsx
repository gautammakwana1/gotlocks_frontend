"use client";

import LeagueHub from "@/components/leagues/LeagueHub";
import { Suspense } from "react";

// ---------------------------------------------------------------------------
// TUTORIAL DISABLED 2026-08-17. Superseded by the per-League and per-Arena
// Guides (LeagueMemberGuideDialog / ArenaMemberWelcomeDialog), which are
// group-scoped and therefore replay for each group a member joins — the old
// tutorial was keyed (user_id, tutorial_key) and could only ever fire once.
//
// Commented rather than deleted: to bring it back, uncomment this block, the
// imports below, and the <OnboardingModal> in the returned tree.
//
// Nothing else has to change to keep the app working while this is off:
// `hasSeenGroupIntro` / `hasSeenWelcomeIntro` both DEFAULT TO TRUE in
// progressSlice, so with the tutorial-progress fetch disabled every intro gate
// reads as "already seen" and no screen stays locked.
// ---------------------------------------------------------------------------
// import OnboardingModal from "@/components/modals/OnboardingModal";
// import { RootState } from "@/lib/interfaces/interfaces";
// import { GROUP_TUTORIAL } from "@/lib/onboarding/tutorials";
// import { updateTutorialProgressRequest } from "@/lib/redux/slices/progressSlice";
// import { useDispatch, useSelector } from "react-redux";

const FantasyPage = () => {
    // const dispatch = useDispatch();
    // const { hasSeenGroupIntro, hasSeenWelcomeIntro } = useSelector((state: RootState) => state.progress);

    // const handleCompleteLeagueIntro = () => {
    //     dispatch(updateTutorialProgressRequest({ tutorial_key: "group" }));
    // }

    return (
        <Suspense
            fallback={
                <div className="text-sm text-gray-400" role="status">
                    Preparing Leagues…
                </div>
            }
        >
            <LeagueHub />
            {/* <OnboardingModal
                open={hasSeenWelcomeIntro && !hasSeenGroupIntro}
                steps={GROUP_TUTORIAL}
                onClose={handleCompleteLeagueIntro}
                finalCtaLabel="finish"
            /> */}
        </Suspense >
    )
};

export default FantasyPage;
