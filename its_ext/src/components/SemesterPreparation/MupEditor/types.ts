export interface IMupEditorProps {
  selectionGroupIds: number[];
  dataIsPrepared: boolean;
  onNextStep: () => void;
  onUnauthorized: () => void;
}
