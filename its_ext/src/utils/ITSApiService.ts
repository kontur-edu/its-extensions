import { RequestService } from "./requestService";
import {
    ISelectionGroup,
    IEduSpace,
    IMup,
    ISelectionGroupMup,
    IPeriod,
    IMupLoad,
    ISubgroupMeta,
    ISubgroup,
    ICompetitionGroup,
    IAdmissionMeta,
    IStudentAdmissionRaw,
} from "../common/types";

import {
    EDU_SPACES_MAX_COUNT,
    MUPS_MAX_COUNT,
    PERIOD_MAX_COUNT,
    COMPETITION_GROUP_MAX_COUNT,
    STUDENT_ADMISSIONS_MAX_COUNT,
} from "./constants";
import { reformatItsDate } from "./helpers";


export interface IActionResponse {
    success: boolean;
    message?: string;
}


export class ITSApiService {
    constructor(public requestService: RequestService) {

    }

    async GetSelectionGroupsForEduSpace(eduSpaceId: number): Promise<ISelectionGroup[]> {
        const url = `https://its.urfu.ru/EduSpace/SelectionGroups?id=${eduSpaceId}&page=1&start=0&limit=${EDU_SPACES_MAX_COUNT}`;
        const res = await this.requestService.GetJson(url)
        return res.map((obj: any) => {
            const selectionGroup: ISelectionGroup = {
                id: obj["Id"],
                name: obj["Name"],
                year: obj["Year"],
                semesterId: obj["SemesterId"],
                eduSpaceId: obj["EduSpaceId"],
                unitSum: obj["UnitsSum"],
                byPriority: obj["ByPriority"],
                competitionGroupId: obj["CompetitionGroupId"],
                competitionGroupName: obj["CompetitionGroup"] ?? '',
            };
            return selectionGroup;
        });
    }
    
    // async GetAllSelectionGroups(): Promise<ISelectionGroup[]> {
    //     const eduSpaces = await this.GetAllEduSpaces();
    //     const result: ISelectionGroup[] = [];
    //     for (let eduSpace of eduSpaces) {
    //         const selectionGroups = await this.GetSelectionGroupsForEduSpace(eduSpace.id);
    //         result.push(...selectionGroups);
    //     }
    //     return result;
    // }

    async GetAllSelectionGroupsParallel(): Promise<ISelectionGroup[]> {
        const eduSpaces = await this.GetAllEduSpaces();
        const requests: Promise<ISelectionGroup[]>[] = eduSpaces.map(eduSpace => this.GetSelectionGroupsForEduSpace(eduSpace.id));
        const responses = await Promise.allSettled(requests);
        const result: ISelectionGroup[] = [];
        for (let resp of responses) {
            if (resp.status === 'fulfilled') {
                result.push(...resp.value);
            }
        }
        return result;
    }
    
    async GetAllEduSpaces(): Promise<IEduSpace[]> {
        const url = `https://its.urfu.ru/EduSpace`;
        const res = await this.requestService.GetJson(url)
        return res.map((obj: any) => {
            return {id: obj["Id"], name: obj["Name"]};
        });
    }
    
    async GetAllMups(): Promise<IMup[]> {
        const url = `https://its.urfu.ru/MUP/Index?page=1&start=0&limit=${MUPS_MAX_COUNT}`;
        const res = await this.requestService.GetJson(url)
        return res.map((obj: any) => {
            return {id: obj["id"], name: obj["title"]};
        });
    }
    
    async GetSelectionGroupMups(selectionGroupId: number): Promise<ISelectionGroupMup[]> {
        const url = `https://its.urfu.ru/EduSpace/SelectionGroupContent?id=${selectionGroupId}&page=1&start=0&limit=${MUPS_MAX_COUNT}`;
        const res = await this.requestService.GetJson(url)
        return res.map((obj: any) => {
            return {
                connectionId: obj["connectionId"],
                limit: obj["limit"],
                mupId: obj["uuid"],
            };
        });
    }
    
    async GetPeriods(mupId: string): Promise<IPeriod[]> {
        const url = `https://its.urfu.ru/MUP/Periods/${mupId}?page=1&start=0&limit=${PERIOD_MAX_COUNT}`;
        const res = await this.requestService.GetJson(url);
        console.log("GetPeriods");
        console.log(res);
        return res.map((obj: any) => {
            const loads: IMupLoad[] = obj["Tmers"].map((tmer: any) => {
                return {
                    id: tmer["id"],
                    name: tmer["rmer"],
                    kmer: tmer["kmer"],
                };
            });
            const startDate = reformatItsDate(obj["SelectionBegin"]);
            const endDate = reformatItsDate(obj["SelectionDeadline"]);
            return {
                id: obj["Id"],
                year: obj["Year"],
                semesterId: obj["SemesterId"],
                course: obj["Course"],
                selectionBegin: startDate,
                selectionDeadline: endDate,
                loads: loads,
            };
        });
    }
    
    
    async CheckRemovedMUPs(selectionGroupId: number): Promise<IActionResponse> {
        const url = "https://its.urfu.ru/EduSpace/CheckRemovedMUPs";
        const data = {
            Id: selectionGroupId
        };
        const result = await this.requestService.PostFormData(url, data);
        return result;
    }
    
    async UpdateSelectionGroups(
        selectionGroup: ISelectionGroup,
        mupIds: string[]
    ): Promise<IActionResponse> {
        const url = "https://its.urfu.ru/EduSpace/UpdateSelectionGroup";
        const competitionGroupId = selectionGroup.competitionGroupId ?? '';
        const data = {
            Id: selectionGroup.id,
            EduSpaceId: selectionGroup.eduSpaceId,
            Name: selectionGroup.name,
            UnitsSum: selectionGroup.unitSum,
            ByPriority: selectionGroup.byPriority ? 'true' : 'false',
            CompetitionGroupId: competitionGroupId,
            MUPItsIds: mupIds,
        };
        console.log("UpdateSelectionGroups");
        console.log(data);
        if (data.EduSpaceId !== 14) {
            const message = `Not test EduSpace id: ${data.EduSpaceId}`;
            alert(message);
            return {success: false, message};
        }
        if (selectionGroup.name !== "TestGroup1" &&
            selectionGroup.name !== "TestGroup2") {
                const message = `Not test selection group ${selectionGroup.id} ${selectionGroup.name}`;
                alert(message);
                return {success: false, message};
        }
        const result = await this.requestService.PostFormData(url, data);
        return result;
    }
    
    
    async AddLoadToPeriod(
        periodId: number, load: IMupLoad
    ): Promise<IActionResponse> {
        const url = "https://its.urfu.ru/MUP/AddTmer";
    
        const data = {
            id: periodId,
            kmer: load.kmer,
        };
    
        if (periodId !== 102 && periodId !== 103) {
            const message = `Not test Period periodId: ${periodId}`;
            alert(message);
            return {success: false, message};
        }
    
        const result = await this.requestService.PostFormData(url, data);
        return result;
    }
    
    // NOTE: will not be needed
    async RemoveLoadToPeriod(
        periodId: number, load: IMupLoad
    ): Promise<IActionResponse> {
        const url = "https://its.urfu.ru/MUP/DeleteTmer";
    
        const data = {
            id: periodId,
            kmer: load.kmer,
        };
    
        if (periodId !== 102 && periodId !== 103) {
            const message = `Not test Period periodId: ${periodId}`;
            alert(message);
            return {success: false, message};
        }
        
        const result = await this.requestService.PostFormData(url, data);
        return result;
    }
    
    
    async CreatePeriod(mupId: string, period: IPeriod): Promise<IActionResponse> {
        const url = "https://its.urfu.ru/MUP/CreatePeriod";
    
        const data = {
            Id: '',
            MUPItsId: mupId,
            Year: period.year,
            SemesterId: period.semesterId,
            Course: period.course,
            SelectionBegin: period.selectionBegin,
            SelectionDeadline: period.selectionDeadline, 
        };
        const message = `Tried to create period: ${JSON.stringify(data)}`;
        alert(message);
        return {success: false, message};
    
        // const result = await PostFormData(url, data);
        // return result.success;
    }
    
    async UpdatePeriod(mupId: string, period: IPeriod): Promise<IActionResponse> {
        const url = "https://its.urfu.ru/MUP/UpdatePeriod";
    
        const data = {
            Id: period.id,
            MUPItsId: mupId,
            Year: period.year,
            SemesterId: period.semesterId,
            Course: period.course,
            SelectionBegin: period.selectionBegin,
            SelectionDeadline: period.selectionDeadline, 
        };

        if (period.id !== 102 && period.id !== 103) {
            const message = `Tried to update not test period: ${JSON.stringify(data)}`;
            alert(message);
            return {success: false, message};
        }

        const result = await this.requestService.PostFormData(url, data);
        return result;
    }
    
    // DANGER: probably no body from response
    // TODO: (fix proxy)
    async UpdateMupLimit(connectionId: number, limit: number): Promise<IActionResponse> {
        const url = "https://its.urfu.ru/EduSpace/UpdateLimit";
    
        const data = {
            id: connectionId,
            limit: limit,
        };
    
        if (connectionId < 124) {
            const message = `Tried to update limit for not test connectionId: ${connectionId}`;
            alert(message);
            return {success: false, message};
        }
    
        const result = await this.requestService.PostFormData(url, data, 'text');
        const success = result === '';
        return {success};
    }

    async GetSubgroupMetas(competitionGroupId: number): Promise<ISubgroupMeta[]> {
        const url = `https://its.urfu.ru/MUPItsSubgroupMeta/Index?competitionGroupId=${competitionGroupId}`;
        const res = await this.requestService.GetJson(url);
        return res.map((obj: any) => {
            const subgroupMeta: ISubgroupMeta = {
                id: obj["Id"],
                discipline: obj["discipline"],
                count: obj["count"],
                load: obj["tmer"],
            };
            return subgroupMeta;
        });
    }

    async UpdateSubgroupMetaLoadCount(subgroupMetaId: number, groupCount: number): Promise<IActionResponse> {
        const url = `https://its.urfu.ru/MUPItsSubgroupMeta/Edit`;

        const data = {
            id: subgroupMetaId,
            groupCount: groupCount,
        };

        if (subgroupMetaId < 419) {
            const message = `Tried to update not test Subgroup Meta id: ${subgroupMetaId}`;
            alert(message);
            return {success: false, message};
        }

        const result = await this.requestService.PostFormData(url, data);
        return result;
    }

    async GetSubgroups(competitionGroupId: number): Promise<ISubgroup[]> {
        const url = `https://its.urfu.ru/MUPItsSubgroup?competitionGroupId=${competitionGroupId}`;
        const res = await this.requestService.GetJson(url);
        console.log(res);
        return res.map((obj: any) => {
            const subgroup: ISubgroup = {
                id: obj["Id"],
                name: obj["Name"],
                mupId: obj["ModuleId"],
                mupName: obj["ModuleTitle"],
                count: obj["count"],
                limit: obj["Limit"],
                teacherId: obj["TeacherId"],
                description: obj["Description"],
                number: obj["InnerNumber"],
                load: obj["subgroupType"],
            };
            return subgroup;
        });
    }

    async UpdateSubgroup(subgroup: ISubgroup): Promise<IActionResponse> {
        const url = "https://its.urfu.ru/MUPItsSubgroup/Edit";
    
        const data = {
            Id: subgroup.id,
            Name: subgroup.name,
            Limit: subgroup.limit,
            TeacherId: subgroup.teacherId ?? '',
            Description: subgroup.description,
        };
    
        if (subgroup.id < 470) {
            const message = `Tried to update not test Subgroup id: ${subgroup.id}`;
            alert(message);
            return {success: false, message};
        }
    
        const result = await this.requestService.PostFormData(url, data);
        return result;
    }

    async DeleteSubgroup(subgroupIds: number[]): Promise<IActionResponse> {
        const url = "https://its.urfu.ru/MUPItsSubgroup/Delete";
        const data = JSON.stringify(subgroupIds);
        for (let id of subgroupIds) {
            if (id < 474) {
                const message = `Tried to delete not test Subgroup: ${id}`;
                alert(message);
                return {success: false, message};
            }
        }

        const result = await this.requestService.SendJson(url, data, 'DELETE', 'text');
        return result;
    }

    async CreateSubgroups(competitionGroupId: number): Promise<IActionResponse> {
        const url = `https://its.urfu.ru/MUPItsSubgroup/Create?competitionGroupId=${competitionGroupId}`;

        if (competitionGroupId < 24) {
            const message = `Tried to create subgroups for not test Competition group: ${competitionGroupId}`;
            alert(message);
            return {success: false, message};
        }

        const res = await this.requestService.GetJson(url);
        return res;
    }

    async GetCompetitionGroups(): Promise<ICompetitionGroup[]> {
        const url = `https://its.urfu.ru/MUPItsCompetitionGroups?page=1&start=0&limit=${COMPETITION_GROUP_MAX_COUNT}`;
        const res = await this.requestService.GetJson(url);
        console.log(res);
        return res.map((obj: any) => {
            const competitionGroup: ICompetitionGroup = {
                id: obj["Id"],
                name: obj["Name"],
                course: obj["StudentCourse"],
                year: obj["Year"],
                semesterId: obj["SemesterId"],
                semesterName: obj["Semester"],
                eduSpaceId: obj["EduSpaceId"],
                admissionCount: obj["AdmissionCount"],
                selectionGroupNames: obj["SelectionGroups"],
            };
            return competitionGroup;
        });
    }

    async GetStudentAdmissionMetas(competitionGroupId: number): Promise<IAdmissionMeta[]> {
        const url = `https://its.urfu.ru/MUPItsAdmission/Index/${competitionGroupId}?page=1&start=0&limit=${MUPS_MAX_COUNT}`;
        const res = await this.requestService.GetJson(url);
        return res.map((obj: any) => {
            const admissionMeta: IAdmissionMeta = {
                mupId: obj["MUPId"],
                admissionsId: obj["MUPItsInSelectionGroupId"],
            };
            return admissionMeta;
        });
    }

    async GetStudentsForAdmission(admissionId: number): Promise<IStudentAdmissionRaw[]> {
        const url = `https://its.urfu.ru/MUPItsAdmission/Students/${admissionId}?page=1&start=0&limit=${STUDENT_ADMISSIONS_MAX_COUNT}`;
        const res = await this.requestService.GetJson(url);
        return res.map((obj: any) => {
            const admissionMeta: IStudentAdmissionRaw = {
                id: obj["Id"],
                personalNumber: obj["PatronymicName"],
                surname: obj["Surname"],
                firstname: obj["Name"],
                patronymic: obj["PatronymicName"],
                rating: obj["Rating"],
                priority: obj["Priority"],
                testResult: obj["TestResult"],
                status: obj["Status"],
            };
            return admissionMeta;
        });
    }
}
