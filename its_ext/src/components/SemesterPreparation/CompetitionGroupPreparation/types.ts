export interface ICompetitionGroupPreparationProps {
  selectionGroupIds: number[];
  dataIsPrepared: boolean;
  onUnauthorized: () => void;
  onNextStep: () => void;
}
