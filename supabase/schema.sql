-- NGN — Next Gen News
-- Supabase schema.
--
-- Design notes:
--   * Readers may be minors. Nothing publicly readable exposes an email
--     address, a school, or a location. `profiles` is split so the public view
--     carries only what a reader chose to display.
--   * AI output can never reach readers without human approval: the article
--     status enum is ordered, and a trigger blocks a jump straight to
--     'published' without an approving editor.
--   * Every user-generated row carries a moderation status from creation.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ----

create type article_status as enum (
  'draft',
  'ai_generated',
  'needs_review',
  'approved',
  'scheduled',
  'published'
);

create type article_type as enum ('news', 'explainer', 'weekly');

create type source_kind as enum ('primary', 'reporting', 'analysis', 'data');

create type moderation_status as enum ('approved', 'pending', 'flagged', 'removed');

create type reaction_kind as enum ('learned', 'interesting', 'agree', 'disagree');

create type user_role as enum ('reader', 'editor', 'admin');

create type ai_job_kind as enum (
  'draft_generation',
  'fact_check',
  'explain',
  'ask',
  'moderation'
);

create type ai_job_status as enum ('queued', 'running', 'succeeded', 'failed');

-- ------------------------------------------------------------- profiles ----

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_hue smallint not null default 190,
  role user_role not null default 'reader',
  -- Private fields. Never exposed through the public profile view.
  school text,
  grade text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_-]{3,24}$')
);

-- What other readers may see.
create view public_profiles as
  select id, username, display_name, avatar_hue, role, created_at
  from profiles;

-- ------------------------------------------------------------- articles ----

create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  headline text not null,
  subheadline text,
  summary text,
  in_twenty_seconds text,
  category text not null,
  quick_what_happened text,
  quick_why_it_matters text,
  quick_what_next text,
  body jsonb not null default '[]'::jsonb,
  democratic_view jsonb,
  republican_view jsonb,
  other_views jsonb not null default '[]'::jsonb,
  known_facts text[] not null default '{}',
  uncertainties text[] not null default '{}',
  key_terms jsonb not null default '[]'::jsonb,
  author_id uuid references profiles (id) on delete set null,
  type article_type not null default 'news',
  status article_status not null default 'draft',
  -- Set when a human editor approves. Required before publication.
  approved_by uuid references profiles (id) on delete set null,
  approved_at timestamptz,
  -- True when any part of the draft came from a model.
  ai_assisted boolean not null default false,
  is_demo boolean not null default false,
  significance smallint not null default 50,
  read_time smallint not null default 5,
  hero_image text,
  cover jsonb,
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_status_idx on articles (status, published_at desc);
create index articles_category_idx on articles (category);
create index articles_significance_idx on articles (significance desc);

-- Human approval is not advisory.
create or replace function enforce_human_approval()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('approved', 'scheduled', 'published')
     and new.approved_by is null then
    raise exception
      'An article cannot reach status % without an approving editor', new.status;
  end if;

  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger articles_require_human_approval
  before insert or update on articles
  for each row execute function enforce_human_approval();

-- ------------------------------------------------------------- sourcing ----

create table article_sources (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles (id) on delete cascade,
  publisher text not null,
  title text not null,
  source_date text,
  url text,
  kind source_kind not null default 'primary',
  -- True until an editor has verified the link resolves to the document named.
  is_placeholder boolean not null default true,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index article_sources_article_idx on article_sources (article_id, position);

-- --------------------------------------------------------------- issues ----

create table issues (
  slug text primary key,
  name text not null,
  category text not null,
  short_description text not null,
  basics text[] not null default '{}',
  why_debated text[] not null default '{}',
  democratic_views text[] not null default '{}',
  republican_views text[] not null default '{}',
  democratic_disagreements text[] not null default '{}',
  republican_disagreements text[] not null default '{}',
  other_perspectives jsonb not null default '[]'::jsonb,
  key_terms jsonb not null default '[]'::jsonb,
  cover jsonb,
  updated_at timestamptz not null default now()
);

create table article_issues (
  article_id uuid not null references articles (id) on delete cascade,
  issue_slug text not null references issues (slug) on delete cascade,
  primary key (article_id, issue_slug)
);

-- --------------------------------------------------------------- weekly ----

create table weekly_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  edition integer not null unique,
  headline text not null,
  dek text,
  summary text,
  body jsonb not null default '[]'::jsonb,
  author_id uuid references profiles (id) on delete set null,
  read_time smallint not null default 6,
  cover jsonb,
  featured boolean not null default false,
  is_demo boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------- reader activity ----

create table article_reactions (
  article_id uuid not null references articles (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  kind reaction_kind not null,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id, kind)
);

create table saved_articles (
  user_id uuid not null references profiles (id) on delete cascade,
  article_id uuid not null references articles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles (id) on delete cascade,
  parent_id uuid references comments (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status moderation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_article_idx on comments (article_id, status, created_at desc);

create table comment_reactions (
  comment_id uuid not null references comments (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  -- Only one, deliberately: there is no downvote and no angry reaction.
  kind text not null default 'thoughtful',
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id, kind)
);

-- ----------------------------------------------------------- discussion ----

create table discussions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  question text not null,
  context text not null,
  cover jsonb,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table discussion_responses (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references discussions (id) on delete cascade,
  parent_id uuid references discussion_responses (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status moderation_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table discussion_reactions (
  response_id uuid not null references discussion_responses (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null default 'made_me_think',
  created_at timestamptz not null default now(),
  primary key (response_id, user_id, kind)
);

-- ---------------------------------------------------------- moderation -----

create table moderation_flags (
  id uuid primary key default gen_random_uuid(),
  -- 'comment' | 'discussion_response'
  subject_type text not null,
  subject_id uuid not null,
  reported_by uuid references profiles (id) on delete set null,
  reason text not null,
  -- Populated when an automated classifier produced the flag.
  automated boolean not null default false,
  classifier_notes jsonb,
  resolved_by uuid references profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index moderation_flags_open_idx
  on moderation_flags (created_at desc)
  where resolved_at is null;

-- ------------------------------------------------------------- ai jobs -----

create table ai_jobs (
  id uuid primary key default gen_random_uuid(),
  kind ai_job_kind not null,
  status ai_job_status not null default 'queued',
  article_id uuid references articles (id) on delete cascade,
  model text,
  prompt_version text,
  input jsonb,
  output jsonb,
  error text,
  -- Set only when a human has read the output. Publication depends on it.
  reviewed_by uuid references profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index ai_jobs_status_idx on ai_jobs (status, created_at desc);

-- ---------------------------------------------------------------- RLS ------

alter table profiles enable row level security;
alter table articles enable row level security;
alter table article_sources enable row level security;
alter table issues enable row level security;
alter table article_issues enable row level security;
alter table weekly_articles enable row level security;
alter table article_reactions enable row level security;
alter table saved_articles enable row level security;
alter table comments enable row level security;
alter table comment_reactions enable row level security;
alter table discussions enable row level security;
alter table discussion_responses enable row level security;
alter table discussion_reactions enable row level security;
alter table moderation_flags enable row level security;
alter table ai_jobs enable row level security;

create or replace function is_editor()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('editor', 'admin')
  );
$$;

-- Reading is public; writing is not.
create policy "published articles are public"
  on articles for select
  using (status = 'published' or is_editor());

create policy "editors manage articles"
  on articles for all
  using (is_editor())
  with check (is_editor());

create policy "sources follow their article"
  on article_sources for select
  using (
    exists (
      select 1 from articles a
      where a.id = article_id and (a.status = 'published' or is_editor())
    )
  );

create policy "editors manage sources"
  on article_sources for all
  using (is_editor())
  with check (is_editor());

create policy "issues are public" on issues for select using (true);
create policy "editors manage issues" on issues for all
  using (is_editor()) with check (is_editor());

create policy "article issues are public" on article_issues for select using (true);
create policy "editors manage article issues" on article_issues for all
  using (is_editor()) with check (is_editor());

create policy "weekly is public" on weekly_articles for select
  using (published_at is not null or is_editor());
create policy "editors manage weekly" on weekly_articles for all
  using (is_editor()) with check (is_editor());

create policy "profiles are readable" on profiles for select using (true);
create policy "own profile is writable" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "approved comments are public" on comments for select
  using (status = 'approved' or author_id = auth.uid() or is_editor());
create policy "signed-in readers may comment" on comments for insert
  with check (auth.uid() = author_id);
create policy "authors may edit their comment" on comments for update
  using (auth.uid() = author_id or is_editor())
  with check (auth.uid() = author_id or is_editor());

create policy "approved responses are public" on discussion_responses for select
  using (status = 'approved' or author_id = auth.uid() or is_editor());
create policy "signed-in readers may respond" on discussion_responses for insert
  with check (auth.uid() = author_id);

create policy "discussions are public" on discussions for select using (true);
create policy "editors manage discussions" on discussions for all
  using (is_editor()) with check (is_editor());

create policy "own reactions" on article_reactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reaction counts are public" on article_reactions for select
  using (true);

create policy "own saved articles" on saved_articles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own comment reactions" on comment_reactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own discussion reactions" on discussion_reactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "readers may report" on moderation_flags for insert
  with check (auth.uid() = reported_by);
create policy "editors review flags" on moderation_flags for select
  using (is_editor());
create policy "editors resolve flags" on moderation_flags for update
  using (is_editor()) with check (is_editor());

create policy "editors see ai jobs" on ai_jobs for all
  using (is_editor()) with check (is_editor());

-- ------------------------------------------------------- profile trigger ---

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, school, grade)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      'reader-' || substr(new.id::text, 1, 8)
    ),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'NGN reader'),
    nullif(new.raw_user_meta_data ->> 'school', ''),
    nullif(new.raw_user_meta_data ->> 'grade', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
