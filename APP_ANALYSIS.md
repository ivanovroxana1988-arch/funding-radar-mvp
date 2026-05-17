# App Analysis (Funding Radar MVP)

Date analyzed: 2026-05-17

## What the app does well

- **Clear end-to-end pipeline**: Source crawling → call persistence → document extraction → AI analysis → profile matching is implemented with understandable boundaries (`scrape`, `sync`, `analyze`, API routes, UI).
- **Useful dashboard UX for an MVP**: The home page exposes practical slices (new calls, high relevance, upcoming deadlines, recently modified) and allows sync/analyze actions without leaving the dashboard.
- **Defensive AI posture**: Prompts ask the model not to hallucinate and to return strict JSON schema, reducing malformed outputs and overconfident extraction.
- **Separation of concerns**: Data operations are server-side through Supabase admin helpers and App Router API routes.

## Architecture snapshot

1. **Ingestion**
   - Sources are configured in `lib/sources.ts`.
   - `syncAllSources()` orchestrates source crawling and deduplication through URL fingerprinting.

2. **Enrichment**
   - Document text extraction is performed for linked docs/pages.
   - Combined text is capped before AI analysis.

3. **AI analysis + matching**
   - `analyzeFundingCall()` sends structured extraction tasks to OpenAI with schema-enforced JSON output.
   - Results are persisted into `funding_calls` and optionally `funding_matches` per profile.

4. **Presentation**
   - App dashboard (`app/page.tsx`) supports filtering, CSV export, and manual analyze triggers.
   - Additional routes expose profiles, matches, and project ideas.

## Key risks and improvement opportunities

### 1) Dependency version drift (high)
`package.json` uses `"latest"` for nearly all dependencies/devDependencies. This can break builds unpredictably and makes environments non-reproducible.

**Recommendation**
- Pin versions (exact or caret with lockfile discipline).
- Add a dependency update cadence (e.g., monthly Renovate/Dependabot PRs).

### 2) Type safety issue currently failing CI/dev checks (high)
`npm run typecheck` fails in `tests/scrape.test.ts` because a string argument is passed where a narrowed union type is required.

**Recommendation**
- Fix the test typing mismatch so `tsc --noEmit` passes.
- Add CI gate requiring both `npm run typecheck` and `npm test`.

### 3) Potentially brittle `stablePayload()` serialization (medium)
`stablePayload()` uses `JSON.stringify(value, Object.keys(...).sort())`, which only stabilizes top-level keys and can drop nested structure details when used as a replacer list.

**Recommendation**
- Replace with a true deep-stable serializer (custom recursive key sort or a small stable-stringify utility).

### 4) Hashing strategy may be heavy and collision-prone for very large text (medium)
`textHash()` base64url-encodes full text and slices to length 180. For large bodies this is memory-heavy and is not a cryptographic digest.

**Recommendation**
- Use SHA-256 (Node `crypto`) and store fixed-length hex digest.

### 5) Analyze path can be expensive/slow at runtime (medium)
The analyze API extracts remote page text on-demand, then runs an LLM call. Under concurrent usage this can become latency-heavy.

**Recommendation**
- Add caching and/or background queue for analyze jobs.
- Consider timeout and retry policies per source.

### 6) Error observability can be improved (medium)
Some branches swallow extraction errors intentionally (reasonable for MVP), but centralized telemetry is limited.

**Recommendation**
- Add structured logs (source URL, stage, error class).
- Add operational counters/metrics for ingestion/analyze success rates.

## Product-level suggestions (next iteration)

- Add explainability metadata in UI (evidence snippets and source anchors behind score/recommendation).
- Add source freshness indicators and last successful sync timestamp per source.
- Add duplicate clustering beyond URL fingerprint (title + semantic similarity).
- Add manual review workflow states (`new`, `shortlisted`, `rejected`, `applied`).

## Quick health summary

- **Core concept**: Strong MVP with practical business value.
- **Engineering baseline**: Good modularity, but should tighten reproducibility and static type health.
- **Immediate priority**: Fix typecheck failure and pin dependency versions.
