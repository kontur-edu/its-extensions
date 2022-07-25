import { IITSContext } from "../common/Context";
import {} from "../common/types";
import { ActionType, ITSAction } from "../common/actions";
import { IActionResponse } from "../utils/ITSApiService";

export class UpdateStudentAdmissionAction extends ITSAction {
  constructor(
    public studentId: string,
    public admissionId: number,
    public status: number
  ) {
    super(ActionType.UpdateStudentAdmission);
  }

  getMessageSimple(): string {
    return this.getMessage();
  }

  getMessage(): string {
    return `Изменить статус на ${this.status} студента с id: ${this.studentId} для Зачисления с id: ${this.admissionId}`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    const res = await context.apiService.UpdateStudentAdmissionStatus(
      this.studentId,
      this.admissionId,
      this.status
    );
    return [res];
  }
}
