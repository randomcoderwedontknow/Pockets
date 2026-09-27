const URL_IN_TEXT =
  /(?:https?:\/\/[^\s<>"']+|(?:www\.)[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?)/gi;

export function normalizeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return url.href;
}

export function extractUrlsFromText(text: string): string[] {
  const found = text.match(URL_IN_TEXT) ?? [];
  const out: string[] = [];
  for (const m of found) {
    const n = normalizeHttpUrl(m);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
