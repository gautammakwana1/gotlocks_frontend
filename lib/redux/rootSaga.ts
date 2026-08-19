import { all, fork } from "redux-saga/effects";
import authSaga from "./sagas/authSaga";
import groupSaga from "./sagas/groupsSaga";
import slipSaga from "./sagas/slipSaga";
import pickSaga from "./sagas/pickSaga";
import activitySaga from "./sagas/activitySaga";
import nflSaga from "./sagas/nflSaga";
import nbaSaga from "./sagas/nbaSaga";
import progressSaga from "./sagas/progressSaga";
import ncaabSaga from "./sagas/ncaabSaga";
import nhlSaga from "./sagas/nhlSaga";
import leagueSaga from "./sagas/leagueSaga";
import feedbackSaga from "./sagas/feedbackSaga";
import notificationSaga from "./sagas/notificationSaga";
import mlbSaga from "./sagas/mlbSaga";
import socialSaga from "./sagas/socialSaga";
import soccerSaga from "./sagas/soccerSaga";
import contestSaga from "./sagas/contestSaga";
import planSaga from "./sagas/planSaga";
import arenaSaga from "./sagas/arenaSaga";
import feedContestSaga from "./sagas/feedContestSaga";
import feedContestScheduleSaga from "./sagas/feedContestScheduleSaga";
import feedContestOddsSaga from "./sagas/feedContestOddsSaga";
import pickemMoneylineSaga from "./sagas/pickemMoneylineSaga";
import tdScorersSaga from "./sagas/tdScorersSaga";
import memberCardSaga from "./sagas/memberCardSaga";
import venueSaga from "./sagas/venueSaga";

export default function* rootSaga() {
	yield all([
		fork(authSaga),
		fork(groupSaga),
		fork(slipSaga),
		fork(pickSaga),
		fork(activitySaga),
		fork(nflSaga),
		fork(nbaSaga),
		fork(ncaabSaga),
		fork(nhlSaga),
		fork(progressSaga),
		fork(leagueSaga),
		fork(feedbackSaga),
		fork(notificationSaga),
		fork(mlbSaga),
		fork(socialSaga),
		fork(soccerSaga),
		fork(contestSaga),
		fork(planSaga),
		fork(arenaSaga),
		fork(feedContestSaga),
		fork(feedContestScheduleSaga),
		fork(feedContestOddsSaga),
		fork(pickemMoneylineSaga),
		fork(tdScorersSaga),
		fork(memberCardSaga),
		fork(venueSaga),
	]);
}
