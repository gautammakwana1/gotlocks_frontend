import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { CreateFeedbackPayload, FeedbackState } from "@/lib/interfaces/interfaces";

const initialState: FeedbackState = {
    feedback: null,
    session: null,
    hasSeenIntro: false,
    loading: false,
    error: null,
    message: null,
};

const feedbackSlice = createSlice({
    name: "feedback",
    initialState,
    reducers: {
        createFeedbackRequest: (state, action: PayloadAction<CreateFeedbackPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        createFeedbackSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload?.message;
        },
        createFeedbackFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearCreateFeedbackMessage(state) {
            state.error = null;
            state.message = null;
        },
    },
});

export const {
    createFeedbackRequest,
    createFeedbackSuccess,
    createFeedbackFailure,
    clearCreateFeedbackMessage,
} = feedbackSlice.actions;

export default feedbackSlice.reducer;