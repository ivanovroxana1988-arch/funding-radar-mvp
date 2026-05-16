import { NextResponse } from "next/server";
import { analyzeFundingCall } from "@/lib/analyze";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function envInt(name: string, fallback: number) {
  const raw = process.env[name];
  const value = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(value) ? value : fallback;
}

function projectPrompt(projectIdea: any, profile: any) {
  return `
Profil stabil:
${profile?.profile_prompt ?? "Profil general de finantare."}

Idee concreta de proiect:
Titlu: ${projectIdea.title}
Descriere: ${projectIdea.description}
Beneficiari: ${(projectIdea.beneficiaries ?? []).join(", ")}
Activitati: ${(projectIdea.activities ?? []).join(", ")}
Regiune tinta: ${projectIdea.target_region ?? "nespecificat"}
Buget minim: ${projectIdea.budget_min ?? "nespecificat"}
Buget maxim: ${projectIdea.budget_max ?? "nespecificat"}
Complexitate acceptata: ${projectIdea.complexity ?? "nespecificat"}

Evalueaza potrivirea strict pentru aceasta idee, nu generic pentru profil. Explica de ce se potriveste, ce conditii trebuie verificate, riscurile si daca merita analizat, aplicat ca solicitant sau doar ca partener.
`;
}

function callContext(call: any) {
  return [
    call.summary ? `Rezumat existent: ${call.summary}` : "",
    call.applicant_eligibility?.length ? `Eligibilitate: ${call.applicant_eligibility.join("; ")}` : "",
    call.eligible_activities?.length ? `Activitati eligibile: ${call.eligible_activities.join("; ")}` : "",
    call.budget_text ? `Buget: ${call.budget_text}` : "",
    call.cofinancing_text ? `Cofinantare: ${call.cofinancing_text}` : "",
    call.region_text ? `Regiune: ${call.region_text}` : "",
    call.deadline_text ? `Deadline: ${call.deadline_text}` : "",
    call.risks?.length ? `Riscuri existente: ${call.risks.join("; ")}` : "",
    call.keywords?.length ? `Cuvinte cheie: ${call.keywords.join(", ")}` : "",
  ].filter(Boolean).join("\n");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectIdeaId = url.searchParams.get("project_idea_id");

  if (!projectIdeaId) {
    return NextResponse.json({ error: "Missing project_idea_id." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("funding_matches")
    .select("*, funding_calls(*), project_ideas(title)")
    .eq("project_idea_id", projectIdeaId)
    .order("score", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ matches: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const projectIdeaId = body.project_idea_id;
  const limit = Math.min(Number(body.limit) || envInt("MATCH_ANALYZE_LIMIT", 20), 50);

  if (!projectIdeaId || typeof projectIdeaId !== "string") {
    return NextResponse.json({ error: "Missing project_idea_id." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY." }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();

  const { data: projectIdea, error: ideaError } = await supabase
    .from("project_ideas")
    .select("*, funding_profiles(*)")
    .eq("id", projectIdeaId)
    .single();

  if (ideaError || !projectIdea) {
    return NextResponse.json({ error: ideaError?.message ?? "Project idea not found." }, { status: 404 });
  }

  const { data: calls, error: callsError } = await supabase
    .from("funding_calls")
    .select("*")
    .order("relevance_score", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (callsError) {
    return NextResponse.json({ error: callsError.message }, { status: 500 });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const call of calls ?? []) {
    try {
      const analysis = await analyzeFundingCall({
        title: call.title,
        source_url: call.source_url,
        source_name: call.source_name,
        existing_program: call.program,
        existing_status: call.status,
        page_text: callContext(call),
        profile: projectPrompt(projectIdea, projectIdea.funding_profiles),
      });

      const { error: matchError } = await supabase.from("funding_matches").upsert(
        {
          call_id: call.id,
          profile_id: projectIdea.profile_id,
          project_idea_id: projectIdea.id,
          score: Math.round(analysis.relevance_score),
          rationale: analysis.recommendation,
          risks: analysis.risks,
          recommendation: analysis.recommendation,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "call_id,project_idea_id" }
      );

      if (matchError) throw matchError;
      processed++;
    } catch (err) {
      errors.push(`${call.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    message: `Potriviri calculate pentru ${processed} apeluri.`,
    processed,
    errors,
  });
}
