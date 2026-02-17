export type DeleteGroupClientRuntime = {
    removeGroupLocally: (groupId: string) => Promise<void> | void;
    redirectToHome: () => void;
};

export const deleteGroup = async (
    groupId: string,
    runtime?: DeleteGroupClientRuntime
): Promise<void> => {
    // TODO: Supabase implementation should call RPC `delete_group(group_id uuid)` and
    //       remove associated rows via SQL or Row Level Security policies.
    if (!runtime) {
        throw new Error("deleteGroup runtime missing for client placeholder");
    }

    await runtime.removeGroupLocally(groupId);
    runtime.redirectToHome();
};
