import { IITSContext } from "../common/Context";
import {} from "../common/types";
import { ActionType, ITSAction } from "../common/actions";
import { IActionResponse } from "../utils/ITSApiService";

export class UpdateStudentAdmissionAction extends ITSAction {
  constructor(
    public admissionId: number,
    public studentIds: string[],
    public status: number
  ) {
    super(ActionType.UpdateStudentAdmission);
  }

  getMessageSimple(): string {
    return this.getMessage();
  }

  getMessage(): string {
    const studentIdsStr = JSON.stringify(this.studentIds, null, 2);
    return `Изменить статус на ${this.status} для студентов с id: ${studentIdsStr} для зачисления с id: ${this.admissionId}`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    const response = await context.apiService.UpdateStudentAdmissionStatus(
      this.admissionId,
      this.studentIds,
      this.status
    );
    return [response];
  }
}
