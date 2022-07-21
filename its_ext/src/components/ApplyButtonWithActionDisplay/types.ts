import { IActionExecutionLogItem, ITSAction } from "../../common/actions";

export interface IApplyButtonWithActionDisplayProps {
  showErrorWarning: boolean;
  showSuccessMessage: boolean;
  actions?: ITSAction[];
  actionResults?: IActionExecutionLogItem[];
  onNextStep?: () => any;
  onApply?: () => any;
}
