

export interface ICredentials {
    username: string;
    password: string;
}


export interface ISelectionGroup {
    id: number;
    name: string;
    year: number;
    semesterId: number;

    eduSpaceId: number;
    unitSum: number;
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
}

export interface ISelectionGroupMup {
    connectionId: number;
    limit: number;
    mupId: string;
}

// export interface IPeriod {
//     id: number;
//     year: number;
//     semesterId: number;
//     selectionBegin: string;
//     selectionDeadline: string;
// }

export interface IMupLoad { // Tmer
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

export type IMupToPeriods = {[key: string]: IPeriod[]}; 

export interface IMupData {
    ids: string[];
    data: {[key: string]: IMup};
}

export interface ISelectionGroupData {
    ids: number[];
    data: {[key: number]: ISelectionGroup};
}

export interface ISelectionGroupMupData {
    ids: string[];
    data: {[key: string]: ISelectionGroupMup};
}

export interface ISelectionGroupToMupsData {
    ids: number[];
    data: {[key: number]: ISelectionGroupMupData};
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
    courseToCurrentPeriod: {[key: number]: IPeriod};
    addLoadsManual: boolean;
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

// export interface IMupEditorUpdate {
//     date
// }

// Выбранные МУПы
// Все мупы
// Периоды для каждого МУПа выбранного МУПа

// При выборе мупа, unfocus если limit изменен
// Делается запрос периода и лимита для МУПа
// Если период выбора уже есть


export interface ISubgroupMeta {
    id: number;
    count: number;
    discipline: string;
    load: string;
}

export type ICompetitionGroupToSubgroupMetas = {[key: number]: ISubgroupMeta[]};


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

export type ICompetitionGroupToSubgroups = {[key: number]: ISubgroup[]};

// subgroupId to Subgroup
export interface ISubgroupData {
    // ids: number[];
    data: {[key: number]: ISubgroup};
}
export type ICompetitionGroupToSubgroupIds = {[key: number]: number[]};


export type IMupNameToSubgroups = {[key: string]: number[]}
export type ICompetitionGroupToMupSubgroups = {[key: number]: IMupNameToSubgroups};


// export type ICompetitionGroupToSubgroupIds = {[key: number]: number[]};

// mupId -> {CGid -> [], CGid -> []}
// count
// names
// export interface ISubgoupDiff {
    
// }

export type SubgroupMetaData = {[key: string]: {[key: number]: {[key: string]: ISubgroupMeta}}};

// export interface ISubgoupMetaDiff {
//     mupId: string;
//     difference: string;
//     todo: string;
// }

export type MetaDiffs = {
    // disipline
    [key: string]: {
        // competitionGroupId
        [key: number]: {
            // load
            [key: string]: ISubgroupMeta // 
        }
    }
}

export type SubgroupDiffs = {
    // discipline
    [key: string]: {
        // competitionGroupId
        [key: number]: {
            // <load> + <number>
            [key: string]: number // subgroupId
        }
    }
}

export type SubgroupAndMetaAreSameDiffs = {
    // discipline
    [key: string]: [boolean, boolean] // for 2 competitonGroups
}

export interface ISubgoupDiffInfo {
    metaDiffs: MetaDiffs;
    subgroupDiffs: SubgroupDiffs;
    subgroupAndMetaAreSameDiffs: SubgroupAndMetaAreSameDiffs;
    // metasAndSubgroupsAreSame: boolean;
    // loadToCounts: {[key: string]: (ISubgroupMeta | null)[]};
    // nameToTeacherIds: {[key: string]: (number | null)[]}
}


export interface IMupSubgroupDiff {
    // differences: string[]; // not needed
    // todos: string[]; // not needed
    // addLoadsManualFor: number[], // not needed
    // loadsToGroupsNeeded: {[key: string]: number};
    // createSubgroupsFor: number[];
    loadsToMetas: {[key: string]: [ISubgroupMeta | null, ISubgroupMeta | null]} // load -> [[],[]]
    // abse/ntSubgroupsForLoad_number: [string[], string[]];
    loadToTeachers: {[key: string]: [string | null, string | null]}; // load_number -> [t1, t2]
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
    selectionGroupNames: string[],
}

export interface ICompetitionGroupData {
    ids: number[];
    data: {[key: number]: ICompetitionGroup};
}



export interface IAdmissionMeta {
    mupId: string;
    // count: number;
    admissionsId: number;
}

export type MupIdToAdmissionId = {
    [key: string]: number;
}
export type CompetitionGroupIdToMupAdmissions = {
    [key: number]: MupIdToAdmissionId;
}


export interface IStudentAdmissionRaw {
    id: string;
    personalNumber: string;
    surname: string;
    firstname: string;
    patronymic: string; // Отчество
    rating: number | null;
    priority: number | null;
    testResult: number | null;
    status: string;
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
}

export interface IStudentData {
    ids: string[];                  // personalNumber
    data: {[key: string]: IStudent};
}

// competitionGroup -> mup -> Admissions[]
// students
// Admission
//  - studentId
//  - priority
export interface IStudentAdmission {
    id: string;
    // personalNumber: string;
    // mupId: string;
    priority: number | null;
    testResult: number | null;
}

export type AdmissionInfo = {
    // admissionId
    [key: number]: {
        // personalNumber
        [key: string]: IStudentAdmission
    }
}

