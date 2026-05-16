import * as cheerio from "cheerio";
import type { ExtractedLink, SourceConfig } from "./types";

const DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv"];

function absoluteUrl(href: string, base: string) {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export function inferDocumentType(url: string) {
  const cleanUrl = url.toLowerCase().split("?")[0] ?? "";
  const extension = DOCUMENT_EXTENSIONS.find((item) => cleanUrl.endsWith(item));
  return extension ? extension.slice(1) : null;
}

export function looksLikeFundingCall(text: string, href: string) {
  const haystack = `${text} ${href}`.toLowerCase();

  const positive = [
    "apel",
    "ghid",
    "finantare",
    "proiecte",
    "consultare",
    "lansat",
    "calendar",
    "peo",
    "podd",
    "pos",
    "ptj",
    "por",
    "pids",
    "program",
    "mysmis",
    ".pdf",
    ".docx",
    ".xlsx",
  ];

  const negative = [
    "facebook",
    "twitter",
    "linkedin",
    "youtube",
    "privacy",
    "cookie",
    "contact",
    "wp-content/uploads/logo",
    "javascript:",
    "mailto:",
  ];

  return positive.some((word) => haystack.includes(word)) && !negative.some((word) => haystack.includes(word));
}

export function inferStatus(title: string) {
  const t = title.toLowerCase();
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

export async function fetchSourceLinks(source: SourceConfig): Promise<ExtractedLink[]> {
  const res = await fetch(source.url, {
    headers: {
      "user-agent": "FundingRadarBot/0.1 (+internal research assistant)",
      accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Source fetch failed: ${source.url} ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const links: ExtractedLink[] = [];

  $("a").each((_, element) => {
    const rawHref = $(element).attr("href");
    const title = normalizeTitle($(element).text());

    if (!rawHref || !title || title.length < 8) return;

    const url = absoluteUrl(rawHref, source.url);
    if (!url) return;

    if (!looksLikeFundingCall(title, url)) return;

    links.push({
      title,
      url,
      sourceName: source.name,
      programHint: source.programHint ?? null,
      status: inferStatus(title),
      documentType: inferDocumentType(url),
    });
  });

  const unique = new Map<string, ExtractedLink>();
  for (const link of links) {
    const key = link.url.toLowerCase().replace(/\/$/, "");
    if (!unique.has(key)) unique.set(key, link);
  }

  return Array.from(unique.values()).slice(0, 120);
}
