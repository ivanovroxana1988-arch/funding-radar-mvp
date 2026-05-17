# Funding Call Extraction Plan for mfe.gov.ro

## Executive summary

The single highest-value discovery target on `mfe.gov.ro` is the interactive consolidated calendar page `https://mfe.gov.ro/calendar-apeluri-de-finantare/`, because the indexed official page advertises filtering plus export to `CSV`, `TXT`, and `XLSX`, and the search snippet currently reports `1044` filtered calls. The next most valuable sources are `https://mfe.gov.ro/calendar-apeluri-de-proiecte/`, `https://mfe.gov.ro/apeluri-deschise/`, and the program-specific calendar and guide pages for PEO, PoIDS, PoAT, PoCIDIF, PTJ, PS, and PNRR. Those pages expose field labels that are already very close to your target schema, including title, status, launch date, closing date, eligible applicants, specific objective, and call value.

MFE also exposes rich archive and document vectors that a crawler should treat as first-class sources rather than edge cases. The official site has indexed WordPress-style category pages, a project-announcements archive with year filters, direct uploaded spreadsheets and documents under `wp-content/uploads`, and guide folders such as `ghiduri_ptj`, `ghiduri_pids`, and `ghiduri-ms`. Those direct files are especially valuable because indexed spreadsheet snippets already show columns for call type, opening month, closing month, territory, and budget, which often makes them more structured than the announcement pages linking to them.

The site very likely runs on WordPress, or at least preserves WordPress-style routing, because official indexed URLs include `wp-content/uploads/...`, category archives, and the typical content structure used by WordPress sections. That means standard WordPress discovery probes are worth trying first: `https://mfe.gov.ro/wp-json/`, `https://mfe.gov.ro/wp-json/wp/v2/posts`, `.../pages`, `.../search`, `.../media`, and `https://mfe.gov.ro/wp-sitemap.xml`. WordPress core documents those routes and its built-in XML sitemap system. At the same time, in this research environment, direct fetches to several MIPE pages timed out, including the home page, `apeluri-deschise`, a category page, the PIDS page, the PoAT page, and `map2021`, so endpoint availability cannot be assumed without runtime probing.

Architecturally, the full collector should not run inside a synchronous Vercel request. Vercel Functions have maximum-duration limits, while GitHub Actions supports both scheduled runs and manual `workflow_dispatch` triggers; Playwright is a strong browser fallback because it auto-waits for actionable elements and uses resilient locators. The best design for your app is therefore: static HTTP collector first, Playwright fallback second, optional managed proxy/browser only for persistent blocking, and Vercel API routes limited to starting jobs, checking status, and reprocessing stored raw items.

## Current discovery surface

The official MIPE surface already contains enough discovery vectors to support a serious single-source pipeline without relying on any third-party site. The priority order below is based on how close each vector is to the data model of a funding call, how complete it is likely to be, and how likely it is to be blocked or to require browser rendering. Confirmed rows come from indexed official MIPE pages; the WordPress API and sitemap rows are candidate probes justified by MIPE’s WordPress-like URL structure and WordPress core documentation.

| Discovery vector | Exact URLs to try first | Reliability | Complexity | Likelihood of being blocked | Data completeness for calls | Recommendation |
|---|---|---:|---:|---:|---:|---|
| Consolidated funding calendar | `https://mfe.gov.ro/calendar-apeluri-de-finantare/` | High | Medium | Medium | Very high | **Top priority** |
| Consolidated calendar index page | `https://mfe.gov.ro/calendar-apeluri-de-proiecte/` | High | Low | Medium | High | **Top priority** |
| Open calls page | `https://mfe.gov.ro/apeluri-deschise/` | High | Low | Medium | High for active calls | **Top priority** |
| Latest-call archive | `https://mfe.gov.ro/category/ultimele-apeluri-prima-pagina/` | Medium | Low | Medium | Medium | High |
| Project announcements archive | `https://mfe.gov.ro/minister/anunturi-proiecte/` `https://mfe.gov.ro/category/anunturi/anunturi-proiecte/?selected-year=2025` | High | Medium | Medium | High historically | High |
| Program guide and calendar pages | `https://mfe.gov.ro/peos/apeluri-de-proiecte/` `https://mfe.gov.ro/peos/calendar-lansari-apeluri/` `https://mfe.gov.ro/pids/apeluri-de-proiecte-si-ghiduri-incluziune-si-demnitate-sociala/` `https://mfe.gov.ro/pids/calendar-lansari-apeluri/` `https://mfe.gov.ro/poats/apeluri-de-proiecte-poat/` `https://mfe.gov.ro/pocidif/ghiduri-pocidif/` `https://mfe.gov.ro/pocidif/calendar-apeluri-de-proiecte-pocidif/` `https://mfe.gov.ro/ptj-21-27/` `https://mfe.gov.ro/ptj/calendar-apeluri-de-proiecte/` `https://mfe.gov.ro/ps-21-27/` `https://mfe.gov.ro/pnrr/` `https://mfe.gov.ro/pnrr-calendarul-centralizator-si-sinteza-apelurilor/` | High | Medium | Medium | Very high within each program | **Top priority** |
| Direct uploaded files | `https://mfe.gov.ro/wp-content/uploads/2026/01/0607710cd8f761ddfdf5d79a8e46c132.xlsx` `https://mfe.gov.ro/wp-content/uploads/2025/03/a89734857805a0d2ee8bfa68ed1c0312.xlsx` | Very high | Medium | Low to medium | Very high for schedules | **Top priority** |
| Search landing page | `https://mfe.gov.ro/motor-de-cautare/` and candidate WP search URLs like `https://mfe.gov.ro/?s=apel` | Medium | Medium | Medium | Medium | Medium |
| WordPress REST API candidate | `https://mfe.gov.ro/wp-json/` `https://mfe.gov.ro/wp-json/wp/v2/search?search=apel&per_page=100&page=1` `https://mfe.gov.ro/wp-json/wp/v2/posts?search=apel&per_page=100&page=1` `https://mfe.gov.ro/wp-json/wp/v2/pages?search=apel&per_page=100&page=1` `https://mfe.gov.ro/wp-json/wp/v2/media?search=apel&per_page=100&page=1` | Unknown until probed | Low | Medium | Potentially very high | Probe early |
| WordPress sitemap candidate | `https://mfe.gov.ro/wp-sitemap.xml` and sitemap children discovered from it | Unknown until probed | Low | Low | High for discovery, not for full fields | Probe early |
| Map and export pages | `https://mfe.gov.ro/map2021/` `https://mfe.gov.ro/map2021/map_export.php` `https://mfe.gov.ro/map2021/absorbtie/stats_absorbtie.php` | Medium | Medium | Medium | Low for calls, useful for taxonomy/QA | Secondary only |

## Resilient collection strategy

Use a staged collection strategy rather than a single `fetch()` pipeline:

1. Static `GET` with realistic headers and low concurrency.
2. Playwright fallback for timeout, block, or client-rendered pages.
3. Optional managed proxy/browser escalation only after persistent failures.
4. Preserve last known good item and alert instead of overwriting with empties.

## Parsing and normalization

- Build HTML extraction around stable business labels (`Titlu apel`, `Stare apel`, `Data lansarii`, `Data inchiderii`, `Solicitanti eligibili`, `Valoarea apelului`) and semantic structures (`table`, `dt/dd`, label/value paragraphs).
- Parse document links (`pdf`, `docx`, `xlsx`) as first-class inputs.
- Extract PDF text deterministically first (e.g., PDF.js), OCR only when text extraction fails.
- Normalize search keys with diacritic folding and whitespace collapse.
- Store exact dates when possible, but preserve raw text + precision for partial dates.
- Deduplicate by canonical URL, then binary/content hashes, then semantic fingerprint.

## Storage and APIs

- Keep a **raw layer** (`import_runs`, `raw_source_items`) for full observability and reprocessing.
- Keep a **normalized layer** (`funding_calls`) with source linkage and parsed fields.
- Trigger collection outside synchronous app requests (e.g., GitHub Actions schedule + `workflow_dispatch`).
- Admin endpoints:
  - `POST /api/admin/mfe/collect`
  - `GET /api/admin/mfe/runs/:id`
  - `POST /api/admin/mfe/reprocess`
  - `GET /api/admin/mfe/failures`

## Implementation roadmap

1. Seed inventory (`core`, `programs`, `archives`, `documents`, `map_aux`).
2. Probe `wp-json`, `wp-sitemap`, and `?s=` runtime capabilities.
3. Add raw ingestion tables and run tracking.
4. Implement static collector for top-priority pages and archives.
5. Add document parsing (`pdf`, `xlsx`, `docx`).
6. Add normalization, dedupe, and upsert into `funding_calls`.
7. Add Playwright fallback.
8. Move execution to GitHub Actions.
9. Add admin APIs and failure dashboards.

Estimated effort: ~9–10 engineer-days for full robust version, ~4–5 days for lean version without initial browser fallback.
