import { IITSContext } from "../common/Context";
import {} from "../common/types";
import { ActionType, ITSAction } from "../common/actions";
import { IActionResponse } from "../utils/ITSApiService";

export class UpdateTaskResultAction extends ITSAction {
  constructor(
    public studentId: string,
    public admissionId: number,
    public taskResult: number
  ) {
    super(ActionType.UpdateTaskResult);
  }

  getMessage(): string {
    return `Изменить результат тестового на ${this.taskResult} для студента studentId: ${this.studentId} admissionId: ${this.admissionId}`;
  }

  getMessageSimple(): string {
    const passed = this.taskResult ? "Прошел" : "Не прошел";
    return `Студент studentId: ${this.studentId} для зачисления admissionId: ${this.admissionId} ${passed}`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    return [
      await context.apiService.UpdateStudentTestResults(
        this.studentId,
        this.admissionId,
        this.taskResult
      ),
    ];
  }
}
