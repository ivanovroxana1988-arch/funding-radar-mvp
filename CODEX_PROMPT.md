# Prompt pentru Codex

Construiește și stabilizează aplicația `funding-radar-mvp`.

Context:
Aplicația monitorizează apeluri de finanțare europeană de pe surse oficiale MIPE / Oportunități UE, le salvează în Supabase, le analizează cu OpenAI și afișează un dashboard de prioritizare.

Stack:
- Next.js App Router
- Vercel Cron
- Supabase Postgres
- OpenAI structured outputs

Obiective MVP:
1. Repară eventualele probleme de build TypeScript.
2. Verifică rutele:
   - GET /api/calls
   - GET /api/cron/sync-calls
   - POST /api/analyze
3. Îmbunătățește crawlerul din `lib/scrape.ts`:
   - deduplicare mai bună;
   - detectare documente PDF/DOCX/XLSX;
   - salvare în `funding_documents`;
   - extragere status din titlu/text.
4. Adaugă pagină de detaliu pentru apel:
   - `/calls/[id]`
   - afișează analiza completă;
   - afișează documentele;
   - buton de reanalizare.
5. Adaugă profiluri de relevanță:
   - dropdown în dashboard;
   - analiză cu profil selectat.
6. Adaugă export CSV pentru apelurile filtrate.
7. Adaugă test minimal pentru:
   - `looksLikeFundingCall`
   - `inferStatus`
   - schema AI.

Reguli:
- Nu expune `SUPABASE_SERVICE_ROLE_KEY` în client.
- Nu inventa date în analiză. Dacă lipsește buget/deadline/eligibilitate, marchează pentru verificare manuală.
- Păstrează UI simplu, elegant, lizibil.
- Nu transforma MVP-ul într-un monstru enterprise. Omenirea a suferit destul.
