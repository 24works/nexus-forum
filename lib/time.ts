/** Client-friendly time formatting. */

export function formatDate(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relative time like "3h ago". */
export function relativeTime(ts: number | null | undefined): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const abs = Math.abs(diff);
  const sec = Math.floor(abs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const wk = Math.floor(day / 7);
  const mo = Math.floor(day / 30);
  const yr = Math.floor(day / 365);

  let value: string;
  if (sec < 60) value = `${sec}s`;
  else if (min < 60) value = `${min}m`;
  else if (hr < 24) value = `${hr}h`;
  else if (day < 7) value = `${day}d`;
  else if (wk < 5) value = `${wk}w`;
  else if (mo < 12) value = `${mo}mo`;
  else value = `${yr}y`;

  return diff >= 0 ? `${value} ago` : `in ${value}`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  const p = plural ?? `${singular}s`;
  return `${count} ${count === 1 ? singular : p}`;
}