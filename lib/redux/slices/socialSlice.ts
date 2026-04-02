import { FetchSearchedUsersPayload, SocialState } from "@/lib/interfaces/interfaces";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: SocialState = {
    loading: false,
    error: null,
    message: null,
    users: null,
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
            state.users = action.payload.users;
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