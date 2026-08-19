"use client";

import { useParams } from "next/navigation";
import LeagueFantasyContestCreateForm from "@/components/contests/LeagueFantasyContestCreateForm";

/**
 * The Fantasy contest route — a thin wrapper, because the form itself is also
 * mounted by the League page's "Start a contest" sidebar.
 *
 * The form lives in `components/contests/` rather than being exported from here:
 * Next.js allows a route file only its own reserved exports (`default`,
 * `metadata`, `generateStaticParams`, …) and fails the build on anything else,
 * so the MVP's shape — a named `LeagueFantasyContestCreateContent` exported
 * beside the page — cannot be copied literally.
 *
 * This route stays canonical for deep links and refresh-after-error: it is the
 * one that reads the id off the URL.
 */
const CreateContestPage = () => {
    const params = useParams<{ leagueId: string }>();

    return (
        <LeagueFantasyContestCreateForm
            leagueId={params.leagueId as string}
            surface="page"
        />
    );
};

export default CreateContestPage;
