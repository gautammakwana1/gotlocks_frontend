import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { PlanOverview, PlanState, UpdatePlanpayload } from "@/lib/interfaces/interfaces";
import { setStoredPlan } from "@/lib/plan/planStorage";

const initialState: PlanState = {
    overview: null,
    loading: false,
    error: null,
    message: null,
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
} = planSlice.actions;

export default planSlice.reducer;
