import {
  IMupLoad,
  IMupDiff,
  IPeriod,
  IMupEdit,
  ISelectionGroupToMupsData,
  ISelectionGroupData,
} from "../common/types";

import { checkDateIsLess } from "../utils/helpers";

import { createResultLoads, findLoadsToAdd } from "./actionCreater";

function findInitLimits(
  mupId: string,
  selectionGroupIds: number[],
  selectionGroupToMupsData: ISelectionGroupToMupsData
): (number | null)[] {
  const limits: (number | null)[] = [];
  selectionGroupIds.forEach((sgId) => {
    const groupMupsData = selectionGroupToMupsData.data[sgId];
    if (groupMupsData.data.hasOwnProperty(mupId)) {
      const limit = groupMupsData.data[mupId].limit;
      limits.push(limit);
    } else {
      limits.push(null);
    }
  });

  return limits;
}

function findCourseToCurrentPeriod(
  year: number,
  semesterId: number,
  periods: IPeriod[]
): { [key: number]: IPeriod } {
  let courseToCurrentPeriod: { [key: number]: IPeriod } = {};
  for (let period of periods) {
    if (period.year === year && period.semesterId === semesterId) {
      courseToCurrentPeriod[period.course] = period;
    }
  }

  return courseToCurrentPeriod;
}

function checkIfNeedChangeDates(
  courseToCurrentPeriod: { [key: number]: IPeriod },
  dates: [string, string]
): boolean {
  let changeDates = false;

  for (let course of [3, 4]) {
    if (
      courseToCurrentPeriod.hasOwnProperty(course) &&
      courseToCurrentPeriod[course]
    ) {
      const currentPeriod = courseToCurrentPeriod[course];

      if (
        currentPeriod.selectionBegin !== dates[0] ||
        currentPeriod.selectionDeadline !== dates[1]
      ) {
        changeDates = true;
      }
    }
  }
  return changeDates;
}

function CheckIfCanBeDeleted(
  courseToCurrentPeriod: { [key: number]: IPeriod },
  dates: [string, string]
): boolean {
  let canBeDeleted = true;

  for (let course of [3, 4]) {
    if (
      courseToCurrentPeriod.hasOwnProperty(course) &&
      courseToCurrentPeriod[course]
    ) {
      const currentPeriod = courseToCurrentPeriod[course];

      if (
        currentPeriod.selectionBegin &&
        checkDateIsLess(currentPeriod.selectionBegin, Date.now())
      ) {
        canBeDeleted = false;
      }
    }
  }
  return canBeDeleted;
}

export function createDiffForMup(
  mupId: string,
  selectionGroupIds: number[],
  dates: [string, string],
  selectionGroupToMupsData: ISelectionGroupToMupsData,
  selectionGroupData: ISelectionGroupData,
  mupToPeriods: { [key: string]: IPeriod[] }
): IMupDiff {
  let periods: IPeriod[] = [];
  if (mupToPeriods.hasOwnProperty(mupId)) {
    periods = mupToPeriods[mupId];
  }

  const limits = findInitLimits(
    mupId,
    selectionGroupIds,
    selectionGroupToMupsData
  );
  const presentInGroups: number[] = [];
  for (let i = 0; i < limits.length; i++) {
    if (limits[i] !== null) {
      presentInGroups.push(selectionGroupIds[i]);
    }
  }

  let courseToCurrentPeriod: { [key: number]: IPeriod } = {};
  if (
    selectionGroupIds.length > 0 &&
    selectionGroupData.data.hasOwnProperty(selectionGroupIds[0])
  ) {
    const selectionGroup = selectionGroupData.data[selectionGroupIds[0]];
    courseToCurrentPeriod = findCourseToCurrentPeriod(
      selectionGroup.year,
      selectionGroup.semesterId,
      periods
    );
  }

  let loads: IMupLoad[] = [];
  for (let period of periods) {
    if (period.loads.length > 0) {
      loads = period.loads;
      break;
    }
  }

  const needToChangeDates = checkIfNeedChangeDates(
    courseToCurrentPeriod,
    dates
  );

  const canBeDeleted = CheckIfCanBeDeleted(courseToCurrentPeriod, dates);

  const mupDiff: IMupDiff = {
    presentInGroups: presentInGroups,
    addLoadsManual: loads.length === 0,
    courseToCurrentPeriod: courseToCurrentPeriod,
    changeDates: needToChangeDates,
    initLimits: limits,
    canBeDeleted: canBeDeleted,
  };

  return mupDiff;
}

export function updateMupDiffDateInfo(
  mupDiff: IMupDiff,
  dates: [string, string]
) {
  let needToChangeDates = false;
  for (let course of [3, 4]) {
    if (
      mupDiff.courseToCurrentPeriod.hasOwnProperty(course) &&
      mupDiff.courseToCurrentPeriod[course]
    ) {
      const period = mupDiff.courseToCurrentPeriod[course];
      if (
        period.selectionBegin !== dates[0] ||
        period.selectionDeadline !== dates[1]
      ) {
        needToChangeDates = true;
      }
    }
  }
  console.log(needToChangeDates ? "CHANGE DATE" : "NOT CHANGE DATE");
  mupDiff.changeDates = needToChangeDates;
}
