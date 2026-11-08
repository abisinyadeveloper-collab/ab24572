// Retry only transient status checks, never a paid generation request.
export function videoPollDelay(status: number, failures: number): number | null {
  if (failures >= 4 || (status !== 429 && status < 500)) return null;
  return Math.min(8000 * 2 ** failures, 60000);
}