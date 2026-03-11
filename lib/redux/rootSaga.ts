import { all, fork } from "redux-saga/effects";
import authSaga from "./sagas/authSaga";
import groupsSaga from "./sagas/groupsSaga";
import slipSaga from "./sagas/slipSaga";
import pickSaga from "./sagas/pickSaga";
import activitySaga from "./sagas/activitySaga";
import nflSaga from "./sagas/nflSaga";
import nbaSaga from "./sagas/nbaSaga";
import progressSaga from "./sagas/progressSaga";
import ncaabSaga from "./sagas/ncaabSaga";
import nhlSaga from "./sagas/nhlSaga";
import leagueSaga from "./sagas/leagueSaga";

export default function* rootSaga() {
	yield all([
		fork(authSaga),
		fork(groupsSaga),
		fork(slipSaga),
		fork(pickSaga),
		fork(activitySaga),
		fork(nflSaga),
		fork(nbaSaga),
		fork(ncaabSaga),
		fork(nhlSaga),
		fork(progressSaga),
		fork(leagueSaga),
	]);
}


