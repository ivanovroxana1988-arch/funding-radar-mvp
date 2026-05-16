# Funding Radar MVP

Aplicație MVP pentru monitorizarea apelurilor de proiecte europene: colectează surse oficiale, salvează apeluri în Supabase, rulează analiză AI și afișează un dashboard de prioritizare.

Stack:
- Next.js App Router
- Vercel pentru hosting și Cron
- Supabase pentru Postgres, Auth, Storage, pgvector
- OpenAI API pentru extragere structurată și rezumare

## 1. Instalare locală

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 2. Creează proiectul Supabase

În Supabase SQL Editor rulează fișierul:

```bash
supabase/schema.sql
```

Apoi completează `.env.local` cu:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `CRON_SECRET`

Atenție: `SUPABASE_SERVICE_ROLE_KEY` nu se pune niciodată în client. Rămâne doar în server/API routes. Da, știu, pare evident, până când cineva o pune în frontend și internetul aplaudă cu flăcări.

## 3. Rulează sync manual

După ce pornești aplicația:

```bash
curl "http://localhost:3000/api/cron/sync-calls?secret=dev-secret"
```

În `.env.local`, setează:

```env
CRON_SECRET=dev-secret
```

## 4. Analizează un apel

Din dashboard, apasă „Analyzează” pe un apel. Sau cu curl:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"call_id":"ID_DIN_SUPABASE"}'
```

## 5. Deploy Vercel

```bash
vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add OPENAI_API_KEY
vercel env add CRON_SECRET
vercel --prod
```

`vercel.json` rulează zilnic endpointul `/api/cron/sync-calls`.

## 6. Ce face MVP-ul

- Citește surse configurate în `lib/sources.ts`
- Extrage linkuri și titluri posibile din paginile MIPE / Oportunități UE
- Salvează apelurile în `funding_calls`
- Rulează analiză AI pe titlu + descriere + documente existente
- Generează:
  - rezumat
  - eligibilitate
  - buget
  - deadline
  - scor de relevanță
  - recomandare
  - riscuri / verificări manuale
- Afișează dashboard cu filtre

## 7. Limitări intenționate

Acesta este starter MVP, nu sistem certificat juridic. AI-ul poate rezuma și prioritiza, dar decizia finală se verifică în ghidul oficial. Tragic, știu, încă trebuie să citim documente oficiale. Dar măcar nu pe toate.

Pentru faza următoare:
- crawler pe documente PDF/DOCX/XLSX
- detectare modificări între versiuni
- embeddings cu pgvector
- notificări email
- profiluri multiple: Concordia, turism rural, digitalizare, formare, ONG, startup
- export Excel/Word
