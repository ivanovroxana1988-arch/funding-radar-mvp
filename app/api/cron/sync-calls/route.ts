import { NextRequest, NextResponse } from "next/server"
import { syncAllSources } from "@/lib/sync"

export const maxDuration = 300 // 5 minutes for long-running sync
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // Allow Vercel Cron or manual trigger with secret
  const isVercelCron = request.headers.get("x-vercel-cron") === "1"
  const hasValidSecret =
    authHeader === `Bearer ${cronSecret}` && cronSecret

  if (!isVercelCron && !hasValidSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    console.log("Starting funding sources sync...")
    const startTime = Date.now()

    const results = await syncAllSources()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    const totalFound = results.reduce((sum, r) => sum + r.calls_found, 0)
    const totalNew = results.reduce((sum, r) => sum + r.calls_new, 0)

    console.log(
      `Sync completed in ${duration}s: ${totalFound} calls found, ${totalNew} new`
    )

    return NextResponse.json({
      success: true,
      duration: `${duration}s`,
      summary: {
        total_found: totalFound,
        total_new: totalNew,
        sources_synced: results.length,
      },
      results,
    })
  } catch (error) {
    console.error("Sync failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
