import {
    IMupData,
    ISelectionGroupData,
    ISelectionGroupMupData,
    ISelectionGroupToMupsData,
    IMupToPeriods,
    ICompetitionGroupToSubgroupMetas,
    ISubgroupData,
    ICompetitionGroupToSubgroupIds,

    ICompetitionGroup,
    ICompetitionGroupData,
    IStudentData,
    AdmissionInfo,
    IAdmissionMeta,
    CompetitionGroupIdToMupAdmissions,
    MupIdToAdmissionId,
    IStudent,
    IStudentAdmission,
    IStudentAdmissionRaw,
} from "../common/types";

import { ITSApiService } from "./ITSApiService";

import {
    PrepareSelectionGroupData,
    PrepareMupData,
    PrepareSelectionGroupMupData,
    PrepareSelectionGroupToMupsData,
    PrepareCompetitionGroupData,
} from "../utils/helpers";



export class ITSRepository {
    mupData: IMupData = {ids: [], data: {}};
    selectionGroupData: ISelectionGroupData = {ids: [], data: {}};
    selectionGroupToMupsData: ISelectionGroupToMupsData = {ids: [], data: {}};
    mupToPeriods: IMupToPeriods = {};
    competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas = {};
    // competitionGroupToSubgroups: ICompetitionGroupToSubgroups = {};
    subgroupData: ISubgroupData = {data: {}};
    competitionGroupToSubgroupIds: ICompetitionGroupToSubgroupIds = {};
    competitionGroupData: ICompetitionGroupData = {ids: [], data: {}};
    
    studentData: IStudentData = {ids: [], data: {}};
    competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions = {};
    admissionInfo: AdmissionInfo = {};

    constructor(public api: ITSApiService) {

    }

    async UpdateMupData() {
        console.log(`ITSRepository: UpdateMupData`);
        const allMups = await this.api.GetAllMups();
        this.mupData = PrepareMupData(allMups);
    }

    async UpdateSelectionGroupData() {
        console.log(`ITSRepository: UpdateSelectionGroupData`);
        const allSelectionGroups = await this.api.GetAllSelectionGroupsParallel();
        this.selectionGroupData = PrepareSelectionGroupData(allSelectionGroups);
    }

    async UpdateSelectionGroupToMupsData(selectionGroupIds: number[]) {
        console.log(`ITSRepository: UpdateSelectionGroupToMupsData ${selectionGroupIds}`);
        const selectionGroupIdToSelectionGroupMups: {[key: number]: ISelectionGroupMupData} = {};
        const requests = selectionGroupIds.map(selectionGroupId => this.api.GetSelectionGroupMups(selectionGroupId));
        const responses = await Promise.allSettled(requests);
        for (let i = 0; i < selectionGroupIds.length; i++) {
            const resp = responses[i];
            const selectionGroupId = selectionGroupIds[i];
            if (resp.status === 'fulfilled') {
                const selectionGroupMupData = PrepareSelectionGroupMupData(resp.value);
                selectionGroupIdToSelectionGroupMups[selectionGroupId] = selectionGroupMupData;
            } else {
                console.error(`Failed to request SelectionGroupMupData for selectionGroupId: ${selectionGroupId}`);
            }
        }
        this.selectionGroupToMupsData = PrepareSelectionGroupToMupsData(selectionGroupIdToSelectionGroupMups);
    }


    async UpdatePeriods(mupIds: string[]) {
        console.log(`ITSRepository: UpdatePeriods ${mupIds}`);
        const requests = mupIds.map(mupId => this.api.GetPeriods(mupId));
        const responses = await Promise.allSettled(requests);
        for (let i = 0; i < mupIds.length; i++) {
            const mupId = mupIds[i];
            const resp = responses[i];
            if (resp.status === 'fulfilled') {
                this.mupToPeriods[mupId] = resp.value;
            } else {
                console.error(`Failed to request Periods for mupId: ${mupId}`);
            }
        }
    }

    async EnsurePeriodInfoFor(mupId: string) {
        console.log(`ITSRepository: AddPeriodInfoFor ${mupId}`);
        if (this.mupToPeriods.hasOwnProperty(mupId)) return;

        this.mupToPeriods[mupId] = [];
        const periods = await this.api.GetPeriods(mupId);
        this.mupToPeriods[mupId] = periods;
    }


    async UpdateSubgroupMetas(competitionGroupIds: number[]) {
        console.log(`ITSRepository: UpdateSubgroupMetas`);
        const requests = competitionGroupIds.map(competitionGroupId => this.api.GetSubgroupMetas(competitionGroupId));
        const responses = await Promise.allSettled(requests);
        for (let i = 0; i < competitionGroupIds.length; i++) {
            const competitionGroupId = competitionGroupIds[i];
            const resp = responses[i];
            if (resp.status === 'fulfilled') {
                this.competitionGroupToSubgroupMetas[competitionGroupId] = resp.value;
            } else {
                console.error(`Failed to request SubgroupMeta for competitionGroupId: ${competitionGroupId}`);
            }
        }
    }


    async UpdateSubgroups(competitionGroupIds: number[]) {
        console.log(`ITSRepository: UpdateSubgoups`);
        const requests = competitionGroupIds.map(competitionGroupId => this.api.GetSubgroups(competitionGroupId));
        const responses = await Promise.allSettled(requests);
        for (let i = 0; i < competitionGroupIds.length; i++) {
            const competitionGroupId = competitionGroupIds[i];
            const resp = responses[i];
            if (resp.status === 'fulfilled') {
                const subgroupIds: number[] = [];
                for (let subgroup of resp.value) {
                    subgroupIds.push(subgroup.id);
                    this.subgroupData.data[subgroup.id] = subgroup;
                }

                this.competitionGroupToSubgroupIds[competitionGroupId] = subgroupIds;
            } else {
                console.error(`Failed to request Subgroups for competitionGroupId: ${competitionGroupId}`);
            }
        }
    }

    async UpdateCompetitionGroupData() {
        console.log(`ITSRepository: UpdateCompetitionGroupData`);
        const competitionGroups = await this.api.GetCompetitionGroups();
        this.competitionGroupData = PrepareCompetitionGroupData(competitionGroups);
    }

    async UpdateAdmissionMetas(competitionGroupIds: number[]) {
        console.log(`ITSRepository: UpdateAdmissionMetas`);
        const requests = competitionGroupIds.map(cgId => this.api.GetStudentAdmissionMetas(cgId));
        const responses = await Promise.allSettled(requests);
        for (let i = 0; i < competitionGroupIds.length; i++) {
            const resp = responses[i];
            const competitionGroupId = competitionGroupIds[i];
            const mupIdToAdmissionId: MupIdToAdmissionId = {};
            if (resp.status === 'fulfilled') {
                for (const admissionMeta of resp.value) {
                    mupIdToAdmissionId[admissionMeta.mupId] = admissionMeta.admissionsId;
                }
            }

            this.competitionGroupIdToMupAdmissions[competitionGroupId] = mupIdToAdmissionId;
        }
    }

    
    fillStudentRawInfoToStudentDataAndAdmissionInfo(
        admissionId: number,
        studentsRaw: IStudentAdmissionRaw[]
    ) {
        const studentAdmissionInfo: {[key: string]: IStudentAdmission} = {};
        for (const studentRaw of studentsRaw) {
            if (!this.studentData.data.hasOwnProperty(studentRaw.personalNumber)) {
                this.studentData.ids.push(studentRaw.personalNumber);
            }

            const student: IStudent = {
                personalNumber: studentRaw.personalNumber,
                surname: studentRaw.surname,
                firstname: studentRaw.firstname,
                patronymic: studentRaw.patronymic,
                rating: studentRaw.rating,
                status: studentRaw.status,
                groupName: studentRaw.groupName,
            };

            this.studentData.data[studentRaw.personalNumber] = student;

            // TODO: add student meta
            const studentAdmission: IStudentAdmission = {
                id: studentRaw.id,
                // personalNumber: studentRaw.personalNumber,
                // mupId: admissionMeta.mupId,
                priority: studentRaw.priority,
                testResult: studentRaw.testResult,
            };

            studentAdmissionInfo[studentRaw.personalNumber] = studentAdmission;
        }

        this.admissionInfo[admissionId] = studentAdmissionInfo;
    }

    async UpdateStudentAdmissionsAndStudentData(admissionIds: number[]) {
        console.log(`ITSRepository: UpdateStudentAdmissionsAndStudentData`);

        const requests = admissionIds.map(aId => this.api.GetStudentsForAdmission(aId));
        const responses = await Promise.allSettled(requests);
        for (let i = 0; i < admissionIds.length; i++) {
            const resp = responses[i];
            const admissionId = admissionIds[i];
            if (resp.status === 'fulfilled') {
                // console.log("StudentAdmissions");
                // console.log(resp.value);
                this.fillStudentRawInfoToStudentDataAndAdmissionInfo(
                    admissionId, resp.value
                );
            }
        }
    }
}