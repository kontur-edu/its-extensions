export interface IMupEditorProps {
  selectionGroupIds: number[];
  // dataIsPrepared: boolean;
  onLoad: () => void;
  onNextStep: () => void;
  onUnauthorized: () => void;
}
