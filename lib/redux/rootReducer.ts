import { combineReducers } from "@reduxjs/toolkit";
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

export const rootReducer = combineReducers({
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
});

export type RootReducer = ReturnType<typeof rootReducer>;
