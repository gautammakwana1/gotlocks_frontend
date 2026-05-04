export type DeleteLeagueClientRuntime = {
    removeLeagueLocally: (leagueId: string) => Promise<void> | void;
    redirectToHome: () => void;
};

export const deleteLeague = async (
    leagueId: string,
    runtime?: DeleteLeagueClientRuntime
): Promise<void> => {
    // TODO: Supabase implementation should call RPC `delete_league(league_id uuid)` and
    //       remove associated rows via SQL or Row Level Security policies.
    if (!runtime) {
        throw new Error("deleteLeague runtime missing for client placeholder");
    }

    await runtime.removeLeagueLocally(leagueId);
    runtime.redirectToHome();
};
