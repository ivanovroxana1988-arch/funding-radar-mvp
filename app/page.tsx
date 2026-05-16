"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FundingProfile } from "@/lib/types";

type FundingCall = {
  id: string;
  title: string;
  source_name: string | null;
  source_url: string;
  program: string | null;
  status: string | null;
  deadline_at: string | null;
  budget_text: string | null;
  relevance_score: number | null;
  recommendation: string | null;
  summary: string | null;
  manual_checks: string[] | null;
};

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export default function HomePage() {
  const [calls, setCalls] = useState<FundingCall[]>([]);
  const [profiles, setProfiles] = useState<FundingProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState("");

  async function loadCalls() {
    setLoading(true);
    const res = await fetch("/api/calls", { cache: "no-store" });
    const data = await res.json();
    setCalls(data.calls ?? []);
    setLoading(false);
  }

  async function loadProfiles() {
    const res = await fetch("/api/profiles", { cache: "no-store" });
    const data = await res.json();
    const nextProfiles = data.profiles ?? [];
    setProfiles(nextProfiles);
    setSelectedProfile((current) => current || nextProfiles[0]?.id || "");
  }

  async function runSync() {
    setSyncing(true);
    setMessage("");
    const res = await fetch("/api/cron/sync-calls?manual=1");
    const data = await res.json();
    setMessage(data.message ?? data.error ?? "Sync finalizat.");
    setSyncing(false);
    await loadCalls();
  }

  async function analyze(callId: string) {
    setMessage("Analizez apelul cu profilul selectat.");
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_id: callId, profile_id: selectedProfile || undefined }),
    });
    const data = await res.json();
    setMessage(data.message ?? data.error ?? "Analiza finalizata.");
    await loadCalls();
  }

  useEffect(() => {
    loadCalls();
    loadProfiles();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return calls.filter((call) => {
      const haystack = [call.title, call.program, call.summary, call.recommendation].filter(Boolean).join(" ").toLowerCase();
      return (!q || haystack.includes(q)) && (status === "all" || call.status === status);
    });
  }, [calls, query, status]);

  const statuses = Array.from(new Set(calls.map((call) => call.status).filter(Boolean) as string[]));
  const analyzed = calls.filter((call) => call.relevance_score !== null).length;
  const high = calls.filter((call) => (call.relevance_score ?? 0) >= 75).length;

  function exportCsv() {
    const rows = [
      ["Titlu", "Program", "Status", "Deadline", "Buget", "Scor", "Recomandare", "Sursa"],
      ...filtered.map((call) => [call.title, call.program, call.status, call.deadline_at, call.budget_text, call.relevance_score, call.recommendation, call.source_url]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "funding-calls.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="panel">
          <div className="kicker">Funding intelligence</div>
          <h1>Radar apeluri europene</h1>
          <p className="muted">Dashboard pentru apeluri de finantare, analiza AI, scor de relevanta si verificari manuale.</p>
          <div className="toolbar">
            <button className="button" onClick={runSync} disabled={syncing}>{syncing ? "Sincronizez..." : "Ruleaza sync"}</button>
            <button className="button secondary" onClick={loadCalls}>Refresh</button>
            <button className="button secondary" onClick={exportCsv} disabled={filtered.length === 0}>Export CSV</button>
            <Link className="button secondary" href="/profiles">Profiluri</Link>
          </div>
          {message && <p className="notice">{message}</p>}
        </div>
        <div className="panel stats">
          <div className="stat"><span className="muted">Total</span><strong>{calls.length}</strong></div>
          <div className="stat"><span className="muted">Analizate</span><strong>{analyzed}</strong></div>
          <div className="stat"><span className="muted">Relevanta mare</span><strong>{high}</strong></div>
          <div className="stat"><span className="muted">Cu deadline</span><strong>{calls.filter((call) => call.deadline_at).length}</strong></div>
        </div>
      </section>

      <section className="panel">
        <h2>Apeluri</h2>
        <div className="toolbar">
          <input className="input" placeholder="Cauta program, eligibilitate, digitalizare..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Toate statusurile</option>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="select wide" value={selectedProfile} onChange={(event) => setSelectedProfile(event.target.value)}>
            <option value="">Profil implicit</option>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>
        </div>

        {loading ? <p className="muted">Incarc apelurile.</p> : filtered.length === 0 ? <p className="muted">Nu exista apeluri inca. Ruleaza sync.</p> : (
          <div className="grid">
            {filtered.map((call) => (
              <article className="call item" key={call.id}>
                <div>
                  <h3>{call.title}</h3>
                  <p className="muted">{call.summary || "Neanalizat inca."}</p>
                  <div className="badges">
                    {call.source_name && <span className="badge">{call.source_name}</span>}
                    {call.program && <span className="badge">{call.program}</span>}
                    {call.status && <span className="badge warn">{call.status}</span>}
                    {call.budget_text && <span className="badge good">{call.budget_text}</span>}
                    {call.relevance_score !== null && <span className="badge score">Scor {call.relevance_score}/100</span>}
                    {call.deadline_at && <span className="badge danger">Deadline {new Date(call.deadline_at).toLocaleDateString("ro-RO")}</span>}
                  </div>
                  {call.recommendation && <p><strong>Recomandare:</strong> {call.recommendation}</p>}
                  {call.manual_checks?.length ? <p className="muted"><strong>De verificat manual:</strong> {call.manual_checks.join("; ")}</p> : null}
                </div>
                <div className="actions">
                  <Link className="button secondary" href={`/calls/${call.id}`}>Detalii</Link>
                  <a className="button secondary" href={call.source_url} target="_blank" rel="noreferrer">Sursa</a>
                  <button className="button" onClick={() => analyze(call.id)}>Analizeaza</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
