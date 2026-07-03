import { AnyAction, combineReducers, Reducer } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import groupsReducer from "./slices/groupsSlice";
import slipReducer from "./slices/slipSlice";
import pickReduce from "./slices/pickSlice";
import feedReduce from "./slices/activitySlice";
import nflReduce from "./slices/nflSlice";
import nbaReduce from "./slices/nbaSlice";
import progressReducer from "./slices/progressSlice";
import ncaabReducer from "./slices/ncaabSlice";
import nhlReducer from "./slices/nhlSlice";
import leaguesReducer from "./slices/leagueSlice";
import feedbackReducer from "./slices/feedbackSlice";
import notificationReducer from "./slices/notificationSlice";
import mlbReducer from "./slices/mlbSlice";
import socialReducer from "./slices/socialSlice";
import soccerReducer from "./slices/soccerSlice";
import contestReducer from "./slices/contestSlice";
import planReducer from "./slices/planSlice";

const appReducer = combineReducers({
	user: authReducer,
	group: groupsReducer,
	slip: slipReducer,
	pick: pickReduce,
	feed: feedReduce,
	nfl: nflReduce,
	nba: nbaReduce,
	ncaab: ncaabReducer,
	nhl: nhlReducer,
	progress: progressReducer,
	league: leaguesReducer,
	feedback: feedbackReducer,
	notifications: notificationReducer,
	mlb: mlbReducer,
	social: socialReducer,
	soccer: soccerReducer,
	contest: contestReducer,
	plan: planReducer,
});

export const rootReducer: Reducer = (state: ReturnType<typeof appReducer> | undefined, action: AnyAction) => {
	if (action.type === "user/logout") {
		// When logout is dispatched, reset state to undefined
		// This forces combineReducers to use the initial state for every slice
		state = undefined;
	}
	return appReducer(state, action);
};

export type RootReducer = ReturnType<typeof appReducer>;
