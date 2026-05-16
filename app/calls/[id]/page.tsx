"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { FundingProfile } from "@/lib/types";

type FundingDocument = { id: string; title: string | null; document_url: string; document_type: string | null };
type FundingCallDetails = {
  id: string;
  title: string;
  source_name: string | null;
  source_url: string;
  program: string | null;
  status: string | null;
  summary: string | null;
  applicant_eligibility: string[] | null;
  eligible_activities: string[] | null;
  budget_text: string | null;
  cofinancing_text: string | null;
  region_text: string | null;
  deadline_at: string | null;
  relevance_score: number | null;
  recommendation: string | null;
  risks: string[] | null;
  manual_checks: string[] | null;
  keywords: string[] | null;
  funding_documents: FundingDocument[] | null;
};

function ListBlock({ title, items }: { title: string; items?: string[] | null }) {
  return <section className="detail-block"><h2>{title}</h2>{items?.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">Nu exista date clare. Verifica documentul oficial.</p>}</section>;
}

export default function CallDetailsPage() {
  const params = useParams<{ id: string }>();
  const [call, setCall] = useState<FundingCallDetails | null>(null);
  const [profiles, setProfiles] = useState<FundingProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadCall() {
    setLoading(true);
    const res = await fetch(`/api/calls/${params.id}`, { cache: "no-store" });
    const data = await res.json();
    setCall(data.call ?? null);
    setLoading(false);
  }

  async function loadProfiles() {
    const res = await fetch("/api/profiles", { cache: "no-store" });
    const data = await res.json();
    const nextProfiles = data.profiles ?? [];
    setProfiles(nextProfiles);
    setSelectedProfile((current) => current || nextProfiles[0]?.id || "");
  }

  async function analyze() {
    setMessage("Reanalizez apelul.");
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_id: params.id, profile_id: selectedProfile || undefined }),
    });
    const data = await res.json();
    setMessage(data.message ?? data.error ?? "Analiza finalizata.");
    await loadCall();
  }

  useEffect(() => {
    loadCall();
    loadProfiles();
  }, []);

  if (loading) return <main className="shell"><p className="muted">Incarc apelul.</p></main>;
  if (!call) return <main className="shell"><p className="muted">Apelul nu a fost gasit.</p></main>;

  return (
    <main className="shell detail">
      <Link href="/" className="back-link">Inapoi la dashboard</Link>
      <section className="panel">
        <div className="detail-head">
          <div><div className="kicker">{call.source_name || "Sursa oficiala"}</div><h1>{call.title}</h1><p className="muted">{call.summary || "Apel neanalizat inca."}</p></div>
          {call.relevance_score !== null && <div className="score-box">{call.relevance_score}<span>/100</span></div>}
        </div>
        <div className="badges">
          {call.program && <span className="badge">{call.program}</span>}
          {call.status && <span className="badge warn">{call.status}</span>}
          {call.deadline_at && <span className="badge danger">Deadline {new Date(call.deadline_at).toLocaleDateString("ro-RO")}</span>}
          {call.budget_text && <span className="badge good">{call.budget_text}</span>}
          {call.cofinancing_text && <span className="badge">{call.cofinancing_text}</span>}
          {call.region_text && <span className="badge">{call.region_text}</span>}
        </div>
        <div className="toolbar">
          <select className="select wide" value={selectedProfile} onChange={(event) => setSelectedProfile(event.target.value)}><option value="">Profil implicit</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select>
          <button className="button" onClick={analyze}>Reanalizeaza</button>
          <a className="button secondary" href={call.source_url} target="_blank" rel="noreferrer">Sursa oficiala</a>
        </div>
        {message && <p className="notice">{message}</p>}
      </section>

      <section className="detail-grid">
        <section className="panel"><h2>Recomandare</h2><p>{call.recommendation || "Nu exista recomandare inca."}</p></section>
        <section className="panel"><h2>Documente</h2>{call.funding_documents?.length ? <ul>{call.funding_documents.map((doc) => <li key={doc.id}><a href={doc.document_url} target="_blank" rel="noreferrer">{doc.title || doc.document_url}</a>{doc.document_type && <span className="muted"> ({doc.document_type})</span>}</li>)}</ul> : <p className="muted">Nu au fost detectate documente atasate.</p>}</section>
      </section>

      <section className="panel detail-sections">
        <ListBlock title="Eligibilitate solicitant" items={call.applicant_eligibility} />
        <ListBlock title="Activitati eligibile" items={call.eligible_activities} />
        <ListBlock title="Riscuri" items={call.risks} />
        <ListBlock title="Verificari manuale" items={call.manual_checks} />
        <ListBlock title="Cuvinte cheie" items={call.keywords} />
      </section>
    </main>
  );
}
