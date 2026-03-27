import { createSlice } from "@reduxjs/toolkit";
import type { NotificationsState } from "@/lib/interfaces/interfaces";

const initialState: NotificationsState = {
    notification: [],
    loading: false,
    error: null,
    message: null,
};

const notificationSlice = createSlice({
    name: "notifications",
    initialState,
    reducers: {
        fetchNotificationListRequest: (state, action) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchNotificationListSuccess: (state, action) => {
            state.loading = false;
            state.notification = action.payload?.notifications;
        },
        fetchNotificationListFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearFetchNotificationListMessage(state) {
            state.error = null;
            state.message = null;
        },

        markNotificationReadRequest: (state, action) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        markNotificationReadSuccess: (state, action) => {
            state.loading = false;
            // state.message = action.payload?.message;
        },
        markNotificationReadFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearMarkNotificationReadMessage(state) {
            state.error = null;
            state.message = null;
        },
    },
});

export const {
    fetchNotificationListRequest,
    fetchNotificationListSuccess,
    fetchNotificationListFailure,
    clearFetchNotificationListMessage,
    markNotificationReadRequest,
    markNotificationReadSuccess,
    markNotificationReadFailure,
    clearMarkNotificationReadMessage,
} = notificationSlice.actions;

export default notificationSlice.reducer;