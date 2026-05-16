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
  created_at: string;
  updated_at: string;
};

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function daysBetweenNow(dateValue: string | null) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function isRecent(dateValue: string, days = 7) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= days * 86400000;
}

function CallItem({ call, onAnalyze }: { call: FundingCall; onAnalyze: (id: string) => void }) {
  return (
    <article className="call item">
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
        <button className="button" onClick={() => onAnalyze(call.id)}>Analizeaza</button>
      </div>
    </article>
  );
}

function CategorySection({ title, calls, empty, onAnalyze }: { title: string; calls: FundingCall[]; empty: string; onAnalyze: (id: string) => void }) {
  return (
    <section className="panel radar-section">
      <div className="section-head"><h2>{title}</h2><span className="badge">{calls.length}</span></div>
      {calls.length === 0 ? <p className="muted">{empty}</p> : <div className="grid">{calls.map((call) => <CallItem key={call.id} call={call} onAnalyze={onAnalyze} />)}</div>}
    </section>
  );
}

export default function HomePage() {
  const [calls, setCalls] = useState<FundingCall[]>([]);
  const [profiles, setProfiles] = useState<FundingProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
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
    const secret = adminSecret.trim();
    const path = secret ? `/api/cron/sync-calls?secret=${encodeURIComponent(secret)}` : "/api/cron/sync-calls?manual=1";
    const res = await fetch(path);
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

  const categories = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => (b.relevance_score ?? -1) - (a.relevance_score ?? -1));
    const newCalls = sorted.filter((call) => isRecent(call.created_at, 7)).slice(0, 8);
    const worthReview = sorted.filter((call) => (call.relevance_score ?? 0) >= 65).slice(0, 8);
    const deadlineSoon = sorted
      .filter((call) => {
        const days = daysBetweenNow(call.deadline_at);
        return days !== null && days >= 0 && days <= 30;
      })
      .sort((a, b) => Number(new Date(a.deadline_at ?? 0)) - Number(new Date(b.deadline_at ?? 0)))
      .slice(0, 8);
    const modified = sorted
      .filter((call) => call.updated_at !== call.created_at && isRecent(call.updated_at, 7))
      .slice(0, 8);
    return { newCalls, worthReview, deadlineSoon, modified };
  }, [filtered]);

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
            <input className="input secret-input" placeholder="CRON_SECRET pentru sync manual" type="password" value={adminSecret} onChange={(event) => setAdminSecret(event.target.value)} />
            <button className="button" onClick={runSync} disabled={syncing}>{syncing ? "Sincronizez..." : "Ruleaza sync"}</button>
            <button className="button secondary" onClick={loadCalls}>Refresh</button>
            <button className="button secondary" onClick={exportCsv} disabled={filtered.length === 0}>Export CSV</button>
            <Link className="button secondary" href="/profiles">Profiluri</Link>
            <Link className="button secondary" href="/project-ideas">Idei proiect</Link>
            <Link className="button secondary" href="/matches">Rezultate</Link>
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

      <section className="panel filters-panel">
        <h2>Filtre</h2>
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
      </section>

      {loading ? <section className="panel"><p className="muted">Incarc apelurile.</p></section> : (
        <section className="radar-grid">
          <CategorySection title="Nou aparute" calls={categories.newCalls} empty="Nu exista apeluri noi in ultimele 7 zile." onAnalyze={analyze} />
          <CategorySection title="Merita analizate" calls={categories.worthReview} empty="Nu exista apeluri cu scor de minimum 65." onAnalyze={analyze} />
          <CategorySection title="Deadline apropiat" calls={categories.deadlineSoon} empty="Nu exista deadline-uri in urmatoarele 30 de zile." onAnalyze={analyze} />
          <CategorySection title="Modificate" calls={categories.modified} empty="Nu exista apeluri modificate recent." onAnalyze={analyze} />
        </section>
      )}
    </main>
  );
}
