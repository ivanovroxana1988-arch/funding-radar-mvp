import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectIdeaId = url.searchParams.get("project_idea_id");
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("saved_funding_calls")
    .select("*, funding_calls(*), project_ideas(title)")
    .order("created_at", { ascending: false });

  if (projectIdeaId) query = query.eq("project_idea_id", projectIdeaId);

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved_calls: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (!body.call_id) {
    return NextResponse.json({ error: "Missing call_id." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("saved_funding_calls")
    .upsert(
      {
        call_id: String(body.call_id),
        project_idea_id: body.project_idea_id ? String(body.project_idea_id) : null,
        note: body.note ? String(body.note) : null,
      },
      { onConflict: "call_id,project_idea_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved_call: data, message: "Apel salvat pentru analiza." });
}
