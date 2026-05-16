"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { FundingProfile } from "@/lib/types";

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<FundingProfile[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [profilePrompt, setProfilePrompt] = useState("");
  const [message, setMessage] = useState("");

  async function loadProfiles() {
    const res = await fetch("/api/profiles", { cache: "no-store" });
    const data = await res.json();
    setProfiles(data.profiles ?? []);
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
    setName("");
    setDescription("");
    setProfilePrompt("");
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
        <p className="muted">Creeaza profiluri stabile pentru Concordia, digitalizare, turism rural sau alte directii de cautare.</p>
      </section>

      <section className="detail-grid">
        <form className="panel profile-form" onSubmit={createProfile}>
          <h2>Profil nou</h2>
          <label>Nume<input className="input full" value={name} onChange={(event) => setName(event.target.value)} required /></label>
          <label>Descriere<input className="input full" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <label>Prompt profil<textarea className="textarea" value={profilePrompt} onChange={(event) => setProfilePrompt(event.target.value)} required /></label>
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
