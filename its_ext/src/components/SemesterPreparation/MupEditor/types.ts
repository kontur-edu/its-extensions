export interface IMupEditorProps {
  selectionGroupIds: number[];
  onLoad: () => void;
  onNextStep: () => void;
  onUnauthorized: () => void;
}
