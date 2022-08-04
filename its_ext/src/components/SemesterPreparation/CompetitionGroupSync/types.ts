export interface ICompetitionGroupSyncProps {
  selectionGroupIds: number[];
  dataIsPrepared: boolean;
  onUnauthorized: () => void;
  referenceCompetitionGroupId: number | null;
}
