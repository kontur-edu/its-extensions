import { IITSContext } from "../common/Context";
import { ISelectionGroup, IPeriod, IMupLoad, IPeriodTimeInfo } from "../common/types";
import { ActionType, ITSAction } from "../common/actions";
import {IActionResponse} from "../utils/ITSApiService";



export class DeleteSubgroupsAction extends ITSAction {
    constructor(public subgroupIds: number[]) {
        super(ActionType.DeleteSubgroupAction);
    }

    getMessageSimple(): string {
        const subgroupIdsString = JSON.stringify(this.subgroupIds);
        return `Удалить подгруппы со следующими id: ${subgroupIdsString}`;
    }

    getMessage(): string {
        const subgroupIdsString = JSON.stringify(this.subgroupIds);
        return `Удалить подгруппы со следующими id: ${subgroupIdsString}`;
    }

    async execute(context: IITSContext): Promise<IActionResponse> {
        return context.apiService.DeleteSubgroup(this.subgroupIds);
    }
}


export class UpdateSelectionGroupAction extends ITSAction {
    constructor(public selectionGroup: ISelectionGroup, public mupIds: string[]) {
        super(ActionType.UpdateSelectionGroup);
    }

    getMessageSimple(): string {
        const mupIdsString = this.mupIds.join(', ');
        return `Изменить состав Группы выбора: ${this.selectionGroup.name}
        (id: ${this.selectionGroup.id}) на идентификаторы МУПов: ${mupIdsString}`;
    }

    getMessage(): string {
        const mupIdsString = this.mupIds.join(', ');
        return `Изменить состав Группы выбора: ${this.selectionGroup.name}
             (id: ${this.selectionGroup.id}) на идентификаторы МУПов: ${mupIdsString}`;
    }

    async execute(context: IITSContext): Promise<IActionResponse> {
        return context.apiService.UpdateSelectionGroups(this.selectionGroup, this.mupIds);
    }
}

export class RefreshSelectionGroupsAction extends ITSAction {
    constructor(public selectionGroupIds: number[]) {
        super(ActionType.RefreshSelectionGroups);
    }

    getMessageSimple(): string {
        const selectionGroupIdsString = JSON.stringify(this.selectionGroupIds);
        return `Запросить обновленные данные для Групп выбора с id: ${selectionGroupIdsString}`;
    }

    getMessage(): string {
        const selectionGroupIdsString = JSON.stringify(this.selectionGroupIds);
        return `Запросить обновленные данные для Групп выбора с id: ${selectionGroupIdsString}`;
    }

    async execute(context: IITSContext): Promise<IActionResponse> {
        await context.dataRepository.UpdateSelectionGroupToMupsData(this.selectionGroupIds);
        return {success: true};
    }
}

export class RefreshPeriodsAction extends ITSAction {
    constructor(public mupIds: string[]) {
        super(ActionType.RefreshPeriods);
    }

    getMessageSimple(): string {
        const mupIdsString = JSON.stringify(this.mupIds);
        return `Обновить период для МУПов с id: ${mupIdsString}`;
    }

    getMessage(): string {
        const mupIdsString = JSON.stringify(this.mupIds);
        return `Обновить период для МУПов с id: ${mupIdsString}`;
    }

    async execute(context: IITSContext): Promise<IActionResponse> {
        await context.dataRepository.UpdatePeriods(this.mupIds);
        return {success: true};
    }
}

export class UpdateLimitAction extends ITSAction {
    constructor(public mupId: string, public selectionGroupId: number, public limit: number) {
        super(ActionType.UpdateLimit);
    }

    getMessageSimple(): string {
        return `Обновить Лимит для группы с id ${this.selectionGroupId}`;
    }

    getMessage(): string {
        return `Обновить Лимит на ${this.limit} для МУПа с id: ${this.mupId} для Группы выбора с id: ${this.selectionGroupId}`;
    }

    async execute(context: IITSContext): Promise<IActionResponse> {
        const groupMups = context.dataRepository.selectionGroupToMupsData;
        if (!groupMups.data.hasOwnProperty(this.selectionGroupId)) {
            throw Error(`SelectionGroupId ${this.selectionGroupId} not found in SelectionGroupToMupsData in repository`);
        }
        const groupMupData = groupMups.data[this.selectionGroupId];
        if (!groupMupData.data.hasOwnProperty(this.mupId)) {
            throw Error(`MupId ${this.mupId} not found in SelectionGroupMupData in repository`);
        }
        const connectionId = groupMupData.data[this.mupId].connectionId;

        return context.apiService.UpdateMupLimit(connectionId, this.limit);
    }
}


export class CreatePeriodAction extends ITSAction {
    constructor(
        public mupId: string,
        public periodTimeInfo: IPeriodTimeInfo
    ) {
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

    async execute(context: IITSContext): Promise<IActionResponse> {
        const period: IPeriod = {
            id: -1,
            year: this.periodTimeInfo.year,
            semesterId: this.periodTimeInfo.semesterId,
            course: this.periodTimeInfo.course,
            selectionBegin: this.periodTimeInfo.dates[0],
            selectionDeadline: this.periodTimeInfo.dates[1],
            loads: [] 
        };
        return context.apiService.CreatePeriod(this.mupId, period);
    }
}


function findCurrentPeriod(
    periodTimeInfo: IPeriodTimeInfo,
    periods: IPeriod[]
): IPeriod | null {
    for (let period of periods) {
        if (period.course === periodTimeInfo.course &&
            period.year === periodTimeInfo.year &&
            period.semesterId === periodTimeInfo.semesterId) {
         
            return period;
        }
    }
    return null;
}


// TODO: Update MupToPeriods before call execute
export class UpdatePeriodAction extends ITSAction {
    constructor(
        public mupId: string,
        public periodTimeInfo: IPeriodTimeInfo,
    ) {
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

    async execute(context: IITSContext): Promise<IActionResponse> {
        if (!context.dataRepository.mupToPeriods.hasOwnProperty(this.mupId)) {
            throw Error("Mup not found in MupToPeriods in repository");
        }
        const periods = context.dataRepository.mupToPeriods[this.mupId];
        const period = findCurrentPeriod(this.periodTimeInfo, periods);
        if (!period) {
            const periodTimeInfoStr = JSON.stringify(this.periodTimeInfo);
            throw Error(`Current period ${periodTimeInfoStr} not found for Mup in MupToPeriods in repository`);
        }
        const updatedPeriod: IPeriod = {
            ...period,
            selectionBegin: this.periodTimeInfo.dates[0],
            selectionDeadline: this.periodTimeInfo.dates[1]
        };

        return context.apiService.UpdatePeriod(this.mupId, updatedPeriod);
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
        const loadsString = JSON.stringify(this.loads.map(l => `${l.name}`));
        return `Добавить нагрузки: ${loadsString}`;
    }

    getMessage(): string {
        const loadsString = JSON.stringify(this.loads.map(l => `${l.name} (${l.kmer})`));
        return `Добавить нагрузки для МУПа с id: ${this.mupId}
            в период: год: ${this.periodTimeInfo.year}
            тип семестра: ${this.periodTimeInfo.semesterId}
            курс: ${this.periodTimeInfo.course} 
            нагрузки: ${loadsString}`;
    }

    async execute(context: IITSContext): Promise<IActionResponse> {
        if (!context.dataRepository.mupToPeriods.hasOwnProperty(this.mupId)) {
            throw Error(`MupId ${this.mupId} not found in MupToPeriods in repository`);
        }
        const periods = context.dataRepository.mupToPeriods[this.mupId];
        const period = findCurrentPeriod(this.periodTimeInfo, periods);
        if (!period) {
            const periodTimeInfoStr = JSON.stringify(this.periodTimeInfo);
            throw Error(`Current period ${periodTimeInfoStr} not found for Mup in MupToPeriods in repository`);
        }

        const res: IActionResponse = {success: true, message: ""};
        for (let load of this.loads) {
            const success = await context.apiService.AddLoadToPeriod(period.id, load);
            if (!success) {
                res.success = false;
                res.message += `Could not add load "${load.kmer}" to period id: ${period.id}`
            }
        }

        return res;
    }
}