import { IITSContext } from "../common/Context";
import { ISubgroup, ISubgroupInfo, ISubgroupMeta } from "../common/types";
import { ActionType, ITSAction } from "../common/actions";
import { IActionResponse } from "../utils/ITSApiService";

export class CreateSubgroupsAction extends ITSAction {
  constructor(public competitionGroupId: number) {
    super(ActionType.CreateSubgroups);
  }

  getMessage(): string {
    return `Создать подгруппы для Конкурсной группы с id: ${this.competitionGroupId}`;
  }

  getMessageSimple(): string {
    return `Создать подгруппы для Конкурсной группы`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    return [await context.apiService.CreateSubgroups(this.competitionGroupId)];
  }
}

export class UpdateSubgroupMetaLoadCountAction extends ITSAction {
  constructor(
    public meta: ISubgroupMeta,
    public newCount: number,
    public mupName: string
  ) {
    super(ActionType.UpdateSubgroupMetaLoadCount);
  }

  getMessage(): string {
    return `Обновить количество подгрупп на ${this.newCount} для МУПа: "${this.meta.discipline}" нагрузки "${this.meta.load}"`;
  }

  getMessageSimple(): string {
    return this.getMessage();
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    return [
      await context.apiService.UpdateSubgroupMetaLoadCount(
        this.meta.id,
        this.newCount
      ),
    ];
  }
}

export class RefreshSubgroupsAction extends ITSAction {
  constructor(public competitionGroupIds: number[]) {
    super(ActionType.RefreshSubgroups);
  }

  getMessage(): string {
    const competitionGroupIdsStr = JSON.stringify(
      this.competitionGroupIds,
      null,
      2
    );
    return `Запросить обновление данных для Конкурсных групп: ${competitionGroupIdsStr}`;
  }

  getMessageSimple(): string {
    return this.getMessage();
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    await context.dataRepository.UpdateSubgroups(this.competitionGroupIds);
    return [{ success: true }];
  }
}

export class UpdateSubgroupAction extends ITSAction {
  constructor(
    public competitionGroupId: number,
    public subgroupInfo: ISubgroupInfo,
    public teacherId?: string,
    public limit?: number
  ) {
    super(ActionType.UpdateSubgroup);
  }

  getMessage(): string {
    const updates: string[] = [];
    if (this.teacherId !== undefined) {
      updates.push(`обновить преподавателя: "${this.teacherId}"`);
    }
    if (this.limit !== undefined) {
      updates.push(`обновить лимит: ${this.limit}`);
    }
    const updatesStr = updates.join(", ");
    return `Обновить подгруппу: ${updatesStr} для МУПа: ${this.subgroupInfo.mupName}
        нагрузки: ${this.subgroupInfo.load} с номером: ${this.subgroupInfo.number}
        (Конкурсная группа с id:${this.competitionGroupId})`;
  }

  getMessageSimple(): string {
    return this.getMessage();
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    const subgroupIds =
      context.dataRepository.competitionGroupToSubgroupIds[
        this.competitionGroupId
      ];
    let subgroup: ISubgroup | null = null;
    for (let subgroupId of subgroupIds) {
      const sg = context.dataRepository.subgroupData.data[subgroupId];
      if (
        this.subgroupInfo.mupName === sg.mupName &&
        this.subgroupInfo.load === sg.load &&
        this.subgroupInfo.number === sg.number
      ) {
        subgroup = sg;
        break;
      }
    }
    if (!subgroup) {
      throw Error(`Subgroup not found for mupName: ${this.subgroupInfo.mupName}
            load: ${this.subgroupInfo.load} number: ${this.subgroupInfo.number}
            (competitionGroupId: ${this.competitionGroupId})`);
    }
    const updatedSubgroup: ISubgroup = {
      ...subgroup,
    };
    if (this.teacherId !== undefined) {
      updatedSubgroup.teacherId = this.teacherId;
    }
    if (this.limit !== undefined) {
      updatedSubgroup.limit = this.limit;
    }
    return [await context.apiService.UpdateSubgroup(updatedSubgroup)];
  }
}
