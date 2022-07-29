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

import {
  EDU_SPACES_MAX_COUNT,
  MUPS_MAX_COUNT,
  PERIOD_MAX_COUNT,
  COMPETITION_GROUP_MAX_COUNT,
  STUDENT_ADMISSIONS_MAX_COUNT,
  SAFE_MODE_ENABLED_MESSAGE,
} from "./constants";
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
    result.message = bodyJson.message;
  }
  return result;
}

export class ITSApiService {
  constructor(
    public requestService: RequestService,
    private readonly safeMode: boolean = false
  ) {}

  async GetSelectionGroupsForEduSpace(
    eduSpaceId: number
  ): Promise<ISelectionGroup[]> {
    const url = `https://its.urfu.ru/EduSpace/SelectionGroups?id=${eduSpaceId}&page=1&start=0&limit=${EDU_SPACES_MAX_COUNT}`;
    const res = await this.requestService.GetJson(url);
    return res.map((obj: any) => {
      const selectionGroup: ISelectionGroup = {
        id: obj["Id"],
        name: obj["Name"],
        year: obj["Year"],
        semesterId: obj["SemesterId"],
        // ze: obj["UnitsSum"],
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
    const url = `https://its.urfu.ru/MUP/Index?page=1&start=0&limit=${MUPS_MAX_COUNT}`;
    const res = await this.requestService.GetJson(url);
    return res.map((obj: any) => {
      const mup: IMup = {
        id: obj["id"],
        name: obj["title"],
        shortName: obj["shortTitle"],
        ze: obj["testUnits"],
      };
      return mup;
    });
  }

  async GetSelectionGroupMups(
    selectionGroupId: number
  ): Promise<ISelectionGroupMup[]> {
    const url = `https://its.urfu.ru/EduSpace/SelectionGroupContent?id=${selectionGroupId}&page=1&start=0&limit=${MUPS_MAX_COUNT}`;
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
      Id: selectionGroupId,
    };
    const result = await this.requestService.PostFormData(url, data);
    return result;
  }

  async UpdateSelectionGroups(
    selectionGroup: ISelectionGroup,
    mupIds: string[]
  ): Promise<IActionResponse> {
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

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
    console.log(data);
    if (data.EduSpaceId !== 14) {
      const message = `Not test EduSpace id: ${data.EduSpaceId}`;
      alert(message);
      return { success: false, message };
    }
    if (
      selectionGroup.name !== "TestGroup1" &&
      selectionGroup.name !== "TestGroup2"
    ) {
      const message = `Not test selection group ${selectionGroup.id} ${selectionGroup.name}`;
      alert(message);
      return { success: false, message };
    }
    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);

    return result;
  }

  async AddLoadToPeriod(
    periodId: number,
    load: IMupLoad
  ): Promise<IActionResponse> {
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

    const url = "https://its.urfu.ru/MUP/AddTmer";

    const data = {
      id: periodId,
      kmer: load.kmer,
    };

    if (periodId < 102) {
      const message = `Not test Period periodId: ${periodId}`;
      alert(message);
      return { success: false, message };
    }

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);

    return result;
  }

  // NOTE: will not be needed
  async RemoveLoadToPeriod(
    periodId: number,
    load: IMupLoad
  ): Promise<IActionResponse> {
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

    const url = "https://its.urfu.ru/MUP/DeleteTmer";

    const data = {
      id: periodId,
      kmer: load.kmer,
    };

    if (periodId < 102) {
      const message = `Not test Period periodId: ${periodId}`;
      alert(message);
      return { success: false, message };
    }

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);

    return result;
  }

  async CreatePeriod(mupId: string, period: IPeriod): Promise<IActionResponse> {
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

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

    // const message = `Tried to create period: ${JSON.stringify(data)}`;
    // alert(message);
    // return { success: false, message };

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);

    return result;
  }

  async UpdatePeriod(mupId: string, period: IPeriod): Promise<IActionResponse> {
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

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

    if (period.id < 102) {
      const message = `Tried to update not test period: ${JSON.stringify(
        data
      )}`;
      alert(message);
      return { success: false, message };
    }

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);

    return result;
  }

  // NOTE: probably no body from response
  async UpdateMupLimit(
    connectionId: number,
    limit: number
  ): Promise<IActionResponse> {
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

    const url = "https://its.urfu.ru/EduSpace/UpdateLimit";

    const data = {
      id: connectionId,
      limit: limit,
    };

    if (connectionId < 124) {
      const message = `Tried to update limit for not test connectionId: ${connectionId}`;
      alert(message);
      return { success: false, message };
    }

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

  async UpdateSubgroupMetaLoadCount(
    subgroupMetaId: number,
    groupCount: number
  ): Promise<IActionResponse> {
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

    const url = `https://its.urfu.ru/MUPItsSubgroupMeta/Edit`;

    const data = {
      id: subgroupMetaId,
      groupCount: groupCount,
    };

    if (subgroupMetaId < 419) {
      const message = `Tried to update not test Subgroup Meta id: ${subgroupMetaId}`;
      alert(message);
      return { success: false, message };
    }

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);

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
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

    const url = "https://its.urfu.ru/MUPItsSubgroup/Edit";

    const data = {
      Id: subgroup.id,
      Name: subgroup.name,
      Limit: subgroup.limit,
      TeacherId: subgroup.teacherId ?? "",
      Description: subgroup.description,
    };

    if (subgroup.id < 470) {
      const message = `Tried to update not test Subgroup id: ${subgroup.id}`;
      alert(message);
      return { success: false, message };
    }

    const response = await this.requestService.PostFormData(url, data);
    const result = addSummary(response, url, data);
    return result;
  }

  async DeleteSubgroup(subgroupIds: number[]): Promise<IActionResponse> {
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

    const url = "https://its.urfu.ru/MUPItsSubgroup/Delete";
    const data = JSON.stringify(subgroupIds);
    for (let id of subgroupIds) {
      if (id < 474) {
        const message = `Tried to delete not test Subgroup: ${id}`;
        alert(message);
        return { success: false, message };
      }
    }

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
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

    const url = `https://its.urfu.ru/MUPItsSubgroup/Create?competitionGroupId=${competitionGroupId}`;

    if (competitionGroupId < 24) {
      const message = `Tried to create subgroups for not test Competition group: ${competitionGroupId}`;
      alert(message);
      return { success: false, message };
    }

    const response = await this.requestService.GetJson(url);
    const result = addSummary(response, url);

    return result;
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

  async GetStudentAdmissionMetas(
    competitionGroupId: number
  ): Promise<IAdmissionMeta[]> {
    const url = `https://its.urfu.ru/MUPItsAdmission/Index/${competitionGroupId}?page=1&start=0&limit=${MUPS_MAX_COUNT}`;
    const res = await this.requestService.GetJson(url);
    return res.map((obj: any) => {
      const admissionMeta: IAdmissionMeta = {
        mupId: obj["MUPId"],
        limit: obj["Limit"],
        count: obj["Admitted"],
        admissionsId: obj["MUPItsInSelectionGroupId"],
      };
      return admissionMeta;
    });
  }

  async GetStudentsForAdmission(
    admissionId: number
  ): Promise<IStudentAdmissionRaw[]> {
    const url = `https://its.urfu.ru/MUPItsAdmission/Students/${admissionId}?page=1&start=0&limit=${STUDENT_ADMISSIONS_MAX_COUNT}`;
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
      };
      return admissionMeta;
    });
  }

  async UpdateStudentTestResults(
    studentId: string,
    admissionId: number,
    testResult: number
  ) {
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

    const url = "https://its.urfu.ru/MUPItsAdmission/EditTestResults";

    const data = {
      studentId: studentId,
      id: admissionId,
      resultValue: testResult,
    };

    if (admissionId < 146) {
      const message = `Tried to update not test Admission id: ${admissionId}`;
      alert(message);
      return { success: false, message };
    }

    const result = await this.requestService.PostFormData(url, data);
    return result;
  }

  async UpdateStudentAdmissionStatus(
    studentId: string,
    admissionId: number,
    status: number
  ) {
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

    const url =
      "https://its.urfu.ru/MUPItsAdmission/SetCompetitionGroupAdmissionStatus";

    const data = {
      studentIds: studentId,
      id: admissionId,
      status: status,
    };

    if (admissionId < 146) {
      const message = `Tried to update not test Admission id: ${admissionId}`;
      alert(message);
      return { success: false, message };
    }

    const result = await this.requestService.PostFormData(url, data);
    return result;
  }

  async GetSubgroupMembershipInfo(
    subgroupId: number
  ): Promise<IStudentSubgroupMembership[]> {
    const url = `https://its.urfu.ru/MUPItsSubgroup/Students?id=${subgroupId}`;
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
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

    const url = "https://its.urfu.ru/MUPItsSubgroup/StudentMembership";

    const data = {
      subgroupId: subgroupId,
      studentId: studentId,
      include: included ? "true" : "false",
    };

    if (subgroupId < 594) {
      const message = `Tried to update not test Subgroup id: ${subgroupId}`;
      alert(message);
      return { success: false, message };
    }

    const result = await this.requestService.PostFormData(url, data);
    return result;
  }

  async GetSelectionGroupMupModules(connectionId: number) {
    const url = `https://its.urfu.ru/EduSpace/ModulesForMUP?id=${connectionId}`;
    const res = await this.requestService.GetJson(url);
    return res.map((obj: any) => {
      const disciplines = obj["disciplines"].map((dObj: any) => {
        const disc: IDiscipline = {
          id: obj["uid"],
          name: obj["title"],
        }
        return disc;
      })
      const admissionMeta: IModuleWithSelection = {
        id: obj["uuid"],
        name: obj["title"],
        disciplines: disciplines,
      };
      return admissionMeta;
    });
  }

  async UpdateSelectionGroipMupModules(connectionId: number, moduleSelection: IModuleSelection) {
    if (this.safeMode) throw new Error(SAFE_MODE_ENABLED_MESSAGE);

    const url = "https://its.urfu.ru/EduSpace/UpdateDisciplineConnection";

    const data = {
      id: connectionId,
      moduleDisciplines: JSON.stringify(moduleSelection),
    };

    if (connectionId < 124) {
      const message = `Tried to update not test Connection id: ${connectionId}`;
      alert(message);
      return { success: false, message };
    }

    const result = await this.requestService.PostFormData(url, data);
    return result;
  }
}
