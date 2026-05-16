"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ProjectIdea = { id: string; title: string; description: string };
type FundingCall = {
  id: string;
  title: string;
  source_url: string;
  program: string | null;
  status: string | null;
  deadline_at: string | null;
  budget_text: string | null;
  applicant_eligibility: string[] | null;
  manual_checks: string[] | null;
};
type Match = {
  id: string;
  score: number | null;
  rationale: string | null;
  risks: string[] | null;
  recommendation: string | null;
  funding_calls: FundingCall;
};

export default function MatchesPage() {
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadIdeas() {
    const res = await fetch("/api/project-ideas", { cache: "no-store" });
    const data = await res.json();
    const nextIdeas = data.project_ideas ?? [];
    setIdeas(nextIdeas);
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("project_idea_id");
    setSelectedIdea((current) => current || fromUrl || nextIdeas[0]?.id || "");
  }

  async function loadMatches(projectIdeaId: string) {
    if (!projectIdeaId) return;
    setLoading(true);
    const res = await fetch(`/api/matches?project_idea_id=${encodeURIComponent(projectIdeaId)}`, { cache: "no-store" });
    const data = await res.json();
    setMatches(data.matches ?? []);
    setLoading(false);
  }

  async function calculateMatches() {
    if (!selectedIdea) return;
    setMessage("Calculez potrivirile pentru ideea selectata.");
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_idea_id: selectedIdea }),
    });
    const data = await res.json();
    setMessage(data.message ?? data.error ?? "Potriviri calculate.");
    await loadMatches(selectedIdea);
  }

  async function saveCall(callId: string) {
    const res = await fetch("/api/saved-calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_id: callId, project_idea_id: selectedIdea || null }),
    });
    const data = await res.json();
    setMessage(data.message ?? data.error ?? "Apel salvat.");
  }

  useEffect(() => {
    loadIdeas();
  }, []);

  useEffect(() => {
    loadMatches(selectedIdea);
  }, [selectedIdea]);

  const selectedTitle = useMemo(() => ideas.find((idea) => idea.id === selectedIdea)?.title ?? "", [ideas, selectedIdea]);

  return (
    <main className="shell">
      <Link href="/project-ideas" className="back-link">Inapoi la idei</Link>
      <section className="panel">
        <div className="kicker">Funding matches</div>
        <h1>Rezultate potrivire</h1>
        <p className="muted">Lista este ordonata dupa scorul calculat pentru ideea selectata, nu dupa relevanta generala a apelului.</p>
        <div className="toolbar">
          <select className="select wide" value={selectedIdea} onChange={(event) => setSelectedIdea(event.target.value)}>
            <option value="">Alege o idee</option>
            {ideas.map((idea) => <option key={idea.id} value={idea.id}>{idea.title}</option>)}
          </select>
          <button className="button" onClick={calculateMatches} disabled={!selectedIdea}>Cauta potriviri</button>
        </div>
        {selectedTitle && <p><strong>Idee:</strong> {selectedTitle}</p>}
        {message && <p className="notice">{message}</p>}
      </section>

      <section className="panel results-panel">
        <h2>Apeluri potrivite</h2>
        {loading ? <p className="muted">Incarc rezultatele.</p> : matches.length === 0 ? <p className="muted">Nu exista rezultate inca. Apasa Cauta potriviri.</p> : (
          <div className="grid">
            {matches.map((match) => {
              const call = match.funding_calls;
              return (
                <article className="item match-item" key={match.id}>
                  <div className="match-score">{match.score ?? 0}<span>/100</span></div>
                  <div>
                    <h3>{call.title}</h3>
                    <div className="badges">
                      {call.program && <span className="badge">{call.program}</span>}
                      {call.status && <span className="badge warn">{call.status}</span>}
                      {call.deadline_at && <span className="badge danger">Deadline {new Date(call.deadline_at).toLocaleDateString("ro-RO")}</span>}
                      {call.budget_text && <span className="badge good">{call.budget_text}</span>}
                    </div>
                    <p><strong>Motiv:</strong> {match.rationale || match.recommendation || "Nu exista motivare salvata."}</p>
                    {match.risks?.length ? <p className="muted"><strong>Risc:</strong> {match.risks.join("; ")}</p> : null}
                    {call.applicant_eligibility?.length ? <p className="muted"><strong>Eligibilitate:</strong> {call.applicant_eligibility.join("; ")}</p> : null}
                    {call.manual_checks?.length ? <p className="muted"><strong>De verificat:</strong> {call.manual_checks.join("; ")}</p> : null}
                    <div className="actions start">
                      <Link className="button secondary" href={`/calls/${call.id}`}>Analiza apel</Link>
                      <a className="button secondary" href={call.source_url} target="_blank" rel="noreferrer">Sursa oficiala</a>
                      <button className="button" onClick={() => saveCall(call.id)}>Salveaza pentru analiza</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
