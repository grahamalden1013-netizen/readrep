# Demo content

Everything in this directory is **seeded demo data**, not real editorial
content, and nothing in it should ever be published as-is.

## What is safe about it

Deliberate choices that keep this data honest while the product is a demo:

- **No fictional breaking news.** Every debate question and article covers a
  durable civic question (the voting age, the Electoral College, Section 230,
  the minimum wage). Nothing is written as a report of something that happened
  today, so nothing here can be mistaken for a real news event.
- **Real, checkable sources.** `sources.ts` points at stable government,
  research and reporting pages. Before any of this becomes real editorial
  content an editor must replace each entry with the exact document cited.
- **Illustrative statistics only.** Figures are widely known and stable
  (the federal minimum wage is $7.25; there are 538 electors). Participation
  counts, sentiment splits and average scores are invented and are labelled in
  the UI wherever they are shown.
- **Invented usernames.** Seeded students are handles, not people. No seeded
  profile carries anything a real profile would not: no ideology, no location
  finer than a state, no age.
- **Both sides at full strength.** Argument banks give each side its strongest
  real arguments. An opponent who argues badly teaches nothing, and a briefing
  that steelmans one side and strawmans the other is not neutral.
- **Parties are never flattened.** Every issue and party entry records where
  each party disagrees with itself.

## How the UI marks it

`isDemoContent()` in `index.ts` is the single switch. Surfaces that display
seeded participation numbers render a `DemoBadge`, so a reader always knows
which figures are illustrative.

## Files

| File | Contents |
| --- | --- |
| `sources.ts` | Shared source catalogue, ordered by evidence hierarchy |
| `debates.ts` | 8 debates with full briefings and opponent argument banks |
| `articles.ts` | 6 explanatory briefs + 2 NGN Weekly editorials |
| `issues.ts` | 6 issue library entries |
| `parties.ts` | 5 party explorer entries |
| `discussions.ts` | 3 slow-discussion threads |
| `community.ts` | 12 students, 5 schools, leaderboards, 1 tournament |
| `classroom.ts` | 1 classroom, moderation queue, notifications |
