import { IITSContext } from "../common/Context";
import { ISelectionGroup, IPeriod, IMupLoad, IPeriodTimeInfo } from "../common/types";
import { ActionType, ITSAction } from "../common/actions";
import {IActionResponse} from "../utils/ITSApiService";



export class DeleteSubgroupsAction extends ITSAction {
    constructor(public subgroupIds: number[]) {
        super(ActionType.DeleteSubgroupAction);
    }

    getMessage(): string {
        const subgroupIdsString = JSON.stringify(this.subgroupIds);
        return `Delete Subgroups ${subgroupIdsString}`;
    }

    async execute(context: IITSContext): Promise<IActionResponse> {
        return context.apiService.DeleteSubgroup(this.subgroupIds);
    }
}


export class UpdateSelectionGroupAction extends ITSAction {
    constructor(public selectionGroup: ISelectionGroup, public mupIds: string[]) {
        super(ActionType.UpdateSelectionGroup);
    }

    getMessage(): string {
        const mupIdsString = JSON.stringify(this.mupIds);
        return `Update SelectionGroup ${this.selectionGroup.id}
             (${this.selectionGroup.name}) set mupIds: ${mupIdsString}`;
    }

    async execute(context: IITSContext): Promise<IActionResponse> {
        return context.apiService.UpdateSelectionGroups(this.selectionGroup, this.mupIds);
    }
}

export class RefreshSelectionGroupsAction extends ITSAction {
    constructor(public selectionGroupIds: number[]) {
        super(ActionType.RefreshSelectionGroups);
    }

    getMessage(): string {
        const selectionGroupIdsString = JSON.stringify(this.selectionGroupIds);
        return `Refresh SelectionGroup data for selectionGroupIds: ${selectionGroupIdsString}`;
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

    getMessage(): string {
        const mupIdsString = JSON.stringify(this.mupIds);
        return `Refresh Periods data for mupIds: ${mupIdsString}`;
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

    getMessage(): string {
        return `Update Limit of MUP Id: ${this.mupId} new limit: ${this.limit} for Selection Group Id: ${this.selectionGroupId}`;
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

    getMessage(): string {
        return `Create Period: year: ${this.periodTimeInfo.year}
            semesterId: ${this.periodTimeInfo.semesterId}
            course: ${this.periodTimeInfo.course}
            mupId: ${this.mupId}`;
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

    getMessage(): string {
        return `Update Period for: year: ${this.periodTimeInfo.year}
            semesterId: ${this.periodTimeInfo.semesterId}
            course: ${this.periodTimeInfo.course}
            for mupId: ${this.mupId}
            set dates [${this.periodTimeInfo.dates[0]}] [${this.periodTimeInfo.dates[1]}]`;
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

    getMessage(): string {
        const loadsString = JSON.stringify(this.loads);
        return `Add Loads to Period: year: ${this.periodTimeInfo.year}
            semesterId: ${this.periodTimeInfo.semesterId}
            course: ${this.periodTimeInfo.course} 
            mupId: ${this.mupId} loads: ${loadsString}`;
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