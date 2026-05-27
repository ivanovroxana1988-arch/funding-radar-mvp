import { analyzeFundingCall } from "./analyze";
import { extractReadableTextFromUrl } from "./documentText";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { SOURCES } from "./sources";
import { fetchDocumentLinksFromPage, fetchSourceLinks } from "./scrape";
import type { ExtractedLink } from "./types";

function fingerprint(url: string) {
  return Buffer.from(url.toLowerCase().replace(/\/$/, "")).toString("base64url").slice(0, 180);
}

function stablePayload(value: unknown) {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

function textHash(text: string) {
  return Buffer.from(text).toString("base64url").slice(0, 180);
}

function envInt(name: string, fallback: number) {
  const raw = process.env[name];
  const value = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(value) ? value : fallback;
}

async function saveDocumentText(input: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  callId: string;
  title: string;
  url: string;
  documentType: string;
}) {
  let extractedText: string | null = null;
  let hash: string | null = null;

  try {
    extractedText = await extractReadableTextFromUrl(input.url);
    hash = textHash(extractedText);
  } catch {
    extractedText = null;
    hash = null;
  }

  const { error } = await input.supabase.from("funding_documents").upsert(
    {
      call_id: input.callId,
      title: input.title,
      document_url: input.url,
      document_type: input.documentType,
      extracted_text: extractedText,
      text_hash: hash,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "call_id,document_url" }
  );

  if (error) throw error;
}

async function saveDocumentsForCall(input: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  callId: string;
  link: ExtractedLink;
  remainingLimit: number;
}) {
  const documents = input.link.documentType
    ? [input.link]
    : await fetchDocumentLinksFromPage(input.link.url, input.link.sourceName).catch(() => []);

  let saved = 0;
  for (const document of documents.slice(0, input.remainingLimit)) {
    if (!document.documentType) continue;
    await saveDocumentText({
      supabase: input.supabase,
      callId: input.callId,
      title: document.title,
      url: document.url,
      documentType: document.documentType,
    });
    saved++;
  }

  return saved;
}

async function analyzeCallForProfiles(input: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  callId: string;
  profileLimit: number;
}) {
  if (!process.env.OPENAI_API_KEY) return { analyzed: 0, matches: 0 };

  const { data: call, error: callError } = await input.supabase
    .from("funding_calls")
    .select("*")
    .eq("id", input.callId)
    .single();

  if (callError || !call) throw callError ?? new Error("Call not found for analysis.");

  const { data: documents } = await input.supabase
    .from("funding_documents")
    .select("extracted_text")
    .eq("call_id", input.callId)
    .not("extracted_text", "is", null)
    .limit(3);

  let pageText = "";
  try {
    pageText = await extractReadableTextFromUrl(call.source_url);
  } catch {
    pageText = "";
  }

  const documentText = (documents ?? [])
    .map((document) => document.extracted_text)
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 30000);

  const combinedText = [pageText, documentText].filter(Boolean).join("\n\n").slice(0, 60000);

  const { data: profiles } = await input.supabase
    .from("funding_profiles")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(input.profileLimit);

  const profileList = profiles?.length ? profiles : [{ id: null, profile_prompt: null }];
  let analyzed = 0;
  let matches = 0;

  for (const profile of profileList) {
    const analysis = await analyzeFundingCall({
      title: call.title,
      source_url: call.source_url,
      source_name: call.source_name,
      existing_program: call.program,
      existing_status: call.status,
      page_text: combinedText,
      profile: profile.profile_prompt,
    });

    if (analyzed === 0) {
      const { error: updateError } = await input.supabase
        .from("funding_calls")
        .update({
          summary: analysis.summary,
          program: analysis.program ?? call.program,
          status: analysis.status ?? call.status,
          applicant_eligibility: analysis.applicant_eligibility,
          eligible_activities: analysis.eligible_activities,
          budget_text: analysis.budget_text,
          cofinancing_text: analysis.cofinancing_text,
          region_text: analysis.region_text,
          deadline_text: analysis.deadline_text,
          deadline_at: analysis.deadline_at,
          relevance_score: Math.round(analysis.relevance_score),
          recommendation: analysis.recommendation,
          risks: analysis.risks,
          manual_checks: analysis.manual_checks,
          keywords: analysis.keywords,
          analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.callId);

      if (updateError) throw updateError;
    }

    if (profile.id) {
      const { error: matchError } = await input.supabase.from("funding_matches").upsert(
        {
          call_id: input.callId,
          profile_id: profile.id,
          score: Math.round(analysis.relevance_score),
          rationale: analysis.recommendation,
          risks: analysis.risks,
          recommendation: analysis.recommendation,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "call_id,profile_id" }
      );

      if (matchError) throw matchError;
      matches++;
    }

    analyzed++;
  }

  return { analyzed: 1, matches };
}

export async function syncAllSources(options: { quick?: boolean } = {}) {
  const supabase = getSupabaseAdmin();
  const documentLimit = options.quick ? 0 : envInt("SYNC_DOCUMENT_LIMIT", 8);
  const analyzeLimit = options.quick ? 0 : envInt("SYNC_ANALYZE_LIMIT", 2);
  const profileLimit = envInt("SYNC_PROFILE_LIMIT", 4);

  let insertedOrUpdated = 0;
  let unchanged = 0;
  let documentsSaved = 0;
  let analyzedCalls = 0;
  let matchesSaved = 0;
  const candidateIds = new Set<string>();
  const errors: string[] = [];

  for (const source of SOURCES.filter((item) => item.enabled)) {
    try {
      const links = await fetchSourceLinks(source);
      let documentsForSource = 0;

      for (const link of links) {
        const externalId = fingerprint(link.url);
        const { data: existing, error: existingError } = await supabase
          .from("funding_calls")
          .select("id, raw_payload, analyzed_at")
          .eq("external_id", externalId)
          .maybeSingle();

        if (existingError) throw existingError;

        const changed = existing ? stablePayload(existing.raw_payload ?? {}) !== stablePayload(link) : true;
        let callId = existing?.id as string | undefined;

        if (!existing) {
          const { data: call, error } = await supabase
            .from("funding_calls")
            .insert({
              external_id: externalId,
              title: link.title,
              source_name: link.sourceName,
              source_url: link.url,
              program: link.programHint ?? null,
              status: link.status ?? null,
              raw_payload: link,
            })
            .select("id")
            .single();

          if (error) throw error;
          callId = call.id;
          insertedOrUpdated++;
          candidateIds.add(call.id);
        } else if (changed) {
          const { error } = await supabase
            .from("funding_calls")
            .update({
              title: link.title,
              source_name: link.sourceName,
              source_url: link.url,
              program: link.programHint ?? null,
              status: link.status ?? null,
              raw_payload: link,
              analyzed_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) throw error;
          insertedOrUpdated++;
          candidateIds.add(existing.id);
        } else {
          unchanged++;
          if (!existing.analyzed_at) candidateIds.add(existing.id);
        }

        if (callId && documentsForSource < documentLimit) {
          const saved = await saveDocumentsForCall({
            supabase,
            callId,
            link,
            remainingLimit: documentLimit - documentsForSource,
          });
          documentsForSource += saved;
          documentsSaved += saved;
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

  for (const callId of Array.from(candidateIds).slice(0, analyzeLimit)) {
    try {
      const result = await analyzeCallForProfiles({ supabase, callId, profileLimit });
      analyzedCalls += result.analyzed;
      matchesSaved += result.matches;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`analysis ${callId}: ${message}`);
    }
  }

  return {
    insertedOrUpdated,
    unchanged,
    documentsSaved,
    analyzedCalls,
    matchesSaved,
    errors,
  };
}
