import { getSupabaseAdmin } from "./supabaseAdmin";
import { SOURCES } from "./sources";
import { fetchSourceLinks } from "./scrape";
import type { ExtractedLink } from "./types";

function fingerprint(url: string) {
  return Buffer.from(url.toLowerCase().replace(/\/$/, "")).toString("base64url").slice(0, 180);
}

function stablePayload(value: unknown) {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

function envInt(name: string, fallback: number) {
  const raw = process.env[name];
  const value = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(value) ? value : fallback;
}

function normalizeBootstrapPayload(link: ExtractedLink, sourceUrl: string) {
  return {
    ...link,
    bootstrap_source_url: sourceUrl,
    import_source: "automatic_bootstrap",
  };
}

export async function bootstrapCallsFromSources() {
  const supabase = getSupabaseAdmin();
  const sourceLimit = envInt("BOOTSTRAP_LINKS_PER_SOURCE", 80);

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let sourcesChecked = 0;
  let linksFound = 0;
  const errors: string[] = [];
  const sourceResults: Array<{
    source_name: string;
    status: "success" | "error";
    items_found: number;
    error_message?: string;
  }> = [];

  for (const source of SOURCES.filter((item) => item.enabled)) {
    sourcesChecked++;

    try {
      const links = (await fetchSourceLinks(source)).slice(0, sourceLimit);
      linksFound += links.length;

      for (const link of links) {
        const externalId = fingerprint(link.url);
        const rawPayload = normalizeBootstrapPayload(link, source.url);

        const { data: existing, error: existingError } = await supabase
          .from("funding_calls")
          .select("id, raw_payload")
          .eq("external_id", externalId)
          .maybeSingle();

        if (existingError) throw existingError;

        if (!existing) {
          const { error } = await supabase.from("funding_calls").insert({
            external_id: externalId,
            title: link.title,
            source_name: link.sourceName,
            source_url: link.url,
            program: link.programHint ?? null,
            status: link.status ?? null,
            raw_payload: rawPayload,
            summary: null,
            updated_at: new Date().toISOString(),
          });

          if (error) throw error;
          inserted++;
          continue;
        }

        const changed = stablePayload(existing.raw_payload ?? {}) !== stablePayload(rawPayload);
        if (!changed) {
          unchanged++;
          continue;
        }

        const { error } = await supabase
          .from("funding_calls")
          .update({
            title: link.title,
            source_name: link.sourceName,
            source_url: link.url,
            program: link.programHint ?? null,
            status: link.status ?? null,
            raw_payload: rawPayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
        updated++;
      }

      sourceResults.push({
        source_name: source.name,
        status: "success",
        items_found: links.length,
      });

      await supabase.from("sync_runs").insert({
        source_name: `[bootstrap] ${source.name}`,
        source_url: source.url,
        status: "success",
        items_found: links.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${source.name}: ${message}`);
      sourceResults.push({
        source_name: source.name,
        status: "error",
        items_found: 0,
        error_message: message,
      });

      await supabase.from("sync_runs").insert({
        source_name: `[bootstrap] ${source.name}`,
        source_url: source.url,
        status: "error",
        error_message: message,
      });
    }
  }

  return {
    sourcesChecked,
    linksFound,
    inserted,
    updated,
    unchanged,
    errors,
    sourceResults,
  };
}
