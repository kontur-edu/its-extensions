import { IITSContext } from "../common/Context";
import { ISubgroup, ISubgroupInfo } from "../common/types";
import { ActionType, ITSAction } from "../common/actions";
import {IActionResponse} from "../utils/ITSApiService";

// Add loads for mup Period

// Change count of subgroups
// Create subgroups
// Copy Teachers from existing load_number
// https://its.urfu.ru/MUPItsSubgroup/Create?competitionGroupId=28
export class CreateSubgroupsAction extends ITSAction {
    constructor(public competitionGroupId: number) {
        super(ActionType.CreateSubgroups);
    }

    getMessage(): string {
        return `Create Subgroups for CompetitionGroupId: ${this.competitionGroupId}`;
    }

    async execute(context: IITSContext): Promise<IActionResponse> {
        return context.apiService.CreateSubgroups(this.competitionGroupId);
    }
}

export class UpdateSubgroupMetaLoadCountAction extends ITSAction {
    constructor(public subgroupMetaId: number, public newCount: number) {
        super(ActionType.UpdateSubgroupMetaLoadCount);
    }

    getMessage(): string {
        return `Update Subgroups Meta Load for subgroupMetaId: ${this.subgroupMetaId} newCount: ${this.newCount}`;
    }

    async execute(context: IITSContext): Promise<IActionResponse> {
        return context.apiService.UpdateSubgroupMetaLoadCount(this.subgroupMetaId, this.newCount);
    }
}

export class RefreshSubgroupsAction extends ITSAction {
    constructor(public competitionGroupIds: number[]) {
        super(ActionType.RefreshSubgroups);
    }

    getMessage(): string {
        const competitionGroupIdsStr = JSON.stringify(this.competitionGroupIds);
        return `Refresh Subgroups for subgroups: ${competitionGroupIdsStr}`;
    }

    async execute(context: IITSContext): Promise<IActionResponse> {
        await context.dataRepository.UpdateSubgroups(this.competitionGroupIds);
        return {success: true};
    }
}

export class UpdateTeacherForSubgroupAction extends ITSAction {
    constructor(
        public competitionGroupId: number,
        public subgroupInfo: ISubgroupInfo,
        public teacherId: string
    ) {
        super(ActionType.UpdateTeacherForSubgroup);
    }

    getMessage(): string {
        return `Update Teacher ${this.teacherId} for subgroup: mupName: ${this.subgroupInfo.mupName}
            load: ${this.subgroupInfo.load} number: ${this.subgroupInfo.number}
            (competitionGroupId: ${this.competitionGroupId})`;
    }

    async execute(context: IITSContext): Promise<IActionResponse> {
        const subgroupIds = context.dataRepository.competitionGroupToSubgroupIds[this.competitionGroupId];
        let subgroup: ISubgroup | null = null;
        for (let subgroupId of subgroupIds) {
            const sg = context.dataRepository.subgroupData.data[subgroupId];
            if (this.subgroupInfo.mupName === sg.mupName &&
                this.subgroupInfo.load === sg.load &&
                this.subgroupInfo.number === sg.number) {
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
            teacherId: this.teacherId
        };
        return context.apiService.UpdateSubgroup(updatedSubgroup);
    }
}