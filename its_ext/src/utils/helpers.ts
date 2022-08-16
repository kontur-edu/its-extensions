import {
  IMup,
  ISelectionGroupMup,
  ISelectionGroup,
  IMupData,
  ISelectionGroupData,
  ISelectionGroupMupData,
  ISelectionGroupToMupsData,
  ICompetitionGroup,
  ICompetitionGroupData,
} from "../common/types";
import { MAX_ASYNC_REQUEST_PER_BATCH } from "./constants";

export function prepareSelectionGroupData(
  selectionGroups: ISelectionGroup[]
): ISelectionGroupData {
  const result: ISelectionGroupData = {
    ids: [],
    data: {},
  };
  selectionGroups.forEach((selectionGroup) => {
    result.ids.push(selectionGroup.id);
    result.data[selectionGroup.id] = selectionGroup;
  });
  return result;
}

export function prepareMupData(mups: IMup[]): IMupData {
  const result: IMupData = {
    ids: [],
    data: {},
  };
  mups.forEach((mup) => {
    result.ids.push(mup.id);
    result.data[mup.id] = mup;
  });
  return result;
}

export function prepareCompetitionGroupData(
  competitionGroups: ICompetitionGroup[]
): ICompetitionGroupData {
  const result: ICompetitionGroupData = {
    ids: [],
    data: {},
  };
  competitionGroups.forEach((cg) => {
    result.ids.push(cg.id);
    result.data[cg.id] = cg;
  });
  return result;
}

export function prepareSelectionGroupMupData(
  selectionGroupMups: ISelectionGroupMup[]
): ISelectionGroupMupData {
  const result: ISelectionGroupMupData = {
    ids: [],
    data: {},
  };
  selectionGroupMups.forEach((selectionGroupMup) => {
    result.ids.push(selectionGroupMup.mupId);
    result.data[selectionGroupMup.mupId] = selectionGroupMup;
  });
  return result;
}

export function prepareSelectionGroupToMupsData(selectionGroupIdToSelectionGroupMups: {
  [key: number]: ISelectionGroupMupData;
}): ISelectionGroupToMupsData {
  const result: ISelectionGroupToMupsData = {
    ids: [],
    data: {},
  };
  for (let selectionGroupId in selectionGroupIdToSelectionGroupMups) {
    const id = Number(selectionGroupId);
    result.ids.push(id);
    result.data[id] = selectionGroupIdToSelectionGroupMups[selectionGroupId];
  }

  return result;
}

export function unionArrays<T>(arr1: T[], arr2: T[]): T[] {
  const result: T[] = [];
  const unionSet = new Set<T>([...arr1, ...arr2]);
  unionSet.forEach((item) => result.push(item));
  return result;
}

export function mupExistsInAnySelectionGroups(
  mupId: number,
  selectionGroupIds: number[],
  selectionGroupToMupsData: ISelectionGroupToMupsData
) {
  for (let selectionGroupId of selectionGroupIds) {
    if (
      selectionGroupToMupsData.data[selectionGroupId].data.hasOwnProperty(mupId)
    ) {
      return true;
    }
  }
  return false;
}

export function formatDate(date: Date) {
  let mm = date.getMonth() + 1;
  let dd = date.getDate();

  return [
    date.getFullYear(),
    (mm > 9 ? "" : "0") + mm,
    (dd > 9 ? "" : "0") + dd,
  ].join("-");
}

export function reformatItsDate(itsDate: string) {
  if (!itsDate) return "";
  const dateParts = itsDate.split(".");
  if (dateParts.length !== 3) return "";
  const date = new Date([dateParts[1], dateParts[0], dateParts[2]].join(" "));
  let mm = date.getMonth() + 1;
  let dd = date.getDate();

  return [
    date.getFullYear(),
    (mm > 9 ? "" : "0") + mm,
    (dd > 9 ? "" : "0") + dd,
  ].join("-");
}

export function checkDateIsLess(dateStr: string, timeStamp: number) {
  // return parseDate(dateStr).getTime() < timeStamp;
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < timeStamp;
}

export function createDebouncedWrapper(ms: number) {
  let timeoutId: number | null = null;

  return (func: () => any, newMs?: number) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      func();
      timeoutId = null;
    }, newMs || ms);
  };
}

export function downloadFileFromText(
  filename: string,
  text: string,
  mimeType: string = "application/json;charset=utf-8"
) {
  let element = document.createElement("a");
  element.setAttribute("href", `data:${mimeType},` + encodeURIComponent(text));
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

export function paginate(arr: Array<any>, size: number) {
  return arr.reduce((acc, val, i) => {
    let idx = Math.floor(i / size);
    let page = acc[idx] || (acc[idx] = []);
    page.push(val);
    return acc;
  }, []);
}

export async function createPromisesAndWaitAllPaginated<T>(
  arr: Array<T>,
  func: (v: T) => Promise<any>,
  size: number = MAX_ASYNC_REQUEST_PER_BATCH
) {
  const pages = paginate(arr, size);
  const pagesSettled: PromiseSettledResult<any>[][] = [];
  for (const page of pages) {
    const pageSettled = await Promise.allSettled(page.map(func));
    pagesSettled.push(pageSettled);
  }
  return pagesSettled.flat();
}

export function waitPromise(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getNextDelay(ms: number) {
  if (ms === 0) {
    return 750 + getRandomInt(500);
  }
  return ms * 2;
}

export function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}

export function isLocalAddress(ipAddress: string) {
  return ipAddress === "localhost" || ipAddress === "127.0.0.1";
}
