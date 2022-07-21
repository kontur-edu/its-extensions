export interface ISelectionListItem {
  id: number;
  name: string;
}

export interface ISelectionListProps {
  items: ISelectionListItem[];
  selectedIds: number[];
  onToggle: (index: number) => void;
}
