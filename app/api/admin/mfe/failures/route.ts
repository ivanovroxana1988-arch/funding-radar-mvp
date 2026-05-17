import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("raw_source_items")
    .select("run_id, discovered_url, final_url, http_status, parse_status, error_message, collected_at")
    .or("http_status.gte.400,parse_status.in.(blocked,download_failed,parse_failed)")
    .order("collected_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
