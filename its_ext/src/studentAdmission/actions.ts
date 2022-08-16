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
    const response = await context.apiService.UpdateStudentAdmissionStatus(
      this.studentId,
      this.admissionId,
      this.status
    );
    // let message = "";
    // try {
    //   if (res.data.length > 0) {
    //     const resObj = JSON.parse(res.data);
    //     if (resObj.report) {
    //       message = resObj.report;
    //     }
    //   }
    // } catch(err) {
    //   console.warn("Failed to read response from UpdateStudentAdmissionStatus: ", err);
    // }
    // const response = {...res, message: message};
    // console.warn(response);
    return [response];
  }
}
