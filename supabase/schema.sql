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
values (
  'Concordia / piata muncii / digitalizare',
  'Profil initial pentru organizatie patronala, piata muncii, competente, digitalizare si tranzitie verde.',
  'Cauta apeluri relevante pentru organizatii patronale, parteneri sociali, piata muncii, ocupare, formare profesionala, competente digitale, digitalizare, AI, tranzitie verde, cercetare, capacitate institutionala si parteneriate.'
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
