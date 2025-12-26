/**
 * Check if an event can still be modified.
 * Events become read-only 15 minutes after their start time.
 */
export function isEventEditable(startTime: string | Date): boolean {
  const eventStart = new Date(startTime);
  const cutoff = new Date(eventStart.getTime() + 15 * 60 * 1000); // 15 minutes after start
  return new Date() < cutoff;
}
