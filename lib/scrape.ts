import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import type { ExtractedLink, SourceConfig } from "./types";

const DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv"];
const DEFAULT_FETCH_TIMEOUT_MS = 15000;
const MFE_DISCOVERY_TERMS = [
  "apel",
  "apeluri",
  "ghid",
  "finantare",
  "finanțare",
  "proiecte",
  "lansare",
  "consultare",
  "calendar",
  "peo",
  "podd",
  "ptj",
  "pids",
  "pocid",
  "programul sanatate",
];

const DEFAULT_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
];

function parseUserAgents() {
  const configured = process.env.SOURCE_USER_AGENTS?.trim();
  if (!configured) return DEFAULT_USER_AGENTS;
  return configured
    .split("||")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildRequestAttempts(url: string) {
  const direct = [url];
  const proxyPrefix = process.env.SOURCE_PROXY_PREFIX?.trim();
  const browserPrefix = process.env.SOURCE_BROWSER_RENDERER_PREFIX?.trim();

  if (proxyPrefix) direct.push(`${proxyPrefix}${encodeURIComponent(url)}`);
  if (browserPrefix) direct.push(`${browserPrefix}${encodeURIComponent(url)}`);

  return direct;
}

function buildRequestUrls(url: string) {
  return buildRequestAttempts(url);
}

function isWafLikeStatus(status: number) {
  return status === 403 || status === 406 || status === 429 || status === 503;
}

function buildHeaders(userAgent: string) {
  return {
    "user-agent": `${userAgent} FundingRadar/0.1`,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
    "accept-language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7",
    "cache-control": "no-cache",
    pragma: "no-cache",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "upgrade-insecure-requests": "1",
  };
}

function absoluteUrl(href: string, base: string) {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function envInt(name: string, fallback: number) {
  const raw = process.env[name];
  const value = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(value) ? value : fallback;
}

function stripDiacritics(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[țţ]/gi, (match) => (match === match.toUpperCase() ? "T" : "t"))
    .replace(/[șş]/gi, (match) => (match === match.toUpperCase() ? "S" : "s"));
}

function normalizeForMatch(value: string) {
  return stripDiacritics(value).toLowerCase().replace(/\s+/g, " ").trim();
}

export function inferDocumentType(url: string) {
  const cleanUrl = url.toLowerCase().split("?")[0] ?? "";
  const extension = DOCUMENT_EXTENSIONS.find((item) => cleanUrl.endsWith(item));
  return extension ? extension.slice(1) : null;
}

export function looksLikeFundingCall(text: string, href: string) {
  const haystack = normalizeForMatch(`${text} ${href}`);
  const positive = ["apel", "ghid", "finantare", "finantari", "proiecte", "consultare", "lansat", "lansare", "calendar", "peo", "podd", "pos", "ptj", "por", "pids", "program", "mysmis", "grant", "fonduri", "cerere de finantare", ".pdf", ".docx", ".xlsx"];
  const negative = ["facebook", "twitter", "x.com", "linkedin", "youtube", "instagram", "privacy", "cookie", "contact", "wp-content/uploads/logo", "javascript:", "mailto:", "tel:"];
  return positive.some((word) => haystack.includes(word)) && !negative.some((word) => haystack.includes(word));
}

export function inferStatus(title: string) {
  const t = normalizeForMatch(title);
  if (t.includes("consultare")) return "consultare publica";
  if (t.includes("lansat") || t.includes("lansare")) return "lansat";
  if (t.includes("inchis")) return "inchis";
  if (t.includes("prelung")) return "prelungit";
  if (t.includes("calendar")) return "calendar";
  if (t.includes("ghid")) return "ghid";
  return null;
}

function normalizeTitle(title: string) {
  return title.replace(/\s+/g, " ").trim().slice(0, 500);
}

function titleFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    return normalizeTitle(decodeURIComponent(last).replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "));
  } catch {
    return "";
  }
}

function nearbyTitle($: CheerioAPI, element: AnyNode) {
  const container = $(element).closest("article, li, tr, .card, .post, .entry, .elementor-post, .wp-block-post, .vc_grid-item, .item, .news-item, .post-item");
  const heading = normalizeTitle(container.find("h1, h2, h3, h4, h5, .entry-title, .post-title, .title, .card-title").first().text());
  if (heading) return heading;
  const rowText = normalizeTitle(container.text());
  return rowText.length >= 12 ? rowText : "";
}

function bestLinkTitle($: CheerioAPI, element: AnyNode, url: string) {
  const candidates = [
    normalizeTitle($(element).text()),
    normalizeTitle($(element).attr("aria-label") ?? ""),
    normalizeTitle($(element).attr("title") ?? ""),
    nearbyTitle($, element),
    titleFromUrl(url),
  ].filter(Boolean);
  return candidates[0] ?? titleFromUrl(url);
}

async function fetchTextWithFallback(urls: string[]) {
  const timeoutMs = envInt("SOURCE_FETCH_TIMEOUT_MS", DEFAULT_FETCH_TIMEOUT_MS);
  const errors: string[] = [];
  const userAgents = parseUserAgents();

  for (const attemptUrl of urls) {
    for (const userAgent of userAgents) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(attemptUrl, {
          headers: buildHeaders(userAgent),
          cache: "no-store",
          redirect: "follow",
          signal: controller.signal,
        });
        if (!res.ok) {
          errors.push(`Source fetch failed: ${attemptUrl} ${res.status}`);
          if (!isWafLikeStatus(res.status)) break;
          continue;
        }
        return { body: await res.text(), requestUrl: attemptUrl };
      } catch (err) {
        errors.push(err instanceof Error && err.name === "AbortError" ? `Source fetch timed out after ${timeoutMs}ms: ${attemptUrl}` : err instanceof Error ? err.message : String(err));
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  throw new Error(errors.join(" | "));
}

function dedupeLinks(links: ExtractedLink[]) {
  const unique = new Map<string, ExtractedLink>();
  for (const link of links) {
    const key = link.url.toLowerCase().replace(/\/$/, "");
    if (!unique.has(key)) unique.set(key, link);
  }
  return Array.from(unique.values());
}

function extractFromHtml(raw: string, source: SourceConfig, baseUrl: string): ExtractedLink[] {
  const $ = cheerio.load(raw);
  const links: ExtractedLink[] = [];
  $("a").each((_, element) => {
    const rawHref = $(element).attr("href");
    if (!rawHref) return;
    const url = absoluteUrl(rawHref, baseUrl);
    if (!url) return;
    const title = bestLinkTitle($, element, url);
    const documentType = inferDocumentType(url);
    if (!title || (!documentType && title.length < 8)) return;
    if (!looksLikeFundingCall(title, url)) return;
    links.push({ title, url, sourceName: source.name, programHint: source.programHint ?? null, status: inferStatus(title), documentType });
  });
  return links;
}

function extractFromWordPressJson(raw: string, source: SourceConfig) {
  const data = JSON.parse(raw) as Array<{ link?: string; title?: { rendered?: string } | string; url?: string }>;
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const url = item.link ?? item.url ?? "";
      const titleValue = typeof item.title === "string" ? item.title : item.title?.rendered ?? "";
      const title = normalizeTitle(titleValue || titleFromUrl(url));
      return { title, url };
    })
    .filter((item) => item.url && item.title && looksLikeFundingCall(item.title, item.url))
    .map((item) => ({ title: item.title, url: item.url, sourceName: source.name, programHint: source.programHint ?? null, status: inferStatus(item.title), documentType: inferDocumentType(item.url) }));
}

function extractFromSitemapXml(raw: string, source: SourceConfig) {
  const $ = cheerio.load(raw, { xmlMode: true });
  const links: ExtractedLink[] = [];
  $("url > loc").each((_, element) => {
    const url = normalizeTitle($(element).text());
    const title = normalizeTitle(titleFromUrl(url));
    if (!url || !looksLikeFundingCall(title, url)) return;
    links.push({ title: title || url, url, sourceName: source.name, programHint: source.programHint ?? null, status: inferStatus(title), documentType: inferDocumentType(url) });
  });
  return links;
}

async function discoverMfeLinks(source: SourceConfig) {
  const discoveryUrls = new Set<string>(source.fallbackUrls ?? []);
  for (const term of MFE_DISCOVERY_TERMS) {
    discoveryUrls.add(`https://mfe.gov.ro/wp-json/wp/v2/search?search=${encodeURIComponent(term)}&per_page=100`);
    discoveryUrls.add(`https://mfe.gov.ro/wp-json/wp/v2/pages?search=${encodeURIComponent(term)}&_fields=link,title&per_page=100`);
    discoveryUrls.add(`https://mfe.gov.ro/wp-json/wp/v2/posts?search=${encodeURIComponent(term)}&_fields=link,title&per_page=100`);
  }

  const pageCandidates = new Set<string>();
  const links: ExtractedLink[] = [];

  for (const candidate of [source.url, ...Array.from(discoveryUrls)]) {
    try {
      const { body, requestUrl } = await fetchTextWithFallback(buildRequestUrls(candidate));
      if (candidate.includes("/wp-json/")) {
        const discovered = extractFromWordPressJson(body, source);
        for (const link of discovered) {
          links.push(link);
          pageCandidates.add(link.url);
        }
        continue;
      }
      if (candidate.endsWith(".xml") || body.includes("<urlset")) {
        const discovered = extractFromSitemapXml(body, source);
        for (const link of discovered) {
          links.push(link);
          pageCandidates.add(link.url);
        }
        continue;
      }
      for (const link of extractFromHtml(body, source, requestUrl)) {
        links.push(link);
        pageCandidates.add(link.url);
      }
    } catch {
      // continue discovery on next candidate
    }
  }

  for (const pageUrl of Array.from(pageCandidates).slice(0, 80)) {
    try {
      const docs = await fetchDocumentLinksFromPage(pageUrl, `${source.name} documente`);
      links.push(...docs.map((doc) => ({ ...doc, programHint: doc.programHint ?? source.programHint ?? null })));
    } catch {
      // best effort for page-level document discovery
    }
  }

  return dedupeLinks(links).slice(0, 250);
}

export async function fetchDocumentLinksFromPage(pageUrl: string, sourceName: string): Promise<ExtractedLink[]> {
  const { body, requestUrl } = await fetchTextWithFallback(buildRequestUrls(pageUrl));
  const links = extractFromHtml(body, { name: sourceName, url: pageUrl, type: "html", enabled: true }, requestUrl).filter((item) => Boolean(item.documentType));
  return dedupeLinks(links).slice(0, 20);
}

export async function fetchSourceLinks(source: SourceConfig): Promise<ExtractedLink[]> {
  if (source.type === "discovery") {
    const discovered = await discoverMfeLinks(source);
    if (discovered.length > 0) return discovered;
    throw new Error(`Discovery produced no links for ${source.name}`);
  }

  const candidates = [source.url, ...(source.fallbackUrls ?? [])];
  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      const { body, requestUrl } = await fetchTextWithFallback(buildRequestUrls(candidate));
      const links = candidate.includes("/wp-json/") ? extractFromWordPressJson(body, source) : candidate.endsWith(".xml") || body.includes("<urlset") ? extractFromSitemapXml(body, source) : extractFromHtml(body, source, requestUrl);
      const deduped = dedupeLinks(links).slice(0, 120);
      if (deduped.length > 0) return deduped;
      errors.push(`No candidate links matched for ${candidate}`);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  throw new Error(errors.join(" | "));
}
