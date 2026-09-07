/** Deterministic SVG avatar generated from a username (no external assets). */

const PALETTES: [string, string][] = [
  ["#6366f1", "#8b5cf6"],
  ["#0ea5e9", "#22d3ee"],
  ["#10b981", "#34d399"],
  ["#f59e0b", "#f97316"],
  ["#ef4444", "#f43f5e"],
  ["#ec4899", "#f472b6"],
  ["#14b8a6", "#06b6d4"],
  ["#8b5cf6", "#d946ef"],
  ["#f97316", "#facc15"],
  ["#3b82f6", "#6366f1"],
  ["#64748b", "#94a3b8"],
  ["#0d9488", "#22c55e"],
];

function hashCode(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.replace(/[^a-zA-Z0-9_\u4e00-\u9fff]/g, "").slice(0, 2);
  return parts.toUpperCase() || "?";
}

export function avatarDataUri(name: string, size = 96): string {
  const [c1, c2] = PALETTES[hashCode(name) % PALETTES.length];
  const text = initials(name);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 96 96" role="img" aria-label="avatar">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="96" height="96" rx="48" fill="url(#g)"/>` +
    `<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, sans-serif" font-size="34" font-weight="700" fill="rgba(255,255,255,0.95)">${text}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg).replace(/'/g, "%27")}`;
}