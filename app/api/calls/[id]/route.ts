import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = getSupabaseAdmin();

  const { data: call, error } = await supabase
    .from("funding_calls")
    .select("*, funding_documents(*), funding_matches(*)")
    .eq("id", id)
    .single();

  if (error || !call) {
    return NextResponse.json({ error: error?.message ?? "Call not found." }, { status: 404 });
  }

  return NextResponse.json({ call });
}
