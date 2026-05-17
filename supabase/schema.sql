create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists funding_calls (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  title text not null,
  source_name text,
  source_url text not null,
  program text,
  status text,
  published_at date,
  deadline_at date,
  deadline_text text,
  budget_text text,
  cofinancing_text text,
  region_text text,
  summary text,
  applicant_eligibility text[],
  eligible_activities text[],
  relevance_score int check (relevance_score between 0 and 100),
  recommendation text,
  risks text[],
  manual_checks text[],
  keywords text[],
  raw_payload jsonb default '{}'::jsonb,
  analyzed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists funding_calls_source_url_idx on funding_calls (source_url);
create index if not exists funding_calls_relevance_score_idx on funding_calls (relevance_score desc);
create index if not exists funding_calls_deadline_at_idx on funding_calls (deadline_at);
create index if not exists funding_calls_status_idx on funding_calls (status);
create index if not exists funding_calls_keywords_idx on funding_calls using gin (keywords);

create table if not exists funding_documents (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references funding_calls(id) on delete cascade,
  title text,
  document_url text not null,
  document_type text,
  extracted_text text,
  text_hash text,
  version_label text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists funding_documents_call_id_idx on funding_documents(call_id);
create unique index if not exists funding_documents_call_url_key on funding_documents(call_id, document_url);

create table if not exists funding_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  profile_prompt text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into funding_profiles (name, description, profile_prompt)
values
  (
    'Concordia / partener social / piata muncii',
    'Ocupare, formare, competente, dialog social, legislatia muncii, digitalizare pentru organizatii patronale.',
    'Cauta apeluri relevante pentru organizatii patronale, parteneri sociali, piata muncii, ocupare, formare profesionala, competente, dialog social, capacitate institutionala, digitalizare si parteneriate. Scor mare doar daca solicitantul sau partenerul poate fi organizatie patronala/partener social.'
  ),
  (
    'Digitalizare / AI / aplicatii interne',
    'Proiecte software, automatizare, AI, date, transformare digitala, competente digitale.',
    'Cauta apeluri relevante pentru dezvoltare software, digitalizare, AI, date, automatizare, transformare digitala, competente digitale, inovare si aplicatii interne pentru organizatii sau IMM-uri.'
  ),
  (
    'Lucindra / inovare / wellbeing / AI',
    'Startup, cercetare, educatie, sanatate mintala non-clinica, AI companion, neurodivergenta.',
    'Cauta apeluri relevante pentru startup, cercetare, inovare, educatie, wellbeing, sanatate mintala non-clinica, AI companion, neurodivergenta, instrumente digitale si impact social.'
  ),
  (
    'Dragoslavele / turism rural / comunitate / patrimoniu',
    'Casa veche, turism rural, GAL, economie rurala, patrimoniu, regenerare comunitara.',
    'Cauta apeluri relevante pentru turism rural, patrimoniu, dezvoltare locala, GAL, comunitate, economie rurala, sustenabilitate, experiente culturale si regenerare comunitara.'
  )
on conflict (name) do nothing;

create table if not exists project_ideas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references funding_profiles(id) on delete set null,
  title text not null,
  description text not null,
  beneficiaries text[],
  activities text[],
  target_region text,
  budget_min numeric,
  budget_max numeric,
  complexity text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists project_ideas_profile_id_idx on project_ideas(profile_id);

create table if not exists funding_matches (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references funding_calls(id) on delete cascade,
  profile_id uuid references funding_profiles(id) on delete cascade,
  project_idea_id uuid references project_ideas(id) on delete cascade,
  score int check (score between 0 and 100),
  rationale text,
  risks text[],
  recommendation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint funding_matches_target_check check (profile_id is not null or project_idea_id is not null)
);

create unique index if not exists funding_matches_call_profile_key on funding_matches(call_id, profile_id);
create unique index if not exists funding_matches_call_project_idea_key on funding_matches(call_id, project_idea_id);

create table if not exists saved_funding_calls (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references funding_calls(id) on delete cascade,
  project_idea_id uuid references project_ideas(id) on delete set null,
  note text,
  created_at timestamptz default now(),
  unique(call_id, project_idea_id)
);

create index if not exists saved_funding_calls_project_idea_id_idx on saved_funding_calls(project_idea_id);

create table if not exists sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text,
  source_url text,
  status text not null,
  items_found int,
  error_message text,
  created_at timestamptz default now()
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references funding_documents(id) on delete cascade,
  call_id uuid references funding_calls(id) on delete cascade,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index if not exists document_chunks_call_id_idx on document_chunks(call_id);

create table if not exists import_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null default 'mfe.gov.ro',
  trigger_type text not null check (trigger_type in ('manual','scheduled','reprocess')),
  seed_set text not null,
  status text not null check (status in ('queued','running','completed','completed_with_warnings','failed','cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  pages_attempted int not null default 0,
  pages_succeeded int not null default 0,
  pages_failed int not null default 0,
  files_discovered int not null default 0,
  files_downloaded int not null default 0,
  items_parsed int not null default 0,
  calls_upserted int not null default 0,
  warnings_count int not null default 0,
  error_message text,
  meta jsonb not null default '{}'::jsonb
);

create table if not exists raw_source_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references import_runs(id) on delete cascade,
  source_name text not null default 'mfe.gov.ro',
  discovery_method text not null,
  parent_url text,
  seed_url text not null,
  discovered_url text not null,
  final_url text,
  canonical_url text,
  item_type text not null check (item_type in ('html','json','pdf','doc','docx','xls','xlsx','csv','txt','unknown')),
  mime_type text,
  http_status int,
  response_headers jsonb not null default '{}'::jsonb,
  etag text,
  last_modified text,
  bytes_count bigint,
  title text,
  body_html text,
  body_text text,
  extracted_json jsonb not null default '{}'::jsonb,
  content_hash text,
  binary_hash text,
  parse_status text not null default 'pending' check (parse_status in ('pending','parsed','no_fields','blocked','download_failed','parse_failed')),
  error_message text,
  collected_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists raw_source_items_canonical_url_uq
  on raw_source_items (canonical_url)
  where canonical_url is not null;

create index if not exists raw_source_items_run_id_idx on raw_source_items(run_id);
create index if not exists raw_source_items_content_hash_idx on raw_source_items(content_hash);
create index if not exists raw_source_items_binary_hash_idx on raw_source_items(binary_hash);
create index if not exists raw_source_items_http_status_idx on raw_source_items(http_status, collected_at desc);

alter table funding_calls add column if not exists source_item_id uuid references raw_source_items(id) on delete set null;
alter table funding_calls add column if not exists canonical_url text;
alter table funding_calls add column if not exists program_code text;
alter table funding_calls add column if not exists date_precision text;
alter table funding_calls add column if not exists launch_at timestamptz;
alter table funding_calls add column if not exists launch_text text;
alter table funding_calls add column if not exists budget_amount numeric;
alter table funding_calls add column if not exists budget_currency text;
alter table funding_calls add column if not exists contacts jsonb default '[]'::jsonb;
alter table funding_calls add column if not exists documents jsonb default '[]'::jsonb;
alter table funding_calls add column if not exists search_key text;
alter table funding_calls add column if not exists fingerprint text;
