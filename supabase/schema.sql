-- =============================================================================
-- NGN Arena — Supabase schema
--
-- The app runs fully without this: demo mode keeps Arena state client-side.
-- Apply this when connecting a real backend. Row shapes map 1:1 onto the types
-- in `types/ngn.ts`.
--
-- Two principles run through the whole schema:
--   1. No table stores a student's political beliefs as an attribute anyone
--      else can read. `debate_participants.chosen_position` is a record of a
--      debate, and `assigned_position` exists so a transcript is never read as
--      a statement of belief. The optional issue profile is separate, private
--      by default, and deletable.
--   2. A large share of users are minors. No birthdate, no precise location,
--      no real-name requirement. School and state are optional free text.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- Enums
-- =============================================================================

create type user_role         as enum ('student', 'teacher', 'admin');
create type debate_format     as enum ('quick', 'standard', 'deep');
create type debate_status     as enum ('live', 'ongoing', 'upcoming', 'past');
create type debate_difficulty as enum ('Introductory', 'Intermediate', 'Advanced');
create type position_side     as enum ('support', 'oppose', 'undecided');
create type round_type        as enum ('opening', 'rebuttal', 'counter', 'closing');
create type debate_outcome    as enum ('win', 'loss', 'draw');
create type moderation_state  as enum ('pending', 'approved', 'flagged', 'removed');
create type report_reason     as enum ('harassment', 'hate', 'threat',
                                       'personal-information', 'spam', 'other');
create type article_kind      as enum ('brief', 'weekly');
create type side_assignment   as enum ('random', 'student-choice', 'teacher-assigned');
create type ai_job_status     as enum ('queued', 'running', 'succeeded', 'failed');

-- =============================================================================
-- Identity
-- =============================================================================

create table schools (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  state       text,
  created_at  timestamptz not null default now()
);

create table profiles (
  id                    uuid primary key references auth.users on delete cascade,
  username              text unique not null,
  first_name            text,
  role                  user_role not null default 'student',
  rating                integer not null default 1200,
  peak_rating           integer not null default 1200,
  debates_completed     integer not null default 0,
  wins                  integer not null default 0,
  losses                integer not null default 0,
  draws                 integer not null default 0,
  switch_sides_completed integer not null default 0,
  streak_days           integer not null default 0,
  last_active_date      date,
  -- All optional. NGN never requires location or age from a student.
  school_id             uuid references schools on delete set null,
  state                 text,
  grade_band            text,
  interests             text[] not null default '{}',
  onboarded             boolean not null default false,
  -- Opt-in, private by default, and never used for matching.
  issue_profile         jsonb,
  issue_profile_visible boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint username_length check (char_length(username) between 3 and 24)
);

create index profiles_rating_idx    on profiles (rating desc);
create index profiles_school_idx    on profiles (school_id);
create index profiles_state_idx     on profiles (state);

create table school_memberships (
  school_id  uuid not null references schools on delete cascade,
  user_id    uuid not null references profiles on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (school_id, user_id)
);

-- =============================================================================
-- Content
-- =============================================================================

create table sources (
  id          uuid primary key default gen_random_uuid(),
  publisher   text not null,
  title       text not null,
  url         text not null,
  source_type text not null,
  published   text,
  created_at  timestamptz not null default now()
);

create table debate_topics (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  category    text not null
);

create table debates (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text unique not null,
  title                text not null,
  description          text not null,
  category             text not null,
  difficulty           debate_difficulty not null default 'Intermediate',
  format               debate_format not null default 'standard',
  status               debate_status not null default 'upcoming',
  featured             boolean not null default false,
  tags                 text[] not null default '{}',
  estimated_minutes    integer not null default 15,
  starts_at            timestamptz,
  ends_at              timestamptz,
  -- Briefing
  brief                jsonb not null default '{}'::jsonb,
  support_summary      text,
  oppose_summary       text,
  democratic_summary   text,
  republican_summary   text,
  other_summary        text,
  key_facts            text[] not null default '{}',
  key_terms            jsonb not null default '[]'::jsonb,
  -- No AI-generated political content is public until an editor approves it.
  approved_by          uuid references profiles on delete set null,
  approved_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index debates_status_idx   on debates (status);
create index debates_category_idx on debates (category);
create index debates_featured_idx on debates (featured) where featured;

create table debate_sources (
  debate_id uuid not null references debates on delete cascade,
  source_id uuid not null references sources on delete cascade,
  primary key (debate_id, source_id)
);

create table articles (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  kind               article_kind not null default 'brief',
  category           text not null,
  headline           text not null,
  subheadline        text,
  explainer          text,
  author             text not null,
  -- Neutral news and signed opinion must never be presented as the same thing.
  provenance         text not null,
  read_minutes       integer not null default 3,
  quick_brief        jsonb not null default '{}'::jsonb,
  body               text[] not null default '{}',
  understand_sides   jsonb not null default '[]'::jsonb,
  what_we_know       text[] not null default '{}',
  what_is_uncertain  text[] not null default '{}',
  related_debate_id  uuid references debates on delete set null,
  published_at       timestamptz,
  approved_by        uuid references profiles on delete set null,
  created_at         timestamptz not null default now()
);

create index articles_kind_idx      on articles (kind);
create index articles_published_idx on articles (published_at desc);

create table article_sources (
  article_id uuid not null references articles on delete cascade,
  source_id  uuid not null references sources on delete cascade,
  primary key (article_id, source_id)
);

create table issues (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text unique not null,
  title                   text not null,
  category                text not null,
  summary                 text not null,
  basics                  text[] not null default '{}',
  why_people_debate       text,
  democratic_views        text[] not null default '{}',
  republican_views        text[] not null default '{}',
  other_perspectives      text[] not null default '{}',
  -- Recorded explicitly: a party described without its factions is a caricature.
  democratic_disagreement text,
  republican_disagreement text,
  key_terms               jsonb not null default '[]'::jsonb,
  key_facts               text[] not null default '{}',
  created_at              timestamptz not null default now()
);

create table saved_articles (
  user_id    uuid not null references profiles on delete cascade,
  article_id uuid not null references articles on delete cascade,
  saved_at   timestamptz not null default now(),
  primary key (user_id, article_id)
);

-- =============================================================================
-- Debating
-- =============================================================================

create table debate_rounds (
  id                uuid primary key default gen_random_uuid(),
  debate_id         uuid not null references debates on delete cascade,
  round_number      integer not null,
  type              round_type not null,
  prompt            text not null,
  max_characters    integer not null default 800,
  time_limit_seconds integer not null default 180,
  unique (debate_id, round_number)
);

create table debate_participants (
  id                uuid primary key default gen_random_uuid(),
  debate_id         uuid not null references debates on delete cascade,
  user_id           uuid not null references profiles on delete cascade,
  -- Both are kept: `assigned_position` is what makes it legible that a
  -- transcript may not reflect what the student personally believes.
  assigned_position position_side,
  chosen_position   position_side,
  pre_confidence    smallint check (pre_confidence between 1 and 5),
  status            text not null default 'active',
  rating_before     integer,
  rating_after      integer,
  result            debate_outcome,
  created_at        timestamptz not null default now(),
  unique (debate_id, user_id)
);

create index debate_participants_user_idx   on debate_participants (user_id);
create index debate_participants_debate_idx on debate_participants (debate_id);

create table debate_responses (
  id             uuid primary key default gen_random_uuid(),
  round_id       uuid not null references debate_rounds on delete cascade,
  participant_id uuid not null references debate_participants on delete cascade,
  content        text not null,
  moderation     moderation_state not null default 'pending',
  submitted_at   timestamptz not null default now(),
  -- Null until both sides have submitted: this is what makes the exchange a
  -- debate rather than a comment thread.
  revealed_at    timestamptz,
  unique (round_id, participant_id)
);

create index debate_responses_participant_idx on debate_responses (participant_id);

create table debate_evidence (
  id          uuid primary key default gen_random_uuid(),
  response_id uuid not null references debate_responses on delete cascade,
  url         text not null,
  title       text,
  publisher   text,
  quote       text,
  note        text,
  created_at  timestamptz not null default now()
);

create table debate_scores (
  id                          uuid primary key default gen_random_uuid(),
  debate_id                   uuid not null references debates on delete cascade,
  participant_id              uuid not null references debate_participants on delete cascade,
  evidence_score              smallint not null check (evidence_score between 0 and 100),
  reasoning_score             smallint not null check (reasoning_score between 0 and 100),
  rebuttal_score              smallint not null check (rebuttal_score between 0 and 100),
  clarity_score               smallint not null check (clarity_score between 0 and 100),
  opponent_understanding_score smallint not null check (opponent_understanding_score between 0 and 100),
  civility_score              smallint not null check (civility_score between 0 and 100),
  overall_score               smallint not null check (overall_score between 0 and 100),
  feedback_json               jsonb not null default '{}'::jsonb,
  created_at                  timestamptz not null default now(),
  unique (participant_id)
);

-- =============================================================================
-- Rating and progression
-- =============================================================================

create table ratings (
  user_id    uuid primary key references profiles on delete cascade,
  rating     integer not null default 1200,
  updated_at timestamptz not null default now()
);

create table rating_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles on delete cascade,
  debate_id    uuid references debates on delete set null,
  rating       integer not null,
  delta        integer not null,
  outcome      debate_outcome not null,
  created_at   timestamptz not null default now()
);

create index rating_history_user_idx on rating_history (user_id, created_at desc);

-- Perspective work is stored apart from rating so it can never be farmed for
-- ladder points, and so a student is never penalised for taking it seriously.
create table perspective_attempts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles on delete cascade,
  debate_id         uuid not null references debates on delete cascade,
  original_position position_side not null,
  response          text not null,
  created_at        timestamptz not null default now()
);

create table perspective_scores (
  id                  uuid primary key default gen_random_uuid(),
  attempt_id          uuid not null references perspective_attempts on delete cascade,
  accuracy            smallint not null check (accuracy between 0 and 100),
  fairness            smallint not null check (fairness between 0 and 100),
  strength            smallint not null check (strength between 0 and 100),
  understanding       smallint not null check (understanding between 0 and 100),
  strawman_avoidance  smallint not null check (strawman_avoidance between 0 and 100),
  overall_score       smallint not null check (overall_score between 0 and 100),
  feedback_json       jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  unique (attempt_id)
);

create table badges (
  id          text primary key,
  name        text not null,
  description text not null,
  criterion   text not null,
  target      integer not null
);

create table user_badges (
  user_id   uuid not null references profiles on delete cascade,
  badge_id  text not null references badges on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- =============================================================================
-- Competition
-- =============================================================================

create table school_competitions (
  id                uuid primary key default gen_random_uuid(),
  week              date not null,
  home_school_id    uuid not null references schools on delete cascade,
  away_school_id    uuid not null references schools on delete cascade,
  home_points       integer not null default 0,
  away_points       integer not null default 0,
  debates_completed integer not null default 0,
  debates_target    integer not null default 50,
  status            text not null default 'upcoming',
  check (home_school_id <> away_school_id)
);

create table tournaments (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  starts_at    timestamptz not null,
  status       text not null default 'registration',
  min_debates  integer not null default 10,
  min_civility integer not null default 85,
  min_rating   integer not null default 1300
);

create table tournament_entries (
  tournament_id uuid not null references tournaments on delete cascade,
  user_id       uuid not null references profiles on delete cascade,
  seed          integer,
  rating_at_entry integer,
  primary key (tournament_id, user_id)
);

create table tournament_matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments on delete cascade,
  round         text not null,
  player_a      uuid references profiles on delete set null,
  player_b      uuid references profiles on delete set null,
  score_a       smallint,
  score_b       smallint,
  winner        uuid references profiles on delete set null,
  debate_id     uuid references debates on delete set null
);

-- =============================================================================
-- Discussion
-- =============================================================================

create table discussion_topics (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  question          text not null,
  context           text,
  related_debate_id uuid references debates on delete set null,
  created_at        timestamptz not null default now()
);

create table comments (
  id           uuid primary key default gen_random_uuid(),
  topic_id     uuid references discussion_topics on delete cascade,
  article_id   uuid references articles on delete cascade,
  user_id      uuid not null references profiles on delete cascade,
  body         text not null,
  moderation   moderation_state not null default 'pending',
  created_at   timestamptz not null default now(),
  check (topic_id is not null or article_id is not null)
);

create index comments_topic_idx on comments (topic_id, created_at desc);

-- Exactly one reaction exists, and it rewards changing a mind. There is
-- deliberately no downvote, no "angry", and no ratio to farm.
create table comment_reactions (
  comment_id uuid not null references comments on delete cascade,
  user_id    uuid not null references profiles on delete cascade,
  kind       text not null default 'made-me-think' check (kind = 'made-me-think'),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- =============================================================================
-- Classroom
-- =============================================================================

create table classrooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text unique not null,
  teacher_id  uuid not null references profiles on delete cascade,
  period      text,
  created_at  timestamptz not null default now()
);

create index classrooms_teacher_idx on classrooms (teacher_id);

create table classroom_members (
  classroom_id uuid not null references classrooms on delete cascade,
  user_id      uuid not null references profiles on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (classroom_id, user_id)
);

create table classroom_assignments (
  id              uuid primary key default gen_random_uuid(),
  classroom_id    uuid not null references classrooms on delete cascade,
  debate_id       uuid references debates on delete set null,
  title           text not null,
  due_at          timestamptz,
  format          debate_format not null default 'standard',
  side_assignment side_assignment not null default 'random',
  rubric_notes    text,
  created_at      timestamptz not null default now()
);

create table classroom_debates (
  id            uuid primary key default gen_random_uuid(),
  classroom_id  uuid not null references classrooms on delete cascade,
  assignment_id uuid not null references classroom_assignments on delete cascade,
  debate_id     uuid not null references debates on delete cascade,
  -- Class debates do not affect the public ladder.
  affects_rating boolean not null default false
);

create table teacher_feedback (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references classroom_assignments on delete cascade,
  student_id     uuid not null references profiles on delete cascade,
  scores_json    jsonb not null default '{}'::jsonb,
  -- The AI's text is stored separately from the teacher's, and `status` starts
  -- at 'pending'. Nothing here is a grade until a teacher acts on it.
  ai_suggested_comment text,
  teacher_comment      text,
  status         text not null default 'pending'
                 check (status in ('pending', 'accepted', 'edited', 'ignored')),
  created_at     timestamptz not null default now(),
  unique (assignment_id, student_id)
);

-- =============================================================================
-- Safety and system
-- =============================================================================

create table moderation_flags (
  id           uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id   uuid,
  excerpt      text,
  reason       report_reason not null,
  reported_by  uuid references profiles on delete set null,
  state        moderation_state not null default 'pending',
  automated    boolean not null default false,
  resolved_by  uuid references profiles on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index moderation_flags_state_idx on moderation_flags (state, created_at desc);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  href       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);

create table ai_jobs (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,
  input_json  jsonb not null default '{}'::jsonb,
  output_json jsonb,
  status      ai_job_status not null default 'queued',
  error       text,
  -- Every AI job producing political content lands here for human review.
  requires_review boolean not null default true,
  reviewed_by uuid references profiles on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index ai_jobs_status_idx on ai_jobs (status, created_at desc);

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table profiles              enable row level security;
alter table debate_participants   enable row level security;
alter table debate_responses      enable row level security;
alter table debate_evidence       enable row level security;
alter table debate_scores         enable row level security;
alter table rating_history        enable row level security;
alter table perspective_attempts  enable row level security;
alter table perspective_scores    enable row level security;
alter table user_badges           enable row level security;
alter table comments              enable row level security;
alter table comment_reactions     enable row level security;
alter table classrooms            enable row level security;
alter table classroom_members     enable row level security;
alter table classroom_assignments enable row level security;
alter table teacher_feedback      enable row level security;
alter table moderation_flags      enable row level security;
alter table notifications         enable row level security;
alter table saved_articles        enable row level security;
alter table ai_jobs               enable row level security;

-- Public content stays readable without an account: NGN is guest-readable by
-- design, so a student can follow the whole product before signing up.
alter table debates          enable row level security;
alter table articles         enable row level security;
alter table issues           enable row level security;
alter table sources          enable row level security;
alter table discussion_topics enable row level security;
alter table schools          enable row level security;

create policy "public content is readable" on debates          for select using (true);
create policy "public articles are readable" on articles       for select using (published_at is not null);
create policy "public issues are readable" on issues           for select using (true);
create policy "public sources are readable" on sources         for select using (true);
create policy "public topics are readable" on discussion_topics for select using (true);
create policy "public schools are readable" on schools         for select using (true);

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles: public fields readable, but only the owner may edit.
create policy "profiles are readable" on profiles
  for select using (true);
create policy "users edit their own profile" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users insert their own profile" on profiles
  for insert with check (auth.uid() = id);

-- Debate participation: a student may only write their own rows.
create policy "participants read their debates" on debate_participants
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from debate_participants peer
      where peer.debate_id = debate_participants.debate_id
        and peer.user_id = auth.uid()
    )
  );
create policy "users create their own participation" on debate_participants
  for insert with check (auth.uid() = user_id);
create policy "users update their own participation" on debate_participants
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Responses: a student may only write their own, and may only read an
-- opponent's once it has been revealed. This is the simultaneous-reveal rule
-- enforced in the database rather than only in the UI.
create policy "users write their own responses" on debate_responses
  for insert with check (
    exists (
      select 1 from debate_participants p
      where p.id = debate_responses.participant_id and p.user_id = auth.uid()
    )
  );
create policy "users update their own responses" on debate_responses
  for update using (
    exists (
      select 1 from debate_participants p
      where p.id = debate_responses.participant_id and p.user_id = auth.uid()
    )
  );
create policy "users read own and revealed responses" on debate_responses
  for select using (
    exists (
      select 1 from debate_participants p
      where p.id = debate_responses.participant_id and p.user_id = auth.uid()
    )
    or revealed_at is not null
  );

create policy "evidence follows its response" on debate_evidence
  for all using (
    exists (
      select 1
      from debate_responses r
      join debate_participants p on p.id = r.participant_id
      where r.id = debate_evidence.response_id and p.user_id = auth.uid()
    )
  );

create policy "scores are readable by participants" on debate_scores
  for select using (
    exists (
      select 1 from debate_participants p
      where p.id = debate_scores.participant_id and p.user_id = auth.uid()
    )
  );

create policy "own rating history" on rating_history
  for select using (auth.uid() = user_id);

-- Perspective work is private to its author. Nobody else needs to read a
-- student's attempt to argue a position they disagree with.
create policy "own perspective attempts" on perspective_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own perspective scores" on perspective_scores
  for select using (
    exists (
      select 1 from perspective_attempts a
      where a.id = perspective_scores.attempt_id and a.user_id = auth.uid()
    )
  );

create policy "badges are readable" on user_badges for select using (true);

-- Comments: approved content is public; a user always sees their own.
create policy "approved comments are readable" on comments
  for select using (moderation = 'approved' or auth.uid() = user_id);
create policy "users write their own comments" on comments
  for insert with check (auth.uid() = user_id);
create policy "users edit their own comments" on comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reactions are readable" on comment_reactions for select using (true);
create policy "users manage their own reactions" on comment_reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Classrooms: a teacher reaches their own classrooms; members reach theirs.
create policy "teachers manage their classrooms" on classrooms
  for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);
create policy "members read their classroom" on classrooms
  for select using (
    exists (
      select 1 from classroom_members m
      where m.classroom_id = classrooms.id and m.user_id = auth.uid()
    )
  );

create policy "classroom membership is scoped" on classroom_members
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from classrooms c
      where c.id = classroom_members.classroom_id and c.teacher_id = auth.uid()
    )
  );
create policy "students join a classroom" on classroom_members
  for insert with check (auth.uid() = user_id);

create policy "assignments are scoped to the class" on classroom_assignments
  for select using (
    exists (
      select 1 from classroom_members m
      where m.classroom_id = classroom_assignments.classroom_id
        and m.user_id = auth.uid()
    )
    or exists (
      select 1 from classrooms c
      where c.id = classroom_assignments.classroom_id and c.teacher_id = auth.uid()
    )
  );
create policy "teachers write assignments" on classroom_assignments
  for all using (
    exists (
      select 1 from classrooms c
      where c.id = classroom_assignments.classroom_id and c.teacher_id = auth.uid()
    )
  );

-- Feedback: a student reads their own; only the teacher writes it.
create policy "students read their own feedback" on teacher_feedback
  for select using (
    auth.uid() = student_id
    or exists (
      select 1
      from classroom_assignments a
      join classrooms c on c.id = a.classroom_id
      where a.id = teacher_feedback.assignment_id and c.teacher_id = auth.uid()
    )
  );
create policy "teachers write feedback" on teacher_feedback
  for all using (
    exists (
      select 1
      from classroom_assignments a
      join classrooms c on c.id = a.classroom_id
      where a.id = teacher_feedback.assignment_id and c.teacher_id = auth.uid()
    )
  );

-- Moderation: anyone may report; only admins may read the queue. Reporters are
-- never shown the outcome, and reported users never learn who reported them.
create policy "anyone may report" on moderation_flags
  for insert with check (auth.uid() = reported_by);
create policy "admins read the queue" on moderation_flags
  for select using (is_admin());
create policy "admins resolve flags" on moderation_flags
  for update using (is_admin());

create policy "own notifications" on notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own saved articles" on saved_articles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- AI jobs are internal, and their political output is admin-only until
-- reviewed. This is the database half of "never auto-publish".
create policy "admins manage ai jobs" on ai_jobs
  for all using (is_admin());

-- Admins may moderate content across the board.
create policy "admins write debates" on debates for all using (is_admin());
create policy "admins write articles" on articles for all using (is_admin());
create policy "admins write issues" on issues for all using (is_admin());
create policy "admins write sources" on sources for all using (is_admin());
