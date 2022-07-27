export interface ICredentials {
  username: string;
  password: string;
}

export interface ISelectionGroup {
  id: number;
  name: string;
  year: number;
  semesterId: number;
  // ze: number; // UnitsSum.

  eduSpaceId: number;
  unitSum: number; // zet
  byPriority: number;
  competitionGroupId: number | null;
  competitionGroupName: string;
}

export interface IEduSpace {
  id: number;
  name: string;
}

export interface IMup {
  id: string;
  name: string;
  ze: number; // testUnits
}

export interface ISelectionGroupMup {
  connectionId: number;
  limit: number;
  mupId: string;
}

export interface IMupLoad {
  // Tmer
  id: number;
  name: string; // rmer
  kmer: string; // kmer
}

export interface IPeriod {
  id: number;
  year: number;
  semesterId: number;
  course: number;
  selectionBegin: string;
  selectionDeadline: string;
  loads: IMupLoad[]; // Tmers
}

export type IMupToPeriods = { [key: string]: IPeriod[] };

export interface IMupData {
  ids: string[];
  data: { [key: string]: IMup };
}

export interface ISelectionGroupData {
  ids: number[];
  data: { [key: number]: ISelectionGroup };
}

export interface ISelectionGroupMupData {
  ids: string[];
  data: { [key: string]: ISelectionGroupMup };
}

export interface ISelectionGroupToMupsData {
  ids: number[];
  data: { [key: number]: ISelectionGroupMupData };
}

export interface IMupEdit {
  selected: boolean;
  limit: number;
  messages: string[];
  addLoadsManual?: boolean;
}

export interface IMupDiff {
  presentInGroups: number[];
  initLimits: (number | null)[];
  courseToCurrentPeriod: { [key: number]: IPeriod };
  // addLoadsManual: boolean;
  someLoads: IMupLoad[];
  changeDates: boolean;
  canBeDeleted: boolean;
}

export interface IMupEditorConfig {
  mupData: IMupData;
  selectionGroupIds: number[];
}

export interface IPeriodTimeInfo {
  year: number;
  semesterId: number;
  course: number;
  dates: [string, string];
}

export interface ISubgroupMeta {
  id: number;
  count: number;
  discipline: string;
  load: string;
}

export type ICompetitionGroupToSubgroupMetas = {
  [key: number]: ISubgroupMeta[];
};

export interface ISubgroup {
  id: number;
  name: string;
  limit: number;
  teacherId: string | null;
  description: string;
  mupId: string;
  mupName: string;
  count: number;
  number: number;
  load: string;
}

export type ICompetitionGroupToSubgroups = { [key: number]: ISubgroup[] };

// subgroupId to Subgroup
export interface ISubgroupData {
  // ids: number[];
  data: { [key: number]: ISubgroup };
}
export type ICompetitionGroupToSubgroupIds = { [key: number]: number[] };

export type IMupNameToSubgroups = { [key: string]: number[] };
export type ICompetitionGroupToMupSubgroups = {
  [key: number]: IMupNameToSubgroups;
};

export type SubgroupMetaData = {
  [key: string]: { [key: number]: { [key: string]: ISubgroupMeta } };
};

export type MetaDiffs = {
  // disipline
  [key: string]: {
    // competitionGroupId
    [key: number]: {
      // load
      [key: string]: ISubgroupMeta; //
    };
  };
};

export type SubgroupDiffs = {
  // discipline
  [key: string]: {
    // competitionGroupId
    [key: number]: {
      // <load> + <number>
      [key: string]: number; // subgroupId
    };
  };
};

export type SubgroupAndMetaAreSameDiffs = {
  // discipline
  [key: string]: [boolean, boolean]; // for 2 competitonGroups
};

export interface ISubgoupDiffInfo {
  metaDiffs: MetaDiffs;
  subgroupDiffs: SubgroupDiffs;
  subgroupAndMetaAreSameDiffs: SubgroupAndMetaAreSameDiffs;
}

export interface IMupSubgroupDiff {
  loadsToMetas: { [key: string]: [ISubgroupMeta | null, ISubgroupMeta | null] }; // load -> [[],[]]
  loadToTeachers: { [key: string]: [string | null, string | null] }; // load_number -> [t1, t2]
}

export interface ISubgroupInfo {
  mupName: string;
  load: string;
  number: number;
}

export interface ICompetitionGroup {
  id: number;
  name: string;
  course: number;
  year: number;
  semesterId: number;
  semesterName: string;
  eduSpaceId: number; // Not needed
  admissionCount: number; // Not needed
  selectionGroupNames: string[];
}

export interface ICompetitionGroupData {
  ids: number[];
  data: { [key: number]: ICompetitionGroup };
}

export interface IAdmissionMeta {
  mupId: string;
  limit: number;
  count: number;
  admissionsId: number;
}

export type MupIdToAdmission = {
  // mupId => IAdmissionMeta
  [key: string]: IAdmissionMeta;
};
export type CompetitionGroupIdToMupAdmissions = {
  [key: number]: MupIdToAdmission;
};

export interface IStudentAdmissionRaw {
  id: string;
  personalNumber: string;
  surname: string;
  firstname: string;
  patronymic: string; // Отчество
  rating: number | null;
  priority: number | null;
  testResult: number | null;
  status: number; // 0 - не зачислен, 1 - зачислен
  studentStatus: string;
  groupName: string;
}

export interface IStudent {
  id: string;
  personalNumber: string;
  groupName: string;

  surname: string;
  firstname: string;
  patronymic: string;

  rating: number | null;
  status: string;

  competitionGroupId: number;
}

export interface IStudentData {
  ids: string[]; // personalNumber
  data: { [key: string]: IStudent };
}

// competitionGroup -> mup -> Admissions[]
// students
// Admission
//  - studentId
//  - priority
export interface IStudentAdmission {
  // id: string;
  // personalNumber: string;
  // mupId: string;
  admissionId: number;
  priority: number | null;
  testResult: number | null;
  status: number; // 0 - нет решения, 1 - зачислен
}

export type AdmissionInfo = {
  // admissionId
  [key: number]: {
    // personalNumber
    [key: string]: IStudentAdmission | null;
  };
};

export interface IStudentSubgroupMembership {
  studentId: string;
  included: boolean;
}


export type MupToLoadToSubgroupMembership = {
  [key: string]: { // mupName
    [key: string]: string[][] // loadName => [['personalNumber', 'personalNumber'], ...]
  }
}