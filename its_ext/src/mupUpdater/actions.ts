import { IITSContext } from "../common/Context";
import {
  ISelectionGroup,
  IPeriod,
  IMupLoad,
  IPeriodTimeInfo,
  IModuleSelection,
} from "../common/types";
import { ActionType, ITSAction } from "../common/actions";
import { IActionResponse } from "../utils/ITSApiService";

export class DeleteSubgroupsAction extends ITSAction {
  constructor(public subgroupIds: number[]) {
    super(ActionType.DeleteSubgroupAction);
  }

  getMessageSimple(): string {
    const subgroupIdsString = JSON.stringify(this.subgroupIds, null, 2);
    return `Удалить подгруппы со следующими id: ${subgroupIdsString}`;
  }

  getMessage(): string {
    const subgroupIdsString = JSON.stringify(this.subgroupIds, null, 2);
    return `Удалить подгруппы со следующими id: ${subgroupIdsString}`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    const res = await context.apiService.DeleteSubgroup(this.subgroupIds);
    return [res];
  }
}

export class UpdateSelectionGroupAction extends ITSAction {
  constructor(public selectionGroup: ISelectionGroup, public mupIds: string[]) {
    super(ActionType.UpdateSelectionGroup);
  }

  getMessageSimple(): string {
    const mupIdsString = this.mupIds.join(", ");
    return `Изменить состав Группы выбора: ${this.selectionGroup.name}
        (id: ${this.selectionGroup.id}) на идентификаторы МУПов: ${mupIdsString}`;
  }

  getMessage(): string {
    const mupIdsString = this.mupIds.join(", ");
    return `Изменить состав Группы выбора: ${this.selectionGroup.name}
             (id: ${this.selectionGroup.id}) на идентификаторы МУПов: ${mupIdsString}`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    const res = await context.apiService.UpdateSelectionGroups(
      this.selectionGroup,
      this.mupIds
    );
    return [res];
  }
}

export class RefreshSelectionGroupsAction extends ITSAction {
  constructor(public selectionGroupIds: number[]) {
    super(ActionType.RefreshSelectionGroups);
  }

  getMessageSimple(): string {
    return this.getMessage();
  }

  getMessage(): string {
    const selectionGroupIdsString = JSON.stringify(
      this.selectionGroupIds,
      null,
      2
    );
    return `Запросить обновленные данные для Групп выбора с id: ${selectionGroupIdsString}`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    await context.dataRepository.UpdateSelectionGroupToMupsData(
      this.selectionGroupIds
    );
    return [{ success: true }];
  }
}

export class RefreshPeriodsAction extends ITSAction {
  constructor(public mupIds: string[]) {
    super(ActionType.RefreshPeriods);
  }

  getMessageSimple(): string {
    return this.getMessage();
  }

  getMessage(): string {
    const mupIdsString = JSON.stringify(this.mupIds, null, 2);
    return `Запросить обновленные периода для МУПов с id: ${mupIdsString}`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    await context.dataRepository.UpdatePeriods(this.mupIds);
    return [{ success: true }];
  }
}

export class UpdateLimitAction extends ITSAction {
  constructor(
    public mupId: string,
    public selectionGroupId: number,
    public limit: number
  ) {
    super(ActionType.UpdateLimit);
  }

  getMessageSimple(): string {
    return `Обновить Лимит для группы с id ${this.selectionGroupId}`;
  }

  getMessage(): string {
    return `Обновить Лимит на ${this.limit} для МУПа с id: ${this.mupId} для Группы выбора с id: ${this.selectionGroupId}`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    const groupMups = context.dataRepository.selectionGroupToMupsData;
    if (!groupMups.data.hasOwnProperty(this.selectionGroupId)) {
      throw Error(
        `SelectionGroupId ${this.selectionGroupId} not found in SelectionGroupToMupsData in repository`
      );
    }
    const groupMupData = groupMups.data[this.selectionGroupId];
    if (!groupMupData.data.hasOwnProperty(this.mupId)) {
      throw Error(
        `MupId ${this.mupId} not found in SelectionGroupMupData in repository`
      );
    }
    const connectionId = groupMupData.data[this.mupId].connectionId;

    const res = await context.apiService.UpdateMupLimit(
      connectionId,
      this.limit
    );
    return [res];
  }
}

export class CreatePeriodAction extends ITSAction {
  constructor(public mupId: string, public periodTimeInfo: IPeriodTimeInfo) {
    super(ActionType.CreatePeriod);
  }

  getMessageSimple(): string {
    return `Создать период для курса: ${this.periodTimeInfo.course}`;
  }

  getMessage(): string {
    return `Создать период для МУПа с id: ${this.mupId}: Год: ${this.periodTimeInfo.year}
            Тип семестра: ${this.periodTimeInfo.semesterId}
            курс: ${this.periodTimeInfo.course}`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    const period: IPeriod = {
      id: -1,
      year: this.periodTimeInfo.year,
      semesterId: this.periodTimeInfo.semesterId,
      course: this.periodTimeInfo.course,
      selectionBegin: this.periodTimeInfo.dates[0],
      selectionDeadline: this.periodTimeInfo.dates[1],
      loads: [],
    };
    const res = await context.apiService.CreatePeriod(this.mupId, period);
    return [res];
  }
}

function findCurrentPeriod(
  periodTimeInfo: IPeriodTimeInfo,
  periods: IPeriod[]
): IPeriod | null {
  for (let period of periods) {
    if (
      period.course === periodTimeInfo.course &&
      period.year === periodTimeInfo.year &&
      period.semesterId === periodTimeInfo.semesterId
    ) {
      return period;
    }
  }
  return null;
}

export class UpdatePeriodAction extends ITSAction {
  constructor(public mupId: string, public periodTimeInfo: IPeriodTimeInfo) {
    super(ActionType.UpdatePeriod);
  }

  getMessageSimple(): string {
    return `Обновить перид для курса: ${this.periodTimeInfo.course}`;
  }

  getMessage(): string {
    return `Обновить перид для МУПа с id: ${this.mupId}:
            год: ${this.periodTimeInfo.year}
            семестр: ${this.periodTimeInfo.semesterId}
            курс: ${this.periodTimeInfo.course}
            даты выбора с [${this.periodTimeInfo.dates[0]}] по [${this.periodTimeInfo.dates[1]}]`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    if (!context.dataRepository.mupToPeriods.hasOwnProperty(this.mupId)) {
      throw Error("Mup not found in MupToPeriods in repository");
    }
    const periods = context.dataRepository.mupToPeriods[this.mupId];
    const period = findCurrentPeriod(this.periodTimeInfo, periods);
    if (!period) {
      const periodTimeInfoStr = JSON.stringify(this.periodTimeInfo, null, 2);
      throw Error(
        `Current period ${periodTimeInfoStr} not found for Mup in MupToPeriods in repository`
      );
    }
    const updatedPeriod: IPeriod = {
      ...period,
      selectionBegin: this.periodTimeInfo.dates[0],
      selectionDeadline: this.periodTimeInfo.dates[1],
    };

    const res = await context.apiService.UpdatePeriod(
      this.mupId,
      updatedPeriod
    );
    return [res];
  }
}

export class AddLoadsAction extends ITSAction {
  constructor(
    public mupId: string,
    public periodTimeInfo: IPeriodTimeInfo,
    public loads: IMupLoad[]
  ) {
    super(ActionType.AddLoads);
  }

  getMessageSimple(): string {
    const loadsString = JSON.stringify(
      this.loads.map((l) => `${l.name}`),
      null,
      2
    );
    return `Добавить нагрузки: ${loadsString}`;
  }

  getMessage(): string {
    const loadsString = JSON.stringify(
      this.loads.map((l) => `${l.name} (${l.kmer})`),
      null,
      2
    );
    return `Добавить нагрузки для МУПа с id: ${this.mupId}
            в период: год: ${this.periodTimeInfo.year}
            тип семестра: ${this.periodTimeInfo.semesterId}
            курс: ${this.periodTimeInfo.course} 
            нагрузки: ${loadsString}`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    if (!context.dataRepository.mupToPeriods.hasOwnProperty(this.mupId)) {
      throw Error(
        `MupId ${this.mupId} not found in MupToPeriods in repository`
      );
    }
    const periods = context.dataRepository.mupToPeriods[this.mupId];
    const period = findCurrentPeriod(this.periodTimeInfo, periods);
    if (!period) {
      const periodTimeInfoStr = JSON.stringify(this.periodTimeInfo, null, 2);
      throw Error(
        `Current period ${periodTimeInfoStr} not found for Mup in MupToPeriods in repository`
      );
    }

    const res: IActionResponse[] = [];
    for (let load of this.loads) {
      const ar: IActionResponse = { success: true, message: "" };
      const success = await context.apiService.AddLoadToPeriod(period.id, load);
      if (!success) {
        ar.success = false;
        ar.message = `Добавление  "${load.kmer}" к периоду с id: ${period.id}`;
      }
      res.push(ar);
    }

    return res;
  }
}

export class UpdateModulesAction extends ITSAction {
  constructor(
    public mupId: string,
    public selectionGroupId: number,
    public moduleSelections: IModuleSelection[]
  ) {
    super(ActionType.UpdateModules);
  }

  getMessageSimple(): string {
    return `Обновить модули-контейнеры для связи в Группе выбора с id: ${this.selectionGroupId}`;
  }

  getMessage(): string {
    const modulesStr = JSON.stringify(
      this.moduleSelections.filter((m) => m.selected.length > 0),
      null,
      2
    );
    return `Обновить модули-контейнеры связи МУПа с id: ${this.mupId} и Группы выбора с id: ${this.selectionGroupId} на ${modulesStr}`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    const groupMups = context.dataRepository.selectionGroupToMupsData;
    if (!groupMups.data.hasOwnProperty(this.selectionGroupId)) {
      throw Error(
        `SelectionGroupId ${this.selectionGroupId} not found in SelectionGroupToMupsData in repository`
      );
    }
    const groupMupData = groupMups.data[this.selectionGroupId];
    if (!groupMupData.data.hasOwnProperty(this.mupId)) {
      throw Error(
        `MupId ${this.mupId} not found in SelectionGroupMupData in repository`
      );
    }
    const connectionId = groupMupData.data[this.mupId].connectionId;

    const res = await context.apiService.UpdateSelectionGroupMupModules(
      connectionId,
      this.moduleSelections
    );
    return [res];
  }
}
