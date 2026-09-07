/**
 * A small, dependency-free Markdown renderer that produces HTML for
 * user-generated content. All user input is HTML-escaped *before* any
 * transformation, so raw HTML/script tags can never pass through.
 * A final sanitizing pass strips event handlers, scripts and iframes as
 * defense-in-depth.
 */

const CODE_PLACEHOLDER_PREFIX = "\u0000CODE";

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unescapeHtml(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function sanitizeUrl(raw: string): string | null {
  const decoded = unescapeHtml(raw).trim();
  if (!decoded) return null;
  if (decoded.startsWith("#")) return decoded;
  if (decoded.startsWith("/")) {
    // Block protocol-relative and backslash tricks.
    if (decoded.startsWith("//") || decoded.startsWith("/\\")) return null;
    if (!/^[a-z0-9_~.\-/+:@%?&=#\[\]]+$/i.test(decoded)) return null;
    return decoded;
  }
  if (/^mailto:/i.test(decoded)) {
    if (/^mailto:[^@\s]+@[^@\s]+$/i.test(decoded)) return decoded;
    return null;
  }
  if (/^https?:\/\//i.test(decoded)) {
    try {
      const url = new URL(decoded);
      if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    } catch {
      return null;
    }
  }
  return null;
}

/** Renders inline markdown on *already-escaped* text. */
function renderInline(escaped: string): string {
  let s = escaped;
  const codeSpans: string[] = [];

  // Lock inline code first so its contents are never further transformed.
  s = s.replace(/`([^`\n]+)`/g, (_m, code: string) => {
    const idx = codeSpans.length;
    codeSpans.push(code as string);
    return `${CODE_PLACEHOLDER_PREFIX}${idx}:`;
  });

  // Images: ![alt](url)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt: string, rawUrl: string) => {
    const url = sanitizeUrl(rawUrl);
    if (!url) return _m;
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"/>`;
  });

  // Links: [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, rawUrl: string) => {
    const url = sanitizeUrl(rawUrl);
    if (!url) return _m;
    const external = /^https?:\/\//i.test(url);
    const rel = external ? ' rel="nofollow noopener noreferrer" target="_blank"' : "";
    return `<a href="${escapeHtml(url)}"${rel}>${text}</a>`;
  });

  // Bare URLs
  s = s.replace(/(^|[\s(>])(https?:\/\/[^\s<)"'`]+[^\s<.,;:!?()"'`])/g, (_m, lead: string, url: string) => {
    const cleaned = sanitizeUrl(url);
    if (!cleaned) return _m;
    return `${lead}<a href="${escapeHtml(cleaned)}" rel="nofollow noopener noreferrer" target="_blank">${escapeHtml(url)}</a>`;
  });

  // Mentions -> profile links.
  s = s.replace(/@([A-Za-z0-9_]{2,30})/g, (_m, username: string) => {
    return `<a class="mention" href="/u/${escapeHtml(username)}">@${escapeHtml(username)}</a>`;
  });

  // Strong / emphasis / strikethrough.
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");

  // Restore code spans.
  s = s.replace(/\u0000CODE(\d+):/g, (_m, idx: string) => {
    const code = codeSpans[Number(idx)] ?? "";
    return `<code>${code}</code>`;
  });

  return s;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/javascript\s*:/gi, "");
}

export interface RenderedContent {
  html: string;
  plain: string;
}

/**
 * Renders markdown to sanitized HTML plus a plain-text preview.
 */
export function renderMarkdown(src: string): RenderedContent {
  const normalized = src.replace(/\r\n?/g, "\n");
  const html = blockRender(normalized);
  return {
    html: sanitizeHtml(html),
    plain: stripMarkdown(normalized),
  };
}

function blockRender(src: string): string {
  const lines = src.split("\n");
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let i = 0;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) {
      closeList();
      i++;
      continue;
    }

    const fence = /^\s*(```|~~~)\s*([a-zA-Z0-9_-]*)\s*$/.exec(line);
    if (fence) {
      closeList();
      const lang = fence[2].toLowerCase();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*(```|~~~)\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      const attr = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      out.push(`<pre tabindex="0"><code${attr}>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length, 4);
      const { html: inner } = renderMarkdown(heading[2]);
      out.push(`<h${level}>${inlineSafe(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      closeList();
      out.push("<hr>");
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      closeList();
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      const inner = blockRender(buf.join("\n"));
      out.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    const ul = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        out.push("<ul>");
        listType = "ul";
      }
      out.push(`<li>${inlineSafe(ul[1])}</li>`);
      i++;
      continue;
    }

    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        out.push("<ol>");
        listType = "ol";
      }
      out.push(`<li>${inlineSafe(ol[1])}</li>`);
      i++;
      continue;
    }

    // Paragraph
    closeList();
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^\s*(```|~~~)/.test(lines[i]) &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s/.test(lines[i]) &&
      !/^\s*\d+[.)]\s/.test(lines[i]) &&
      !/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    // Join paragraph lines with spaces (soft wrap) unless they end with two spaces (hard break).
    const joined = buf.join("\n").replace(/\n{2,}/g, "\n");
    out.push(`<p>${inlineSafe(joined)}</p>`);
  }

  closeList();
  return out.join("\n");
}

function inlineSafe(escapedOrRaw: string): string {
  return renderInline(escapeHtml(escapedOrRaw));
}

/** Creates a plain-text excerpt suitable for previews. */
export function makeSnippet(src: string, maxLength = 220): string {
  let text = stripMarkdown(src);
  if (text.length > maxLength) {
    text = text.slice(0, maxLength).trimEnd() + "…";
  }
  return text;
}

function stripMarkdown(src: string): string {
  return src
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~>#]+/g, "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Detects @mentions inside raw content. */
export function extractMentions(src: string): string[] {
  const mentions = src.match(/@([A-Za-z0-9_]{2,30})/g) ?? [];
  return [...new Set(mentions.map((m) => m.slice(1).toLowerCase()))];
}