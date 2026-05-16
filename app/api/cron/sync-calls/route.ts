import { NextResponse } from "next/server";
import { syncAllSources } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const manual = url.searchParams.get("manual");
  const cronSecret = process.env.CRON_SECRET;

  if (manual === "1" && process.env.NODE_ENV !== "production") return true;
  if (!cronSecret) return false;
  if (secret === cronSecret) return true;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${cronSecret}`) return true;

  const userAgent = request.headers.get("user-agent") ?? "";
  if (userAgent.includes("vercel-cron")) return true;

  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  const result = await syncAllSources();

  return NextResponse.json({
    message: `Sync finalizat: ${result.insertedOrUpdated} apeluri procesate, ${result.documentsSaved} documente salvate.`,
    ...result,
  });
}
