# NGN Supabase setup

The app runs fully without Supabase — every content read goes through
`lib/content/repository.ts`, which serves seeded demo content. Connecting
Supabase is what makes accounts, comments, reactions and the newsroom
persistent.

## 1. Create a project

Create a Supabase project, then copy the project URL and anon key into
`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

The app detects these at runtime (`lib/supabase/config.ts`). With them unset it
falls back to the demo session cookie instead of failing.

## 2. Apply the schema

Run `schema.sql` in the SQL editor, or with the CLI:

```bash
supabase db execute --file supabase/schema.sql
```

It creates the tables, row level security policies, and two guarantees worth
knowing about:

- **`articles_require_human_approval`** — a trigger that refuses any article
  reaching `approved`, `scheduled` or `published` without `approved_by` set.
  AI-generated drafts cannot skip a human.
- **`public_profiles`** — the view other readers can see. It omits email,
  school and grade, because many NGN readers are minors.

## 3. Seed content (optional)

`lib/content` holds the demo articles, issues, Weekly editions and discussions
used in this build. To move them into the database, write an import script that
maps each record onto the `articles` / `issues` / `weekly_articles` tables and
sets `is_demo = true`. Then swap the bodies of the functions in
`lib/content/repository.ts` for queries — nothing in the UI needs to change.

## 4. Make yourself an editor

The newsroom at `/admin` requires `profiles.role = 'editor'`:

```sql
update profiles set role = 'editor' where username = '<your-username>';
```
