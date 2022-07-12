import {ISelectionListItem} from "../../SelectionList/types";


export interface IGroupSelectProps {
    selectionGroupsList: ISelectionListItem[];
    onRefresh: () => void;
    onSelectionValid: (selectedGroupIds: number[]) => void;
}