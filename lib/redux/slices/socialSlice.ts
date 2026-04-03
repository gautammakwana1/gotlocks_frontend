import { FetchSearchedUsersPayload, SearchUsers, SocialState } from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: SocialState = {
    loading: false,
    error: null,
    message: null,
    users: [],
    hasMore: false,
};

const socialSlice = createSlice({
    name: "social",
    initialState,
    reducers: {
        fetchSearchedUsersRequest: (state, action: PayloadAction<FetchSearchedUsersPayload>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchSearchedUsersSuccess: (state, action) => {
            state.loading = false;
            const { users, page, hasMore } = action.payload;
            state.hasMore = hasMore;
            if (page === 1) {
                state.users = users;
            } else {
                const existingIds = new Set(state.users?.map(u => u.id) || []);
                const newUniqueUsers = users.filter((u: SearchUsers) => !existingIds.has(u.id));
                state.users = [...(state.users || []), ...newUniqueUsers];
            }
        },
        fetchSearchedUsersFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchSearchedUsersMessage: (state) => {
            state.error = null;
            state.message = null;
        },
    },
});

export const {
    fetchSearchedUsersRequest,
    fetchSearchedUsersSuccess,
    fetchSearchedUsersFailure,
    clearFetchSearchedUsersMessage,
} = socialSlice.actions;

export default socialSlice.reducer;