import { ICompetitionGroup } from "../../../common/types";
import { ISelectionListItem } from "../../SelectionList/types";

export interface ICompetitionGroupItem {
  id: number;
  name: string;
  course: number;
  year: number;
  semesterName: string;
  selectionGroupName: string;
}

export interface ICompetitionGroupSelectProps {
  competitionGroupsItems: ICompetitionGroupItem[];
  onRefresh: () => void;
  onSelectionValid: (competitionGroupIds: number[]) => void;
}
