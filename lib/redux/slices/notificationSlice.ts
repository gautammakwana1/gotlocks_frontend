import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AppNotification, FetchNotificationsPayload, NotificationsState } from "@/lib/interfaces/interfaces";

const initialState: NotificationsState = {
    notification: [],
    loading: false,
    error: null,
    message: null,
    hasMore: false,
};

const notificationSlice = createSlice({
    name: "notifications",
    initialState,
    reducers: {
        fetchNotificationListRequest: (state, action: PayloadAction<FetchNotificationsPayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        fetchNotificationListSuccess: (state, action: PayloadAction<{ notifications: AppNotification[], page: number, hasMore: boolean }>) => {
            state.loading = false;
            const { notifications, page, hasMore } = action.payload;
            state.hasMore = hasMore;
            if (page === 1) {
                state.notification = notifications;
            } else {
                const existingIds = new Set(state.notification?.map(n => n.id) || []);
                const newUniqueNotifications = notifications.filter(n => !existingIds.has(n.id));
                state.notification = [...(state.notification || []), ...newUniqueNotifications];
            }
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
            void action;
            state.loading = false;
            // /notification/mark-read marks every notification for the caller and
            // returns no list, so reflect it locally — otherwise the header's
            // unread badge stays lit until the next fetch.
            state.notification = (state.notification ?? []).map((item) =>
                item.is_read ? item : { ...item, is_read: true }
            );
        },
        markNotificationReadFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearMarkNotificationReadMessage(state) {
            state.error = null;
            state.message = null;
        },

        clearAllNotificationRequest: (state, action) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        clearAllNotificationSuccess: (state, action) => {
            state.loading = false;
            state.notification = [];
        },
        clearAllNotificationFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        }
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
    clearAllNotificationRequest,
    clearAllNotificationSuccess,
    clearAllNotificationFailure,
} = notificationSlice.actions;

export default notificationSlice.reducer;