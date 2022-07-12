
export interface ISelectionListItem {
    id: number;
    name: string;
    // selected: boolean;
}

export interface ISelectionListProps {
    items: ISelectionListItem[];
    selectedIds: number[];
    onToggle: (index: number) => void;
}
