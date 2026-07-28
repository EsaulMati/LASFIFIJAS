export type AccuracyStatus = 'PENDING' | 'WON' | 'LOST' | 'VOID';

export function calculateAccuracy(
  predictions: ReadonlyArray<{ status: AccuracyStatus }>,
): number | null {
  const won = predictions.filter((item) => item.status === 'WON').length;
  const decided = predictions.filter(
    (item) => item.status === 'WON' || item.status === 'LOST',
  ).length;

  return decided === 0 ? null : Math.round((won / decided) * 100);
}
