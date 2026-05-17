import { createHash } from "crypto";
import { fetchSourceLinks } from "./scrape";
import { SOURCES } from "./sources";
import { getSupabaseAdmin } from "./supabaseAdmin";

function normalizeUrl(url: string) {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function inferItemType(url: string) {
  const clean = url.toLowerCase().split("?")[0] ?? "";
  if (clean.endsWith(".pdf")) return "pdf";
  if (clean.endsWith(".doc")) return "doc";
  if (clean.endsWith(".docx")) return "docx";
  if (clean.endsWith(".xls")) return "xls";
  if (clean.endsWith(".xlsx")) return "xlsx";
  if (clean.endsWith(".csv")) return "csv";
  if (clean.endsWith(".txt")) return "txt";
  return "html";
}

export async function runMfeCollection(seedSet: string, triggerType: "manual" | "scheduled" | "reprocess" = "manual") {
  const supabase = getSupabaseAdmin();
  const source = SOURCES.find((item) => item.name === "MFE Discovery");
  if (!source) throw new Error("MFE Discovery source not configured.");

  const { data: run, error: runError } = await supabase
    .from("import_runs")
    .insert({ seed_set: seedSet, trigger_type: triggerType, status: "running" })
    .select("id")
    .single();
  if (runError || !run) throw runError ?? new Error("Failed to create import run.");

  const runId = run.id as string;
  let pagesSucceeded = 0;
  let pagesFailed = 0;
  let callsUpserted = 0;

  try {
    const links = await fetchSourceLinks(source);
    for (const link of links) {
      const canonicalUrl = normalizeUrl(link.url);
      const payload = JSON.stringify(link);
      const { data: rawItem, error: rawError } = await supabase
        .from("raw_source_items")
        .insert({
          run_id: runId,
          source_name: link.sourceName,
          discovery_method: "link_discovery",
          seed_url: source.url,
          discovered_url: link.url,
          final_url: link.url,
          canonical_url: canonicalUrl,
          item_type: inferItemType(link.url),
          http_status: 200,
          title: link.title,
          body_text: link.title,
          extracted_json: link,
          content_hash: hashText(payload),
          parse_status: "parsed",
          processed_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (rawError || !rawItem) {
        pagesFailed++;
        continue;
      }

      const externalId = Buffer.from(canonicalUrl.toLowerCase()).toString("base64url").slice(0, 180);
      const { error: upsertError } = await supabase.from("funding_calls").upsert(
        {
          external_id: externalId,
          title: link.title,
          source_name: link.sourceName,
          source_url: link.url,
          canonical_url: canonicalUrl,
          source_item_id: rawItem.id,
          status: link.status ?? null,
          program: link.programHint ?? null,
          raw_payload: link,
          fingerprint: hashText(`${link.title}|${canonicalUrl}`),
          search_key: link.title.toLowerCase(),
          documents: link.documentType ? [{ url: link.url, type: link.documentType }] : [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "external_id" }
      );

      if (upsertError) {
        pagesFailed++;
        continue;
      }

      pagesSucceeded++;
      callsUpserted++;
    }

    const status = pagesFailed > 0 ? "completed_with_warnings" : "completed";
    await supabase
      .from("import_runs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        pages_attempted: pagesSucceeded + pagesFailed,
        pages_succeeded: pagesSucceeded,
        pages_failed: pagesFailed,
        items_parsed: pagesSucceeded,
        calls_upserted: callsUpserted,
        warnings_count: pagesFailed,
      })
      .eq("id", runId);

    return { runId, status, pagesSucceeded, pagesFailed, callsUpserted };
  } catch (error) {
    await supabase
      .from("import_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        pages_attempted: pagesSucceeded + pagesFailed,
        pages_succeeded: pagesSucceeded,
        pages_failed: pagesFailed,
        calls_upserted: callsUpserted,
        error_message: error instanceof Error ? error.message : String(error),
      })
      .eq("id", runId);
    throw error;
  }
}
