import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("raw_source_items")
    .update({ parse_status: "pending", processed_at: null })
    .in("parse_status", ["parsed", "no_fields", "parse_failed"])
    .select("id", { count: "exact" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reset_items: data?.length ?? 0 });
}
