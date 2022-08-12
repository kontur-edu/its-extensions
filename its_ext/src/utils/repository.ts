import {
  IMupData,
  ISelectionGroupData,
  ISelectionGroupMupData,
  ISelectionGroupToMupsData,
  IMupToPeriods,
  ICompetitionGroupToSubgroupMetas,
  ISubgroupData,
  ICompetitionGroupToSubgroupIds,
  ICompetitionGroupData,
  IStudentData,
  AdmissionInfo,
  CompetitionGroupIdToMupAdmissions,
  MupIdToAdmission,
  IStudent,
  IStudentAdmission,
  IStudentAdmissionRaw,
  IStudentSubgroupMembership,
  IModuleData,
  IModule,
  ISelectedModuleDisciplines,
} from "../common/types";

import { ITSApiService } from "./ITSApiService";

import {
  prepareSelectionGroupData,
  prepareMupData,
  prepareSelectionGroupMupData,
  prepareSelectionGroupToMupsData,
  prepareCompetitionGroupData,
  createPromisesAndWaitAllPaginated,
} from "../utils/helpers";

export class ITSRepository {
  mupData: IMupData = { ids: [], data: {} };
  selectionGroupData: ISelectionGroupData = { ids: [], data: {} };
  selectionGroupToMupsData: ISelectionGroupToMupsData = { ids: [], data: {} };
  mupToPeriods: IMupToPeriods = {};
  competitionGroupToSubgroupMetas: ICompetitionGroupToSubgroupMetas = {};
  subgroupData: ISubgroupData = { data: {} };
  competitionGroupToSubgroupIds: ICompetitionGroupToSubgroupIds = {};
  competitionGroupData: ICompetitionGroupData = { ids: [], data: {} };

  studentData: IStudentData = { ids: [], data: {} };
  studentIdToPersonalNumber: { [key: string]: string } = {};

  competitionGroupIdToMupAdmissions: CompetitionGroupIdToMupAdmissions = {};
  admissionIdToMupId: { [key: number]: string } = {};
  admissionInfo: AdmissionInfo = {};

  subgroupIdToStudentSubgroupMembership: {
    [key: number]: IStudentSubgroupMembership[];
  } = {}; // subgroupId -> studentId[]

  moduleData: IModuleData = { data: {}, ids: [] };
  selectionGroupModuleIdToSelectedModuleDisciplines: {
    [key: number]: ISelectedModuleDisciplines;
  } = {};

  constructor(public api: ITSApiService) {}

  async UpdateMupData() {
    console.log(`ITSRepository: UpdateMupData`);
    const allMups = await this.api.GetAllMups();
    this.mupData = prepareMupData(allMups);
  }

  CheckSelectionGroupDataPresent(selectionGroupIds: number[]) {
    const res = selectionGroupIds.every((sgId) =>
      this.selectionGroupData.data.hasOwnProperty(sgId)
    );
    console.log(`CheckSelectionGroupDataPresent: ${res}`);
    return res;
  }

  async UpdateSelectionGroupData() {
    console.log(`ITSRepository: UpdateSelectionGroupData`);
    const allSelectionGroups = await this.api.GetAllSelectionGroupsParallel();
    this.selectionGroupData = prepareSelectionGroupData(allSelectionGroups);
  }

  CheckSelectionGroupToMupDataPresent(selectionGroupIds: number[]) {
    const res = selectionGroupIds.every((sgId) =>
      this.selectionGroupToMupsData.data.hasOwnProperty(sgId)
    );
    console.log(`CheckSelectionGroupToMupDataPresent: ${res}`);
    if (!res) {
      console.log(this.selectionGroupToMupsData);
    }
    return res;
  }

  async UpdateSelectionGroupToMupsData(selectionGroupIds: number[]) {
    console.log(
      `ITSRepository: UpdateSelectionGroupToMupsData ${selectionGroupIds}`
    );
    const selectionGroupIdToSelectionGroupMups: {
      [key: number]: ISelectionGroupMupData;
    } = {};
    
    const responses = await createPromisesAndWaitAllPaginated(
      selectionGroupIds,
      (selectionGroupId) => this.api.GetSelectionGroupMups(selectionGroupId)
    );
    const failedIds: number[] = [];
    for (let i = 0; i < selectionGroupIds.length; i++) {
      const resp = responses[i];
      const selectionGroupId = selectionGroupIds[i];
      if (resp.status === "fulfilled") {
        const selectionGroupMupData = prepareSelectionGroupMupData(resp.value);
        selectionGroupIdToSelectionGroupMups[selectionGroupId] =
          selectionGroupMupData;
      } else {
        failedIds.push(selectionGroupId);
        console.error(
          `Failed to request SelectionGroupMupData for selectionGroupId: ${selectionGroupId}`
        );
      }
    }
    this.selectionGroupToMupsData = prepareSelectionGroupToMupsData(
      selectionGroupIdToSelectionGroupMups
    );
    console.log(this.selectionGroupToMupsData);
  }

  CheckPeriodDataPresent(mupIds: string[]) {
    const res = mupIds.every((mId) => this.mupToPeriods.hasOwnProperty(mId));
    console.log(`CheckPeriodDataPresent: ${res}`);
    return res;
  }

  async UpdatePeriods(mupIds: string[]) {
    console.log(`ITSRepository: UpdatePeriods ${mupIds}`);
    const responses = await createPromisesAndWaitAllPaginated(mupIds, (mupId) =>
      this.api.GetPeriods(mupId)
    );
    const failedIds: string[] = [];
    for (let i = 0; i < mupIds.length; i++) {
      const mupId = mupIds[i];
      const resp = responses[i];
      if (resp.status === "fulfilled") {
        this.mupToPeriods[mupId] = resp.value;
      } else {
        failedIds.push(mupId);
        console.error(`Failed to request Periods for mupId: ${mupId}`);
      }
    }
    console.log("/ UpdatePeriods");
  }


  async EnsurePeriodInfoFor(mupId: string) {
    console.log(`ITSRepository: EnsurePeriodInfoFor ${mupId}`);
    if (this.mupToPeriods.hasOwnProperty(mupId)) return;

    // this.mupToPeriods[mupId] = [];
    const periods = await this.api.GetPeriods(mupId);
    this.mupToPeriods[mupId] = periods;
  }

  CheckSubgroupMetasPresent(competitionGroupIds: number[]) {
    const res = competitionGroupIds.every((cgId) =>
      this.competitionGroupToSubgroupMetas.hasOwnProperty(cgId)
    );
    console.log(`CheckSubgroupMetasPresent: ${res}`);
    return res;
  }

  async UpdateSubgroupMetas(competitionGroupIds: number[]) {
    console.log(`ITSRepository: UpdateSubgroupMetas`);
    const responses = await createPromisesAndWaitAllPaginated(
      competitionGroupIds,
      (competitionGroupId) => this.api.GetSubgroupMetas(competitionGroupId)
    );
    const failedIds: number[] = [];
    for (let i = 0; i < competitionGroupIds.length; i++) {
      const competitionGroupId = competitionGroupIds[i];
      const resp = responses[i];
      if (resp.status === "fulfilled") {
        this.competitionGroupToSubgroupMetas[competitionGroupId] = resp.value;
      } else {
        failedIds.push(competitionGroupId);
        console.error(
          `Failed to request SubgroupMeta for competitionGroupId: ${competitionGroupId}`
        );
      }
    }
  }

  CheckSubgroupPresent(competitionGroupIds: number[]) {
    const res = competitionGroupIds.every((cgId) =>
      this.competitionGroupToSubgroupIds.hasOwnProperty(cgId)
    );
    console.log(`CheckSubgroupPresent (${competitionGroupIds}): ${res}`);
    return res;
  }

  async UpdateSubgroups(competitionGroupIds: number[]) {
    console.log(`ITSRepository: UpdateSubgoups`);
    const responses = await createPromisesAndWaitAllPaginated(
      competitionGroupIds,
      (competitionGroupId) => this.api.GetSubgroups(competitionGroupId)
    );
    const failedIds: number[] = [];
    for (let i = 0; i < competitionGroupIds.length; i++) {
      const competitionGroupId = competitionGroupIds[i];
      const resp = responses[i];
      if (resp.status === "fulfilled") {
        const subgroupIds: number[] = [];
        for (let subgroup of resp.value) {
          subgroupIds.push(subgroup.id);
          this.subgroupData.data[subgroup.id] = subgroup;
        }

        this.competitionGroupToSubgroupIds[competitionGroupId] = subgroupIds;
      } else {
        failedIds.push(competitionGroupId);
        console.error(
          `Failed to request Subgroups for competitionGroupId: ${competitionGroupId}`
        );
      }
    }
  }

  CheckCompetitionGroupDataPresent(competitionGroupIds: number[]) {
    const res = competitionGroupIds.every((cgId) =>
      this.competitionGroupData.data.hasOwnProperty(cgId)
    );
    console.log(`CheckCompetitionGroupDataPresent: ${res}`);
    return res;
  }

  async UpdateCompetitionGroupData() {
    console.log(`ITSRepository: UpdateCompetitionGroupData`);
    const competitionGroups = await this.api.GetCompetitionGroups();
    this.competitionGroupData = prepareCompetitionGroupData(competitionGroups);
  }

  CheckAdmissionMetasPresent(competitionGroupIds: number[]) {
    const res = competitionGroupIds.every((cgId) =>
      this.competitionGroupIdToMupAdmissions.hasOwnProperty(cgId)
    );
    console.log(`CheckAdmissionMetasPresent: ${res}`);
    return res;
  }

  async UpdateAdmissionMetas(competitionGroupIds: number[]) {
    console.log(`ITSRepository: UpdateAdmissionMetas`);

    const responses = await createPromisesAndWaitAllPaginated(
      competitionGroupIds,
      (cgId) => this.api.GetStudentAdmissionMetas(cgId)
    );
    const failedIds: number[] = [];
    for (let i = 0; i < competitionGroupIds.length; i++) {
      const resp = responses[i];
      const competitionGroupId = competitionGroupIds[i];
      const mupIdToAdmission: MupIdToAdmission = {};
      if (resp.status === "fulfilled") {
        for (const admissionMeta of resp.value) {
          mupIdToAdmission[admissionMeta.mupId] = admissionMeta;
          this.admissionIdToMupId[admissionMeta.admissionsId] =
            admissionMeta.mupId;
        }
      } else {
        failedIds.push(competitionGroupId);
      }

      this.competitionGroupIdToMupAdmissions[competitionGroupId] =
        mupIdToAdmission;
    }
  }

  fillStudentRawInfoToStudentDataAndAdmissionInfo(
    admissionId: number,
    studentsRaw: IStudentAdmissionRaw[],
    competitionGroupId: number
  ) {
    const studentAdmissionInfo: { [key: string]: IStudentAdmission | null } =
      {};
    for (const studentRaw of studentsRaw) {
      if (!this.studentData.data.hasOwnProperty(studentRaw.personalNumber)) {
        this.studentData.ids.push(studentRaw.personalNumber);
      }

      const student: IStudent = {
        id: studentRaw.id,
        personalNumber: studentRaw.personalNumber,
        surname: studentRaw.surname,
        firstname: studentRaw.firstname,
        patronymic: studentRaw.patronymic,
        rating: studentRaw.rating,
        status: studentRaw.studentStatus,
        groupName: studentRaw.groupName,
        competitionGroupId: competitionGroupId,
      };

      this.studentData.data[studentRaw.personalNumber] = student;
      this.studentIdToPersonalNumber[student.id] = student.personalNumber;

      if (
        !studentRaw.priority &&
        studentRaw.status !== 1 &&
        !studentRaw.testResult
      ) {
        studentAdmissionInfo[studentRaw.personalNumber] = null;
        continue;
      }
      const studentAdmission: IStudentAdmission = {
        admissionId: admissionId,
        priority: studentRaw.priority,
        testResult: studentRaw.testResult,
        status: studentRaw.status,
      };

      studentAdmissionInfo[studentRaw.personalNumber] = studentAdmission;
    }

    this.admissionInfo[admissionId] = studentAdmissionInfo;
  }

  CheckAdmissionInfoPresent(admissionIds: number[]) {
    const res = admissionIds.every((aId) =>
      this.admissionInfo.hasOwnProperty(aId)
    );
    console.log(`CheckAdmissionInfoPresent: ${res}`);
    return res;
  }

  CheckStudentInfoPresent(personalNumbers: string[]) {
    const res = personalNumbers.every((pn) =>
      this.studentData.data.hasOwnProperty(pn)
    );
    console.log(`CheckStudentInfoPresent: ${res}`);
    return res;
  }

  async UpdateStudentAdmissionsAndStudentData(competitionGroupIdToAdmissionIds: {
    [key: number]: number[];
  }) {
    console.log(`ITSRepository: UpdateStudentAdmissionsAndStudentData`);
    for (let competitionGroupIdStr in competitionGroupIdToAdmissionIds) {
      const competitionGroupId = Number(competitionGroupIdStr);
      const admissionIds = competitionGroupIdToAdmissionIds[competitionGroupId];
      const responses = await createPromisesAndWaitAllPaginated(
        admissionIds,
        (aId) => this.api.GetStudentsForAdmission(aId)
      );
      for (let i = 0; i < admissionIds.length; i++) {
        const resp = responses[i];
        const admissionId = admissionIds[i];
        if (resp.status === "fulfilled") {
          this.fillStudentRawInfoToStudentDataAndAdmissionInfo(
            admissionId,
            resp.value,
            competitionGroupId
          );
        }
      }
    }
  }

  CheckSubgroupMembershipPresent(subgroupIds: string[]) {
    const res = subgroupIds.every((sId) =>
      this.subgroupIdToStudentSubgroupMembership.hasOwnProperty(sId)
    );
    console.log(`CheckSubgroupMembershipPresent: ${res}`);
    return res;
  }

  async UpdateSubgroupMembership(subgroupIds: number[]) {
    console.log(`ITSRepository: UpdateSubgroupMembership`);
    const responses = await createPromisesAndWaitAllPaginated(
      subgroupIds,
      (sId) => this.api.GetSubgroupMembershipInfo(sId)
    );
    const failedIds: number[] = [];
    for (let i = 0; i < subgroupIds.length; i++) {
      const resp = responses[i];
      const subgroupId = subgroupIds[i];
      if (resp.status === "fulfilled") {
        this.subgroupIdToStudentSubgroupMembership[subgroupId] = resp.value;
      } else {
        failedIds.push(subgroupId);
      }
    }
  }

  CheckModuleDataPresent() {
    const res = this.moduleData.ids.length > 0;
    console.log(`CheckModuleDataPresent: ${res}`);
    return res;
  }

  // any connectionId
  async UpdateModuleData(connectionId: number) {
    console.log(`ITSRepository: UpdateModuleData`);
    const mupModules = await this.api.GetSelectionGroupMupModules(connectionId);
    const ids: string[] = [];
    mupModules.forEach((mmodule) => {
      ids.push(mmodule.id);
    });

    const data: { [key: string]: IModule } = {};
    for (const mmodule of mupModules) {
      data[mmodule.id] = mmodule;
    }
    this.moduleData.data = data;
    this.moduleData.ids = ids;
  }

  CheckSelectionGroupMupModuleDisciplinesPresent(connectionIds: number[]) {
    const res = connectionIds.every((cId) =>
      this.selectionGroupModuleIdToSelectedModuleDisciplines.hasOwnProperty(cId)
    );
    console.log(`CheckSelectionGroupMupModuleDisciplinesPresent: ${res}`);
    return res;
  }

  async UpdateSelectionGroupMupModuleDisciplines(connectionIds: number[]) {
    console.log(`ITSRepository: UpdateSelectionGroupMupModuleDisciplines`);
    const responses = await createPromisesAndWaitAllPaginated(
      connectionIds,
      (cId) => this.api.GetSelectionGroupMupModules(cId)
    );
    const failedIds: number[] = [];
    for (let i = 0; i < connectionIds.length; i++) {
      const resp = responses[i];
      const connectionId = connectionIds[i];
      if (resp.status === "fulfilled") {
        const selectedModuleDisciplines: ISelectedModuleDisciplines = {};
        for (const module of resp.value) {
          if (module.disciplines.length > 0) {
            selectedModuleDisciplines[module.id] = module.selected;
          }
        }
        this.selectionGroupModuleIdToSelectedModuleDisciplines[connectionId] =
          selectedModuleDisciplines;
      } else {
        failedIds.push(connectionId);
      }
    }
  }
}
