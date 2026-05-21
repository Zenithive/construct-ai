/**
 * Billing period boundaries (UTC).
 * Free/inactive users: calendar month [start, end) where end is first instant of next month.
 * Paid users: use users.current_period_* when subscription is active.
 */

export function getCalendarMonthPeriod(now = new Date()): { period_start: Date; period_end: Date } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const period_start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const period_end = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
  return { period_start, period_end };
}
