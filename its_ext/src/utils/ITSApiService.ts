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
  IStudentSubgroupMembership,
  IModuleWithSelection,
  IDiscipline,
  IModuleSelection,
} from "../common/types";

import { LIMIT_PER_PAGE } from "./constants";
import { reformatItsDate } from "./helpers";

export interface IActionResponse {
  success: boolean;
  message?: string;
  summary?: string;
}

function addSummary(response: any, url: string, data?: any): IActionResponse {
  const result: IActionResponse = {
    success: response.success,
    message: response.data,
    summary: `${url} ${data ? JSON.stringify(data, null, 2) : ""}`,
  };
  if (response.success && response.data) {
    const bodyJson = JSON.parse(response.data);
    result.success = bodyJson.success;
    result.message = bodyJson.message || bodyJson.report;
  }
  return result;
}

export class ITSApiService {
  constructor(public requestService: RequestService) {}

  async GetSelectionGroupsForEduSpace(
    eduSpaceId: number
  ): Promise<ISelectionGroup[]> {
    const url = `https://its.urfu.ru/EduSpace/GetSelectionGroups?eduSpaceId=${eduSpaceId}`;
    const res = await this.requestService.GetJson(url);
    return res.map((obj: any) => {
      const selectionGroup: ISelectionGroup = {
        id: obj["Id"],
        name: obj["Name"],
        year: obj["Year"],
        semesterId: obj["SemesterId"],
        semesterName: obj["SemesterName"],
        eduSpaceId: obj["EduSpaceId"],
        unitSum: obj["UnitsSum"],
        byPriority: obj["ByPriority"],
        competitionGroupId: obj["CompetitionGroupId"],
        competitionGroupName: obj["CompetitionGroup"] ?? "",
      };
      return selectionGroup;
    });
  }

  async GetAllSelectionGroupsParallel(): Promise<ISelectionGroup[]> {
    const eduSpaces = await this.GetAllEduSpaces();
    const requests: Promise<ISelectionGroup[]>[] = eduSpaces.map((eduSpace) =>
      this.GetSelectionGroupsForEduSpace(eduSpace.id)
    );
    const responses = await Promise.allSettled(requests);
    const result: ISelectionGroup[] = [];
    for (let resp of responses) {
      console.log(resp.status);
      if (resp.status === "fulfilled") {
        result.push(...resp.value);
      }
    }
    return result;
  }

  async GetAllEduSpaces(): Promise<IEduSpace[]> {
    const url = `https://its.urfu.ru/EduSpace`;
    const res = await this.requestService.GetJson(url);
    return res.map((obj: any) => {
      return { id: obj["Id"], name: obj["Name"] };
    });
  }

  async GetAllMups(): Promise<IMup[]> {
    const url = `https://its.urfu.ru/MUP/Index?page=1&start=0&limit=${LIMIT_PER_PAGE}`;
    const res = await this.requestService.GetJson(url);
    return res.map((obj: any) => {
      const mup: IMup = {
        id: obj["id"],
        name: obj["title"],
        shortName: obj["shortTitle"],
        ze: obj["testUnits"],
        teacherIds: obj["teachers"],
      };
      return mup;
    });
  }

  async GetSelectionGroupMups(
    selectionGroupId: number
  ): Promise<ISelectionGroupMup[]> {
    const url = `https://its.urfu.ru/EduSpace/SelectionGroupContent?id=${selectionGroupId}&page=1&start=0&limit=${LIMIT_PER_PAGE}`;
    const res = await this.requestService.GetJson(url);
    return res.map((obj: any) => {
      return {
        connectionId: obj["connectionId"],
        limit: obj["limit"],
        mupId: obj["uuid"],
      };
    });
  }

  async GetPeriods(mupId: string): Promise<IPeriod[]> {
    console.log(`GetPeriods: ${mupId}`);
    const url = `https://its.urfu.ru/MUP/Periods/${mupId}?page=1&start=0&limit=${LIMIT_PER_PAGE}`;
    const res = await this.requestService.GetJson(url);
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
      Id: selectionGroupId,
    };
    const result = await this.requestService.PostFormData(url, data);
    return result;
  }

  async UpdateSelectionGroups(
    selectionGroup: ISelectionGroup,
    mupIds: string[]
  ): Promise<IActionResponse> {
    const url = "https://its.urfu.ru/EduSpace/UpdateSelectionGroup";
    const competitionGroupId = selectionGroup.competitionGroupId ?? "";
    const data = {
      Id: selectionGroup.id,
      EduSpaceId: selectionGroup.eduSpaceId,
      Name: selectionGroup.name,
      UnitsSum: selectionGroup.unitSum,
      ByPriority: selectionGroup.byPriority ? "true" : "false",
      CompetitionGroupId: competitionGroupId,
      MUPItsIds: mupIds,
    };
    console.log("UpdateSelectionGroups");
    //console.log(data);
    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);

    return result;
  }

  async AddLoadToPeriod(
    periodId: number,
    load: IMupLoad
  ): Promise<IActionResponse> {
    const url = "https://its.urfu.ru/MUP/AddTmer";

    const data = {
      id: periodId,
      kmer: load.kmer,
    };

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);

    return result;
  }

  // NOTE: will not be needed
  async RemoveLoadToPeriod(
    periodId: number,
    load: IMupLoad
  ): Promise<IActionResponse> {
    const url = "https://its.urfu.ru/MUP/DeleteTmer";

    const data = {
      id: periodId,
      kmer: load.kmer,
    };

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);

    return result;
  }

  async CreatePeriod(mupId: string, period: IPeriod): Promise<IActionResponse> {
    const url = "https://its.urfu.ru/MUP/CreatePeriod";

    const data = {
      Id: "",
      MUPItsId: mupId,
      Year: period.year,
      SemesterId: period.semesterId,
      Course: period.course,
      SelectionBegin: period.selectionBegin,
      SelectionDeadline: period.selectionDeadline,
    };

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);

    return result;
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

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);

    return result;
  }

  // NOTE: probably no body from response
  async UpdateMupLimit(
    connectionId: number,
    limit: number
  ): Promise<IActionResponse> {
    const url = "https://its.urfu.ru/EduSpace/UpdateLimit";

    const data = {
      id: connectionId,
      limit: limit,
    };

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);

    return result;
  }

  async EmulateCheckSubgroupMetas(
    competitionGroupId: number
  ): Promise<{ success: boolean; data: any }> {
    const url = `https://its.urfu.ru/MUPItsSubgroupMeta/Index?competitionGroupId=${competitionGroupId}`;
    const urlWithProxy = `${this.requestService.proxyUrl}/${url}`;
    const headers = {
      "x-url": url,
    };

    const options: any = {
      method: "GET",
      credentials: "include",
      headers: headers,
    };
    const res = await this.requestService.SendRequest(urlWithProxy, options);

    return res;
  }

  async GetSubgroupMetas(competitionGroupId: number): Promise<ISubgroupMeta[]> {
    const url = `https://its.urfu.ru/MUPItsSubgroupMeta/Index?competitionGroupId=${competitionGroupId}&page=1&start=0&limit=${LIMIT_PER_PAGE}`;
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

  async UpdateSubgroupMetaLoadCount(
    subgroupMetaId: number,
    groupCount: number
  ): Promise<IActionResponse> {
    const url = `https://its.urfu.ru/MUPItsSubgroupMeta/Edit`;

    const data = {
      id: subgroupMetaId,
      groupCount: groupCount,
    };

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);

    return result;
  }

  async GetSubgroups(competitionGroupId: number): Promise<ISubgroup[]> {
    console.log(`GetSubgroups: ${competitionGroupId}`);
    const url = `https://its.urfu.ru/MUPItsSubgroup?competitionGroupId=${competitionGroupId}&page=1&start=0&limit=${LIMIT_PER_PAGE}`;
    const res = await this.requestService.GetJson(url);
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
    console.log(`UpdateSubgroup: ${subgroup.id}`);
    const url = "https://its.urfu.ru/MUPItsSubgroup/Edit";

    const data = {
      Id: subgroup.id,
      Name: subgroup.name,
      Limit: subgroup.limit,
      TeacherId: subgroup.teacherId ?? "",
      Description: subgroup.description,
    };

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);
    return result;
  }

  async DeleteSubgroup(subgroupIds: number[]): Promise<IActionResponse> {
    console.log(`DeleteSubgroup: ${subgroupIds}`);
    const url = "https://its.urfu.ru/MUPItsSubgroup/Delete";
    const data = JSON.stringify(subgroupIds);

    const response = await this.requestService.SendJson(url, data, "DELETE");
    const result = { success: response.success, message: response.data };
    if (response.success && response.data) {
      const bodyJson = JSON.parse(response.data);
      result.success = bodyJson.success;
      result.message = bodyJson.message;
    }
    return result;
  }

  async CreateSubgroups(competitionGroupId: number): Promise<IActionResponse> {
    console.log(`CreateSubgroups: ${competitionGroupId}`);
    const url = `https://its.urfu.ru/MUPItsSubgroup/Create?competitionGroupId=${competitionGroupId}`;

    const response = await this.requestService.GetJson(url);
    const result = addSummary(response, url);

    return result;
  }

  async GetCompetitionGroups(): Promise<ICompetitionGroup[]> {
    console.log(`GetCompetitionGroups`);
    const url = `https://its.urfu.ru/MUPItsCompetitionGroups?page=1&start=0&limit=${LIMIT_PER_PAGE}`;
    const res = await this.requestService.GetJson(url);
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

  async GetStudentAdmissionMetas(
    competitionGroupId: number
  ): Promise<IAdmissionMeta[]> {
    console.log(`GetStudentAdmissionMetas: ${competitionGroupId}`);
    const url = `https://its.urfu.ru/MUPItsAdmission/Index/${competitionGroupId}?page=1&start=0&limit=${LIMIT_PER_PAGE}`;
    const res = await this.requestService.GetJson(url);
    return res.map((obj: any) => {
      const admissionMeta: IAdmissionMeta = {
        mupId: obj["MUPId"],
        limit: obj["Limit"],
        count: obj["Admitted"],
        admissionId: obj["MUPItsInSelectionGroupId"],
      };
      return admissionMeta;
    });
  }

  async GetStudentsForAdmission(
    admissionId: number
  ): Promise<IStudentAdmissionRaw[]> {
    console.log(`GetStudentsForAdmission: ${admissionId}`);
    const url = `https://its.urfu.ru/MUPItsAdmission/Students/${admissionId}?page=1&start=0&limit=${LIMIT_PER_PAGE}`;
    const res = await this.requestService.GetJson(url);
    return res.map((obj: any) => {
      const admissionMeta: IStudentAdmissionRaw = {
        id: obj["Id"],
        personalNumber: obj["PersonalNumber"],
        surname: obj["Surname"],
        firstname: obj["Name"],
        patronymic: obj["PatronymicName"],
        rating: obj["Rating"],
        priority: obj["Priority"],
        testResult: obj["TestResult"],
        status: obj["Status"],
        studentStatus: obj["StudentStatus"],
        groupName: obj["GroupName"],
        otherAdmissions: obj["OtherAdmissions"],
      };
      return admissionMeta;
    });
  }

  async UpdateStudentTestResults(
    studentId: string,
    admissionId: number,
    testResult: number
  ) {
    console.log(
      `UpdateStudentTestResults: ${studentId}, ${admissionId}, ${testResult}`
    );
    const url = "https://its.urfu.ru/MUPItsAdmission/EditTestResults";

    const data = {
      studentId: studentId,
      id: admissionId,
      resultValue: testResult,
    };

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);
    return result;
  }

  async UpdateStudentAdmissionStatus(
    admissionId: number,
    studentIds: string[],
    status: number
  ) {
    console.log(
      `UpdateStudentAdmissionStatus: admissionId: ${admissionId}, studentIds: ${studentIds}, status: ${status}`
    );
    const url =
      "https://its.urfu.ru/MUPItsAdmission/SetCompetitionGroupAdmissionStatus";

    const data = {
      studentIds: studentIds,
      id: admissionId,
      status: status,
    };

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);
    if (response.data) {
      try {
        const dataObj = JSON.parse(response.data);
        if (dataObj.wrongStudents && dataObj.wrongStudents.length > 0) {
          result.success = false;
        }
      } catch {}
    }
    return result;
  }

  async GetSubgroupMembershipInfo(
    subgroupId: number
  ): Promise<IStudentSubgroupMembership[]> {
    console.log(`GetSubgroupMembershipInfo: ${subgroupId}`);
    const url = `https://its.urfu.ru/MUPItsSubgroup/Students?id=${subgroupId}&page=1&start=0&limit=${LIMIT_PER_PAGE}`;
    const res = await this.requestService.GetJson(url);

    return res.map((obj: any) => {
      const admissionMeta: IStudentSubgroupMembership = {
        studentId: obj["Id"],
        included: obj["Included"],
      };
      return admissionMeta;
    });
  }

  async UpdateStudentSubgroupMembership(
    subgroupId: number,
    studentId: string,
    included: boolean
  ) {
    console.log(
      `UpdateStudentSubgroupMembership: ${subgroupId}, ${studentId}, ${included}`
    );
    const url = "https://its.urfu.ru/MUPItsSubgroup/StudentMembership";

    const data = {
      subgroupId: subgroupId,
      studentId: studentId,
      include: included ? "true" : "false",
    };

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);
    return result;
  }

  async GetSelectionGroupMupModules(
    connectionId: number
  ): Promise<IModuleWithSelection[]> {
    console.log(`GetSelectionGroupMupModules: ${connectionId}`);
    const url = `https://its.urfu.ru/EduSpace/ModulesForMUP?id=${connectionId}&page=1&start=0&limit=${LIMIT_PER_PAGE}`;
    const res = await this.requestService.GetJson(url);
    return res.map((obj: any) => {
      const disciplines = obj["disciplines"].map((dObj: any) => {
        const disc: IDiscipline = {
          id: dObj["uid"],
          name: dObj["title"],
          ze: dObj["testUnits"],
        };
        return disc;
      });
      const admissionMeta: IModuleWithSelection = {
        id: obj["uuid"],
        name: obj["title"],
        disciplines: disciplines,
        selected: obj["selectedDisciplines"],
      };
      return admissionMeta;
    });
  }

  async UpdateSelectionGroupMupModules(
    connectionId: number,
    moduleSelections: IModuleSelection[]
  ) {
    console.log(
      `UpdateSelectionGroupMupModules: ${connectionId}, moduleSelections: `,
      moduleSelections
    );
    const url = "https://its.urfu.ru/EduSpace/UpdateDisciplineConnection";

    const moduleDisciplines = moduleSelections.map((ms) => {
      return { moduleUid: ms.id, disciplines: ms.selected };
    });

    const data = {
      id: connectionId,
      moduleDisciplines: JSON.stringify(moduleDisciplines),
    };

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);
    return result;
  }
}
