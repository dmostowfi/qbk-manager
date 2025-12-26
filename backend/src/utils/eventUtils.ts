/**
 * Check if an event can still be modified.
 * Events become read-only 15 minutes after their start time.
 */
export function isEventEditable(eventStartTime: Date): boolean {
  const cutoff = new Date(eventStartTime);
  cutoff.setMinutes(cutoff.getMinutes() + 15);
  return new Date() < cutoff;
}
