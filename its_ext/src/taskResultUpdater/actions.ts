import { IITSContext } from "../common/Context";
import {  } from "../common/types";
import { ActionType, ITSAction } from "../common/actions";
import {IActionResponse} from "../utils/ITSApiService";


export class UpdateTaskResultAction extends ITSAction {
    constructor(public studentId: string, public admissionId: number, public taskResult: number) {
        super(ActionType.UpdateTaskResult);
    }

    getMessage(): string {
        return `Update task result for studentId: ${this.studentId} admissionId: ${this.admissionId} taskResult: ${this.taskResult}`;
    }

    async execute(context: IITSContext): Promise<IActionResponse> {
        return context.apiService.UpdateStudentTestResults(
            this.studentId, this.admissionId, this.taskResult
        );
    }
}
