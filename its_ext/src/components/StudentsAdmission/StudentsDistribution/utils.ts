import { IMupData, ISelectionGroupData } from "../../../common/types"
import { ITSApiService } from "../../../utils/ITSApiService";


export async function createPersonalNumberToAdmittedMupNames(
    api: ITSApiService,
    selectionGroupData: ISelectionGroupData,
    mupData: IMupData,
) {
    const personalNumberToMupNameSet: {[key: string]: Set<string>} = {};
    for (const selectionGroupId in selectionGroupData.data) {
        const selectionGroup = selectionGroupData.data[selectionGroupId];
        const cgId = selectionGroup.competitionGroupId;
        if (!cgId) {
            continue;
        }

        const admissionMetas = await api.GetStudentAdmissionMetas(cgId);
        if (admissionMetas.length > 0) {
            const meta = admissionMetas[0];
            const admissionId = meta.admissionsId;
            const mupId = meta.mupId;
            const mupName = mupData.data[mupId].name;
            const studentsRaw = await api.GetStudentsForAdmission(admissionId);
            for (const studentRaw of studentsRaw) {
                const pn = studentRaw.personalNumber;
                if (!personalNumberToMupNameSet.hasOwnProperty(pn)) {
                    personalNumberToMupNameSet[pn] = new Set<string>();
                }
                personalNumberToMupNameSet[pn].add(mupName);
                studentRaw.otherAdmissions.forEach(name => personalNumberToMupNameSet[pn].add(name));
            }
        }
    }

    return personalNumberToMupNameSet
}