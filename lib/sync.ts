import { getSupabaseAdmin } from "./supabaseAdmin";
import { SOURCES } from "./sources";
import { fetchSourceLinks } from "./scrape";

function fingerprint(url: string) {
  return Buffer.from(url.toLowerCase().replace(/\/$/, "")).toString("base64url").slice(0, 180);
}

export async function syncAllSources() {
  const supabase = getSupabaseAdmin();

  let insertedOrUpdated = 0;
  let documentsSaved = 0;
  const errors: string[] = [];

  for (const source of SOURCES.filter((item) => item.enabled)) {
    try {
      const links = await fetchSourceLinks(source);

      for (const link of links) {
        const { data: call, error } = await supabase
          .from("funding_calls")
          .upsert(
            {
              external_id: fingerprint(link.url),
              title: link.title,
              source_name: link.sourceName,
              source_url: link.url,
              program: link.programHint ?? null,
              status: link.status ?? null,
              raw_payload: link,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "external_id" }
          )
          .select("id")
          .single();

        if (error) throw error;
        insertedOrUpdated++;

        if (call?.id && link.documentType) {
          const { error: documentError } = await supabase.from("funding_documents").upsert(
            {
              call_id: call.id,
              title: link.title,
              document_url: link.url,
              document_type: link.documentType,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "call_id,document_url" }
          );

          if (documentError) throw documentError;
          documentsSaved++;
        }
      }

      await supabase.from("sync_runs").insert({
        source_name: source.name,
        source_url: source.url,
        status: "success",
        items_found: links.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${source.name}: ${message}`);

      await supabase.from("sync_runs").insert({
        source_name: source.name,
        source_url: source.url,
        status: "error",
        error_message: message,
      });
    }
  }

  return {
    insertedOrUpdated,
    documentsSaved,
    errors,
  };
}
