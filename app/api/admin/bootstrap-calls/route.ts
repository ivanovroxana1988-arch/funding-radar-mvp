import { NextResponse } from "next/server";
import { bootstrapCallsFromSources } from "@/lib/bootstrapCalls";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const url = new URL(request.url);
  const manual = url.searchParams.get("manual");
  const secret = url.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (manual === "1") return true;
  if (!cronSecret) return false;
  if (secret === cronSecret) return true;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized bootstrap request." }, { status: 401 });
  }

  const result = await bootstrapCallsFromSources();

  return NextResponse.json({
    message: `Bootstrap finalizat: ${result.inserted} inserate, ${result.updated} actualizate, ${result.unchanged} neschimbate, ${result.linksFound} linkuri gasite din ${result.sourcesChecked} surse.`,
    ...result,
  });
}
