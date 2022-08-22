import { IITSContext } from "../common/Context";
import {} from "../common/types";
import { ActionType, ITSAction } from "../common/actions";
import { IActionResponse } from "../utils/ITSApiService";

export class UpdateMembershipAction extends ITSAction {
  constructor(
    public studentId: string,
    public subgroupId: number,
    public included: boolean
  ) {
    super(ActionType.UpdateMembership);
  }

  getMessage(): string {
    const included = this.included ? "true" : "false";
    return `Обновить статус включения студента studentId: ${this.studentId} subgroupId: ${this.subgroupId} included: ${included}`;
  }

  getMessageSimple(): string {
    const included = this.included ? "Включить" : "Исключить";
    return `${included} студента studentId: ${this.studentId} subgroupId: ${this.subgroupId}`;
  }

  async execute(context: IITSContext): Promise<IActionResponse[]> {
    return [
      await context.apiService.UpdateStudentSubgroupMembership(
        this.subgroupId,
        this.studentId,
        this.included
      ),
    ];
  }
}
