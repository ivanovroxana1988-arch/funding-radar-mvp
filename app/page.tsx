import { supabaseAdmin } from "@/lib/supabase"
import { CallsTable } from "@/components/calls-table"
import { SyncStatus } from "@/components/sync-status"

export const revalidate = 60 // Revalidate every minute

async function getCalls() {
  const { data: calls, error } = await supabaseAdmin
    .from("calls")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("Error fetching calls:", error)
    return []
  }

  return calls || []
}

async function getLastSync() {
  const { data: logs } = await supabaseAdmin
    .from("sync_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(5)

  return logs || []
}

export default async function HomePage() {
  const [calls, syncLogs] = await Promise.all([getCalls(), getLastSync()])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">
            Funding Radar
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitorizare apeluri de finantare europene
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <SyncStatus logs={syncLogs} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Apeluri de Finantare ({calls.length})
            </h2>
          </div>

          <CallsTable calls={calls} />
        </div>
      </main>
    </div>
  )
}
