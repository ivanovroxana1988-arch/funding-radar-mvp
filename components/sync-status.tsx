"use client"

import type { SyncLog } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react"

interface SyncStatusProps {
  logs: SyncLog[]
}

export function SyncStatus({ logs }: SyncStatusProps) {
  const lastSync = logs[0]

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("ro-RO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const totalCalls = logs.reduce((sum, log) => sum + (log.calls_new || 0), 0)
  const successCount = logs.filter((log) => log.status === "success").length

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ultima Sincronizare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {lastSync ? (
              <>
                {lastSync.status === "success" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : lastSync.status === "running" ? (
                  <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-lg font-semibold">
                  {formatDateTime(lastSync.started_at)}
                </span>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Nicio sincronizare</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Apeluri Noi (ultimele 5 sync)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{totalCalls}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Status Surse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant={successCount === logs.length ? "default" : "destructive"}>
              {successCount}/{logs.length} ok
            </Badge>
            {logs.some((l) => l.status === "error") && (
              <span className="text-sm text-muted-foreground">
                {logs.filter((l) => l.status === "error").length} erori
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
