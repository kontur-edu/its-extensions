import { ISelectionListItem } from "../../SelectionList/types";

export interface IGroupSelectProps {
  selectionGroupsList: ISelectionListItem[];
  onRefresh: () => void;
  onSelection: (selectedGroupIds: number[]) => void;
}
