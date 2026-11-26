// Local calendar-day key ("YYYY-MM-DD"), used instead of toISOString() so
// streaks and chart buckets match the viewer's own timezone, not UTC.
export function toLocalDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
