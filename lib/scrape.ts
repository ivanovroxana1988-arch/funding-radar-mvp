import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import type { ExtractedLink, SourceConfig } from "./types";

const DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv"];
const DEFAULT_FETCH_TIMEOUT_MS = 15000;

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

  const positive = [
    "apel",
    "ghid",
    "finantare",
    "finantari",
    "proiecte",
    "consultare",
    "lansat",
    "lansare",
    "calendar",
    "peo",
    "podd",
    "pos",
    "ptj",
    "por",
    "pids",
    "program",
    "mysmis",
    "grant",
    "fonduri",
    "cerere de finantare",
    ".pdf",
    ".docx",
    ".xlsx",
  ];

  const negative = [
    "facebook",
    "twitter",
    "x.com",
    "linkedin",
    "youtube",
    "instagram",
    "privacy",
    "cookie",
    "contact",
    "wp-content/uploads/logo",
    "javascript:",
    "mailto:",
    "tel:",
  ];

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

function isGenericLinkTitle(title: string) {
  const t = normalizeForMatch(title);
  return [
    "citeste mai mult",
    "citeste mai departe",
    "mai mult",
    "detalii",
    "vezi detalii",
    "read more",
    "download",
    "descarca",
  ].includes(t);
}

function titleFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    return normalizeTitle(
      decodeURIComponent(last)
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[-_]+/g, " ")
    );
  } catch {
    return "";
  }
}

function nearbyTitle($: CheerioAPI, element: AnyNode) {
  const container = $(element).closest(
    "article, li, tr, .card, .post, .entry, .elementor-post, .wp-block-post, .vc_grid-item, .item, .news-item, .post-item"
  );

  const heading = normalizeTitle(
    container.find("h1, h2, h3, h4, h5, .entry-title, .post-title, .title, .card-title").first().text()
  );

  if (heading) return heading;

  const rowText = normalizeTitle(container.text());
  return rowText.length >= 12 ? rowText : "";
}

function bestLinkTitle($: CheerioAPI, element: AnyNode, url: string) {
  const rawText = normalizeTitle($(element).text());
  const aria = normalizeTitle($(element).attr("aria-label") ?? "");
  const titleAttr = normalizeTitle($(element).attr("title") ?? "");
  const urlTitle = titleFromUrl(url);
  const neighbor = nearbyTitle($, element);

  const candidates = [rawText, aria, titleAttr, neighbor, urlTitle]
    .map(normalizeTitle)
    .filter(Boolean)
    .filter((item) => !isGenericLinkTitle(item));

  return candidates[0] ?? rawText ?? urlTitle;
}

async function fetchHtml(url: string) {
  const timeoutMs = envInt("SOURCE_FETCH_TIMEOUT_MS", DEFAULT_FETCH_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 FundingRadar/0.1",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Source fetch failed: ${url} ${res.status}`);
    }

    return res.text();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Source fetch timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchDocumentLinksFromPage(pageUrl: string, sourceName: string): Promise<ExtractedLink[]> {
  const html = await fetchHtml(pageUrl);
  const $ = cheerio.load(html);
  const documents: ExtractedLink[] = [];

  $("a").each((_, element) => {
    const rawHref = $(element).attr("href");
    if (!rawHref) return;

    const url = absoluteUrl(rawHref, pageUrl);
    if (!url) return;

    const documentType = inferDocumentType(url);
    if (!documentType) return;

    const title = bestLinkTitle($, element, url) || url.split("/").pop() || url;
    documents.push({
      title,
      url,
      sourceName,
      documentType,
      status: inferStatus(title),
    });
  });

  const unique = new Map<string, ExtractedLink>();
  for (const document of documents) {
    const key = document.url.toLowerCase().replace(/\/$/, "");
    if (!unique.has(key)) unique.set(key, document);
  }

  return Array.from(unique.values()).slice(0, 20);
}

export async function fetchSourceLinks(source: SourceConfig): Promise<ExtractedLink[]> {
  const html = await fetchHtml(source.url);
  const $ = cheerio.load(html);
  const links: ExtractedLink[] = [];

  $("a").each((_, element) => {
    const rawHref = $(element).attr("href");
    if (!rawHref) return;

    const url = absoluteUrl(rawHref, source.url);
    if (!url) return;

    const documentType = inferDocumentType(url);
    const title = bestLinkTitle($, element, url);

    if (!title || (!documentType && title.length < 8)) return;
    if (!looksLikeFundingCall(title, url)) return;

    links.push({
      title,
      url,
      sourceName: source.name,
      programHint: source.programHint ?? null,
      status: inferStatus(title),
      documentType,
    });
  });

  const unique = new Map<string, ExtractedLink>();
  for (const link of links) {
    const key = link.url.toLowerCase().replace(/\/$/, "");
    if (!unique.has(key)) unique.set(key, link);
  }

  return Array.from(unique.values()).slice(0, 120);
}
