

export interface ITaskResultsInputProps {
    competitionGroupIds: number[];
    // onApply: (
    //     admissionIds: number[],
    //     personalNumberToTaskResult: {[key: string]: number | null}
    // ) => void;
    onUnauthorized: () => void;
}