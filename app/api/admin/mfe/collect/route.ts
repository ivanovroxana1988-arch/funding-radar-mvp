import { NextResponse } from "next/server";
import { runMfeCollection } from "@/lib/mfeCollector";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const seedSet = typeof body.seed_set === "string" ? body.seed_set : "core";
  try {
    const result = await runMfeCollection(seedSet, "manual");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Collection failed" }, { status: 500 });
  }
}
