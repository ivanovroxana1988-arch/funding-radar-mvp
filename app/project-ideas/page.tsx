"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { FundingProfile } from "@/lib/types";

type ProjectIdea = {
  id: string;
  title: string;
  description: string;
  profile_id: string | null;
  beneficiaries: string[] | null;
  activities: string[] | null;
  target_region: string | null;
  complexity: string | null;
};

const beneficiaryOptions = ["organizatii", "ONG-uri", "firme", "consultanti", "parteneri sociali", "autoritati publice", "startup-uri"];
const activityOptions = ["dezvoltare software", "cercetare", "analiza documente", "dashboard", "alertare", "AI", "training", "formare profesionala", "turism rural"];

export default function ProjectIdeasPage() {
  const [profiles, setProfiles] = useState<FundingProfile[]>([]);
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
  const [profileId, setProfileId] = useState("");
  const [title, setTitle] = useState("Radar apeluri europene");
  const [description, setDescription] = useState("Aplicatie care monitorizeaza automat apeluri de finantare, citeste ghiduri si ofera matching pe eligibilitate.");
  const [beneficiaries, setBeneficiaries] = useState<string[]>(["organizatii", "ONG-uri", "firme", "consultanti", "parteneri sociali"]);
  const [activities, setActivities] = useState<string[]>(["dezvoltare software", "analiza documente", "dashboard", "alertare", "AI"]);
  const [targetRegion, setTargetRegion] = useState("national");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [complexity, setComplexity] = useState("mediu");
  const [message, setMessage] = useState("");
  const [matchingId, setMatchingId] = useState<string | null>(null);

  async function loadData() {
    const [profilesRes, ideasRes] = await Promise.all([
      fetch("/api/profiles", { cache: "no-store" }),
      fetch("/api/project-ideas", { cache: "no-store" }),
    ]);
    const profilesData = await profilesRes.json();
    const ideasData = await ideasRes.json();
    const nextProfiles = profilesData.profiles ?? [];
    setProfiles(nextProfiles);
    setProfileId((current) => current || nextProfiles[0]?.id || "");
    setIdeas(ideasData.project_ideas ?? []);
  }

  useEffect(() => {
    loadData();
  }, []);

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function createIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const res = await fetch("/api/project-ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: profileId || null,
        title,
        description,
        beneficiaries,
        activities,
        target_region: targetRegion,
        budget_min: budgetMin,
        budget_max: budgetMax,
        complexity,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Ideea nu a putut fi creata.");
      return;
    }
    setMessage("Idee creata. Poti calcula potrivirile.");
    await loadData();
  }

  async function findMatches(projectIdeaId: string) {
    setMatchingId(projectIdeaId);
    setMessage("Calculez potrivirile pentru ideea selectata.");
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_idea_id: projectIdeaId }),
    });
    const data = await res.json();
    setMessage(data.message ?? data.error ?? "Potriviri calculate.");
    setMatchingId(null);
  }

  return (
    <main className="shell">
      <Link href="/" className="back-link">Inapoi la dashboard</Link>
      <section className="panel">
        <div className="kicker">Project matching</div>
        <h1>Idei de proiect</h1>
        <p className="muted">Creeaza o idee concreta si compara automat apelurile salvate cu profilul si obiectivul tau.</p>
      </section>

      <section className="detail-grid">
        <form className="panel profile-form" onSubmit={createIdea}>
          <h2>Idee noua</h2>
          <label>Profil stabil
            <select className="select full" value={profileId} onChange={(event) => setProfileId(event.target.value)}>
              <option value="">Fara profil</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
          </label>
          <label>Titlu proiect<input className="input full" value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
          <label>Descriere<textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} required /></label>
          <label>Regiune<input className="input full" value={targetRegion} onChange={(event) => setTargetRegion(event.target.value)} /></label>
          <div className="checkbox-grid">
            <div><strong>Beneficiari</strong>{beneficiaryOptions.map((item) => <label className="check" key={item}><input type="checkbox" checked={beneficiaries.includes(item)} onChange={() => toggle(beneficiaries, item, setBeneficiaries)} />{item}</label>)}</div>
            <div><strong>Activitati</strong>{activityOptions.map((item) => <label className="check" key={item}><input type="checkbox" checked={activities.includes(item)} onChange={() => toggle(activities, item, setActivities)} />{item}</label>)}</div>
          </div>
          <div className="split-inputs">
            <label>Buget minim<input className="input full" value={budgetMin} onChange={(event) => setBudgetMin(event.target.value)} /></label>
            <label>Buget maxim<input className="input full" value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} /></label>
          </div>
          <label>Complexitate
            <select className="select full" value={complexity} onChange={(event) => setComplexity(event.target.value)}>
              <option value="simplu">simplu</option>
              <option value="mediu">mediu</option>
              <option value="mare">mare</option>
            </select>
          </label>
          <button className="button" type="submit">Creeaza idee</button>
        </form>

        <section className="panel">
          <h2>Idei existente</h2>
          {message && <p className="notice">{message}</p>}
          {ideas.length === 0 ? <p className="muted">Nu exista idei inca.</p> : (
            <div className="grid">
              {ideas.map((idea) => (
                <article className="item compact" key={idea.id}>
                  <h3>{idea.title}</h3>
                  <p className="muted">{idea.description}</p>
                  <div className="badges">
                    {idea.target_region && <span className="badge">{idea.target_region}</span>}
                    {idea.complexity && <span className="badge warn">{idea.complexity}</span>}
                  </div>
                  <div className="actions start">
                    <button className="button" onClick={() => findMatches(idea.id)} disabled={matchingId === idea.id}>{matchingId === idea.id ? "Calculez..." : "Cauta potriviri"}</button>
                    <Link className="button secondary" href={`/matches?project_idea_id=${idea.id}`}>Vezi rezultate</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
