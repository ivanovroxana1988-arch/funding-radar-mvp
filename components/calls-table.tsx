"use client"

import { useState } from "react"
import type { Call } from "@/lib/supabase"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { ExternalLink, Search } from "lucide-react"

interface CallsTableProps {
  calls: Call[]
}

export function CallsTable({ calls }: CallsTableProps) {
  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState<string>("all")

  const sources = Array.from(new Set(calls.map((c) => c.source_name)))

  const filteredCalls = calls.filter((call) => {
    const matchesSearch =
      call.title.toLowerCase().includes(search.toLowerCase()) ||
      call.description?.toLowerCase().includes(search.toLowerCase()) ||
      call.ai_summary?.toLowerCase().includes(search.toLowerCase())

    const matchesSource =
      sourceFilter === "all" || call.source_name === sourceFilter

    return matchesSearch && matchesSource
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  if (calls.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Nu exista apeluri de finantare inca.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Sincronizarea automata ruleaza zilnic la 09:00 (ora Romaniei).
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cauta dupa titlu, descriere..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Filtreaza dupa sursa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate sursele</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Titlu</TableHead>
              <TableHead>Sursa</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead className="text-right">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCalls.map((call) => (
              <TableRow key={call.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium line-clamp-2">{call.title}</p>
                    {call.ai_summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {call.ai_summary}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="whitespace-nowrap">
                    {call.source_name.replace("MIPE ", "").replace("PEO ", "")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {call.ai_tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(call.deadline)}
                </TableCell>
                <TableCell className="text-right">
                  {call.url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={call.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Afiseaza {filteredCalls.length} din {calls.length} apeluri
      </p>
    </div>
  )
}
