export interface ICompetitionGroupSyncProps {
  selectionGroupIds: number[];
  dataIsPrepared: boolean;
  onUnauthorized: () => void;
}
