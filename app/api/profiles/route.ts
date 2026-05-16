import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("funding_profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profiles: data ?? [] });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const profilePrompt = typeof body.profile_prompt === "string" ? body.profile_prompt.trim() : "";

  if (!name || !profilePrompt) {
    return NextResponse.json({ error: "Completeaza numele profilului si descrierea libera." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("funding_profiles")
    .upsert(
      {
        name,
        description: body.description ? String(body.description) : null,
        profile_prompt: profilePrompt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "name" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data, message: "Profil salvat." });
}
