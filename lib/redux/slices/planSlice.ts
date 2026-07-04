import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { PaymentTransaction, PlanOverview, PlanState, UpdatePlanpayload } from "@/lib/interfaces/interfaces";
import { setStoredPlan } from "@/lib/plan/planStorage";

const initialState: PlanState = {
    overview: null,
    loading: false,
    error: null,
    message: null,
    transactions: [],
    transactionsLoading: false,
    transactionsError: null,
    transactionsHasMore: false,
};

const planSlice = createSlice({
    name: "plan",
    initialState,
    reducers: {
        fetchPlanOverviewRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        fetchPlanOverviewSuccess: (state, action: PayloadAction<PlanOverview | undefined>) => {
            state.loading = false;
            state.overview = action.payload ?? null;
            setStoredPlan(action.payload?.plan);
        },
        fetchPlanOverviewFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearPlanOverviewMessage(state) {
            state.error = null;
            state.message = null;
        },

        updateUserPlanRequest: (state, action: PayloadAction<UpdatePlanpayload | undefined>) => {
            void action;
            state.loading = true;
            state.error = null;
        },
        updateUserPlanSuccess: (state, action) => {
            state.loading = false;
            state.message = action.payload.message;
            const updatedPlan = action.payload?.data?.plan;
            if (updatedPlan && state.overview) {
                state.overview.plan = updatedPlan;
            }
            setStoredPlan(updatedPlan);
        },
        updateUserPlanFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearUpdateUserPlanMessage(state) {
            state.error = null;
            state.message = null;
        },

        // Stripe hosted-checkout: the saga creates a Checkout Session and
        // redirects the browser to Stripe. The plan is flipped to "pro" only by
        // the backend webhook after payment, then picked up via plan overview.
        createCheckoutSessionRequest: (state) => {
            state.loading = true;
            state.error = null;
        },
        createCheckoutSessionSuccess: (state) => {
            state.loading = false;
        },
        createCheckoutSessionFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },

        // Paginated payment transaction history. Replace on page 1, append + de-dupe
        // by id on later pages (the app's standard paginated-list idiom).
        fetchTransactionsRequest: (state, action: PayloadAction<{ page?: number; limit?: number } | undefined>) => {
            void action;
            state.transactionsLoading = true;
            state.transactionsError = null;
        },
        fetchTransactionsSuccess: (
            state,
            action: PayloadAction<{ transactions: PaymentTransaction[]; page: number; hasMore: boolean }>
        ) => {
            const { transactions, page, hasMore } = action.payload;
            state.transactionsLoading = false;
            state.transactionsHasMore = hasMore;
            if (page === 1) {
                state.transactions = transactions;
            } else {
                const existingIds = new Set(state.transactions.map((t) => t.id));
                const unique = transactions.filter((t) => !existingIds.has(t.id));
                state.transactions = [...state.transactions, ...unique];
            }
        },
        fetchTransactionsFailure: (state, action: PayloadAction<string>) => {
            state.transactionsLoading = false;
            state.transactionsError = action.payload;
        },
    },
});

export const {
    fetchPlanOverviewRequest,
    fetchPlanOverviewSuccess,
    fetchPlanOverviewFailure,
    clearPlanOverviewMessage,
    updateUserPlanRequest,
    updateUserPlanSuccess,
    updateUserPlanFailure,
    clearUpdateUserPlanMessage,
    createCheckoutSessionRequest,
    createCheckoutSessionSuccess,
    createCheckoutSessionFailure,
    fetchTransactionsRequest,
    fetchTransactionsSuccess,
    fetchTransactionsFailure,
} = planSlice.actions;

export default planSlice.reducer;
