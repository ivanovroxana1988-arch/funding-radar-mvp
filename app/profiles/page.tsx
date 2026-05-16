"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { FundingProfile } from "@/lib/types";

const templates = [
  {
    name: "Concordia - piata muncii",
    description: "Organizatie patronala, partener social, ocupare, formare, dialog social.",
    themes: ["piata muncii", "formare profesionala", "parteneri sociali", "dialog social", "competente"],
  },
  {
    name: "Concordia - digitalizare si AI",
    description: "Digitalizare, AI, automatizare, date, competente digitale pentru organizatii.",
    themes: ["digitalizare", "AI", "automatizare", "competente digitale", "date"],
  },
  {
    name: "Dragoslavele - turism rural",
    description: "Turism rural, comunitate, patrimoniu, GAL, economie rurala.",
    themes: ["turism rural", "patrimoniu", "dezvoltare locala", "GAL", "comunitate"],
  },
  {
    name: "Lucindra - startup / inovare / AI",
    description: "Startup, inovare, wellbeing, educatie, sanatate mintala non-clinica, AI.",
    themes: ["startup", "inovare", "wellbeing", "educatie", "AI"],
  },
  {
    name: "Personal - proiecte culturale / arta / comunitate",
    description: "Proiecte culturale, arta, comunitate, educatie, patrimoniu.",
    themes: ["arta", "cultura", "comunitate", "educatie", "patrimoniu"],
  },
];

const allThemes = Array.from(new Set(templates.flatMap((template) => template.themes)));

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<FundingProfile[]>([]);
  const [name, setName] = useState(templates[0].name);
  const [description, setDescription] = useState(templates[0].description);
  const [themes, setThemes] = useState<string[]>(templates[0].themes);
  const [freeText, setFreeText] = useState("Caut apeluri unde pot fi solicitant, partener sau beneficiar indirect. Marcheaza clar incertitudinile de eligibilitate.");
  const [message, setMessage] = useState("");

  async function loadProfiles() {
    const res = await fetch("/api/profiles", { cache: "no-store" });
    const data = await res.json();
    setProfiles(data.profiles ?? []);
  }

  const profilePrompt = useMemo(() => {
    return `Profil: ${name}\nDescriere: ${description}\nTeme de interes: ${themes.join(", ")}\nCriterii libere: ${freeText}\nScor mare doar daca exista potrivire reala de tema, rol si eligibilitate.`;
  }, [name, description, themes, freeText]);

  function applyTemplate(template: (typeof templates)[number]) {
    setName(template.name);
    setDescription(template.description);
    setThemes(template.themes);
  }

  function toggleTheme(theme: string) {
    setThemes((current) => current.includes(theme) ? current.filter((item) => item !== theme) : [...current, theme]);
  }

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, profile_prompt: profilePrompt }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Profilul nu a putut fi creat.");
      return;
    }
    setMessage("Profil creat.");
    await loadProfiles();
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  return (
    <main className="shell">
      <Link href="/" className="back-link">Inapoi la dashboard</Link>
      <section className="panel">
        <div className="kicker">Matching profiles</div>
        <h1>Profiluri de relevanta</h1>
        <p className="muted">Alege un template, bifeaza temele si adauga context liber. Profilurile raman stabile; ideile concrete vin separat.</p>
      </section>

      <section className="detail-grid">
        <form className="panel profile-form" onSubmit={createProfile}>
          <h2>Creeaza profil nou</h2>
          <div className="template-grid">
            {templates.map((template) => <button className="button secondary" type="button" key={template.name} onClick={() => applyTemplate(template)}>{template.name}</button>)}
          </div>
          <label>Nume<input className="input full" value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <label>Descriere<input className="input full" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <div>
            <strong>Teme bifabile</strong>
            <div className="checkbox-grid compact-checks">
              {allThemes.map((theme) => <label className="check" key={theme}><input type="checkbox" checked={themes.includes(theme)} onChange={() => toggleTheme(theme)} />{theme}</label>)}
            </div>
          </div>
          <label>Descriere libera<textarea className="textarea" value={freeText} onChange={(event) => setFreeText(event.target.value)} required /></label>
          <label>Prompt generat<textarea className="textarea prompt-preview" value={profilePrompt} readOnly /></label>
          <button className="button" type="submit">Creeaza profil</button>
          {message && <p className="notice">{message}</p>}
        </form>

        <section className="panel">
          <h2>Profiluri existente</h2>
          {profiles.length === 0 ? <p className="muted">Nu exista profiluri inca.</p> : (
            <div className="grid">
              {profiles.map((profile) => (
                <article className="item compact" key={profile.id}>
                  <h3>{profile.name}</h3>
                  {profile.description && <p className="muted">{profile.description}</p>}
                  <p>{profile.profile_prompt}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
