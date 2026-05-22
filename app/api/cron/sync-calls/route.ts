import { NextResponse } from "next/server";
import { syncAllSources } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const url = new URL(request.url);
  const manual = url.searchParams.get("manual");
  const secret = url.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (manual === "1") return true;
  if (cronSecret && secret === cronSecret) return true;

  const auth = request.headers.get("authorization");
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  const userAgent = request.headers.get("user-agent") ?? "";
  if (userAgent.includes("vercel-cron")) return true;

  return false;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  try {
    const result = await syncAllSources();

    return NextResponse.json({
      message: `Sync finalizat: ${result.insertedOrUpdated} noi/modificate, ${result.unchanged} neschimbate, ${result.documentsSaved} documente, ${result.analyzedCalls} analizate AI, ${result.matchesSaved} potriviri salvate.`,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Sync esuat: ${message}` }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
