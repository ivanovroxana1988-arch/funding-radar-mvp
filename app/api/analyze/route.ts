import { NextResponse } from "next/server";
import { analyzeFundingCall } from "@/lib/analyze";
import { extractReadableTextFromUrl } from "@/lib/documentText";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const callId = body.call_id;
  const profileId = typeof body.profile_id === "string" ? body.profile_id : null;

  if (!callId || typeof callId !== "string") {
    return NextResponse.json({ error: "Missing call_id." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: call, error: readError } = await supabase
    .from("funding_calls")
    .select("*")
    .eq("id", callId)
    .single();

  if (readError || !call) {
    return NextResponse.json({ error: readError?.message ?? "Call not found." }, { status: 404 });
  }

  const { data: profile } = profileId
    ? await supabase.from("funding_profiles").select("*").eq("id", profileId).maybeSingle()
    : { data: null };

  let pageText = "";
  let extractionError: string | null = null;

  try {
    pageText = await extractReadableTextFromUrl(call.source_url);
  } catch (err) {
    extractionError = err instanceof Error ? err.message : String(err);
  }

  const analysis = await analyzeFundingCall({
    title: call.title,
    source_url: call.source_url,
    source_name: call.source_name,
    existing_program: call.program,
    existing_status: call.status,
    page_text: pageText || extractionError || "",
    profile: profile?.profile_prompt ?? null,
  });

  const manualChecks = [
    ...analysis.manual_checks,
    ...(extractionError ? [`Textul sursei nu a putut fi extras complet: ${extractionError}`] : []),
  ];

  const { error: updateError } = await supabase
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
      manual_checks: manualChecks,
      keywords: analysis.keywords,
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", callId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (profileId) {
    await supabase.from("funding_matches").upsert(
      {
        call_id: callId,
        profile_id: profileId,
        score: Math.round(analysis.relevance_score),
        rationale: analysis.recommendation,
        risks: analysis.risks,
        recommendation: analysis.recommendation,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "call_id,profile_id" }
    );
  }

  return NextResponse.json({
    message: "Analiza finalizata.",
    analysis,
  });
}
