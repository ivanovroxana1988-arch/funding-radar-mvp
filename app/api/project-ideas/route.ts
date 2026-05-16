import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function arrayFromBody(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("project_ideas")
    .select("*, funding_profiles(name, description)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project_ideas: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (!body.title || !body.description) {
    return NextResponse.json({ error: "Missing title or description." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_ideas")
    .insert({
      profile_id: body.profile_id || null,
      title: String(body.title),
      description: String(body.description),
      beneficiaries: arrayFromBody(body.beneficiaries),
      activities: arrayFromBody(body.activities),
      target_region: body.target_region ? String(body.target_region) : null,
      budget_min: numberOrNull(body.budget_min),
      budget_max: numberOrNull(body.budget_max),
      complexity: body.complexity ? String(body.complexity) : null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project_idea: data });
}
