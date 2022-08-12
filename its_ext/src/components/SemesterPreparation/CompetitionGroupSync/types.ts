export interface ICompetitionGroupSyncProps {
  selectionGroupIds: number[];
  onUnauthorized: () => void;
  referenceCompetitionGroupId: number | null;
}
