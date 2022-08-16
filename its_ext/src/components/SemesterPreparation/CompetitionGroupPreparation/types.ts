export interface ICompetitionGroupPreparationProps {
  selectionGroupIds: number[];
  onUnauthorized: () => void;
  onNextStep: () => void;
  onLoad: () => void;
  onReferenceCompetitionGroupChange: (competitionGroupId: number) => void;
  refreshCounter: number;
  onApplyFinish: () => void;
}
