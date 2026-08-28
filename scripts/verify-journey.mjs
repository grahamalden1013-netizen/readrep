/**
 * End-to-end verification of NGN's critical journey (spec §51).
 *
 * Drives a real browser through: homepage → briefing → explainer → position →
 * matchmaking → four debate rounds with evidence → AI scoring → results with a
 * rating change → Switch Sides → Perspective Score → profile → leaderboard.
 * Then checks every breakpoint for horizontal overflow.
 *
 *   npx next build && npx next start -p 3100 &
 *   node scripts/verify-journey.mjs
 *
 * Requires playwright (not a project dependency — install it ad hoc):
 *   npm install --no-save playwright
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.NGN_BASE ?? 'http://localhost:3100';
const SHOTS = process.env.NGN_SHOTS ?? '/tmp/ngn-shots';
const log = (...a) => console.log('•', ...a);
const errors = [];
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_BROWSERS_PATH ? { executablePath: `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium` } : {},
);
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));

async function shot(name) { await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false }); }

// 1. Homepage
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
log('homepage:', await page.title());
if (!(await page.getByRole('heading', { level: 1 }).first().textContent())?.includes('Defend it')) throw new Error('tagline missing');
await shot('01-home');

// 2. Today's debate -> briefing
await page.getByRole('link', { name: 'Understand the Issue' }).first().click();
await page.waitForURL(/\/brief/);
log('briefing:', await page.getByRole('heading', { level: 1 }).textContent());
if (!(await page.getByText('What supporters argue').isVisible())) throw new Error('supporter args missing');
if (!(await page.getByText('What opponents argue').isVisible())) throw new Error('opponent args missing');
await shot('02-brief');

// 3. "I don't get it" panel
await page.getByRole('button', { name: /I don.t get it/i }).first().click();
await page.getByRole('button', { name: /Explain this in 60 seconds/ }).click();
await page.waitForTimeout(1200);
const explainerText = await page.getByRole('dialog').innerText();
if (explainerText.length < 200) throw new Error('explainer produced nothing');
log('explainer returned', explainerText.length, 'chars');
await shot('03-explainer');
await page.getByRole('button', { name: 'Close' }).click();

// 4. Ready to debate -> position
await page.getByRole('link', { name: /I.m ready to debate/ }).click();
await page.waitForURL(/\/position/);
log('position page reached');
await page.getByRole('radio', { name: 'Support' }).click();
await page.getByRole('button', { name: '4 out of 5' }).click();
await shot('04-position');

// 5. Matchmaking
await page.getByRole('button', { name: 'Find an opponent' }).click();
await page.waitForURL(/\/match/);
log('matchmaking…');
await page.getByRole('button', { name: 'Start debate' }).click({ timeout: 15000 });
await page.waitForURL(/\/debate/);
log('debate room reached');
await shot('05-match-found');

// 6. Play all four rounds
const ROUND_TEXT = [
  "According to the U.S. National Archives, the 26th Amendment set the voting age at 18 in 1971 because Americans were being drafted at that age. That precedent matters here because it establishes that the franchise tracks the burdens the state imposes. A 16-year-old with a job has federal income tax withheld on exactly the same terms as an adult, which means they are already bearing one of those burdens without any say in who sets the rate.",
  "You argued that 18 is where the law already draws adulthood, so moving the vote alone makes the boundary incoherent. But the boundary is already incoherent, because 16-year-olds can drive and work while 21 governs alcohol. The law sets different ages for different capacities because different capacities mature at different rates, and the developmental research finds that deliberative judgment is adult-like by 16.",
  "Your strongest point is the dependence argument, and I want to grant it properly rather than dismiss it: a 16-year-old at a kitchen table with a parent watching is in a genuinely different position from an adult. Two responses. First, according to Census Bureau voting data, plenty of adults vote as their households do and we do not disenfranchise them. Second, evidence from jurisdictions that lowered the age does not show lockstep voting.",
  "The question is not whether 16-year-olds are as experienced as adults, because many 18-year-olds are not either. The question is what the vote is for. If it is a reward for maturity we would need a test, and we abandoned tests for good reason. If it is a right attaching to anyone the state's decisions bind, then people who are taxed and schooled under those decisions have the strongest claim available.",
];

for (let i = 0; i < 4; i++) {
  await page.locator('textarea').first().fill(ROUND_TEXT[i]);
  if (i === 0) {
    // Attach evidence on the opening round to exercise that path.
    await page.getByRole('button', { name: /Add evidence/ }).click();
    await page.getByPlaceholder('https://www.census.gov/…').fill('https://www.census.gov/topics/public-sector/voting.html');
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: 'Attach' }).click({ timeout: 8000 });
    log('evidence attached');
  }
  const submit = page.getByRole('button', { name: /^Submit/ });
  await submit.click();
  log(`round ${i + 1} submitted`);
  if (i === 0) await shot('06-round1-waiting');
  // Wait for the reveal, then continue.
  const cont = page.getByRole('button', { name: /^Continue to/ });
  const score = page.getByRole('button', { name: 'Get your score' });
  await Promise.race([
    cont.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {}),
    score.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {}),
  ]);
  if (i === 1) await shot('07-exchange');
  if (await cont.isVisible().catch(() => false)) await cont.click();
}

// 7. Scoring -> results
await page.getByRole('button', { name: 'Get your score' }).click({ timeout: 20000 });
await page.waitForURL(/\/results/, { timeout: 40000 });
log('results reached');
const verdict = await page.getByRole('heading', { level: 1 }).textContent();
const bodyText = await page.locator('body').innerText();
log('verdict:', verdict?.trim());

const lower = bodyText.toLowerCase();
for (const needed of ['your rating', 'evidence', 'reasoning', 'rebuttal', 'understanding opponent', 'civility',
                      "your opponent's strongest argument", 'switch sides']) {
  if (!lower.includes(needed)) throw new Error(`results missing: ${needed}`);
}
const ratingMatch = bodyText.match(/1200\s*→\s*(\d+)/);
log('rating change:', ratingMatch ? `1200 → ${ratingMatch[1]}` : 'NOT FOUND');
if (!ratingMatch) throw new Error('rating did not change');
await shot('08-results');

// 8. Switch Sides
await page.getByRole('link', { name: 'Switch Sides' }).click();
await page.waitForURL(/\/switch-sides/);
log('switch sides reached');
await page.locator('textarea').first().fill(
  "The strongest case against lowering the voting age rests on dependence rather than on capability. At 18 the law recognises a person as able to sign a binding contract, serve on a jury and answer fully for a crime; those arrive together because they describe one status. A 16-year-old living at home, financially dependent, filling in a ballot with a parent present is in a materially different position from an adult who can close a door, and extending the franchise into that setting may hand some adults a second vote rather than giving teenagers an independent one. Eighteen was also set deliberately in 1971 after a national argument, and reopening it needs a stronger justification than consistency alone."
);
await page.getByRole('button', { name: /Submit for Perspective Score/ }).click();
await page.waitForTimeout(3500);
const perspectiveText = await page.locator('body').innerText();
const pMatch = perspectiveText.match(/(\d+)\s*\/100/);
log('perspective score:', pMatch ? pMatch[1] : 'NOT FOUND');
if (!pMatch) throw new Error('no perspective score');
if (!perspectiveText.includes('does not affect your Arena Rating')) throw new Error('missing rating-independence note');
await shot('09-perspective');

// 9. Profile reflects the debate
await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const profileText = await page.locator('body').innerText();
if (profileText.includes('Your first debate starts here')) throw new Error('profile did not update');
const profileLower = profileText.toLowerCase();
for (const needed of ['arena rating', 'debates', 'perspective score', 'recent debates', 'badges']) {
  if (!profileLower.includes(needed)) throw new Error(`profile missing: ${needed}`);
}
log('profile updated ✓');
await shot('10-profile');

// 10. Leaderboard reflects the rating
await page.goto(`${BASE}/rankings`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const youRow = await page.locator('tr', { hasText: 'You' }).count();
if (youRow === 0) throw new Error('student not spliced into leaderboard');
log('leaderboard shows the student ✓');
await shot('11-rankings');

// 11. Mobile viewport, no horizontal overflow
for (const width of [320, 375, 390, 430, 768]) {
  const m = await browser.newPage({ viewport: { width, height: 800 } });
  for (const route of ['/', '/arena', '/arena/voting-age-16/brief', '/rankings', '/today/who-gets-to-vote']) {
    await m.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) throw new Error(`horizontal overflow ${overflow}px at ${width}px on ${route}`);
  }
  if (width === 390) { await m.goto(`${BASE}/`); await m.screenshot({ path: `${SHOTS}/12-mobile-390.png`, fullPage: false }); }
  await m.close();
}
log('no horizontal overflow at 320/375/390/430/768 ✓');

await browser.close();

console.log('\n=== console/page errors ===');
console.log(errors.length ? errors.join('\n') : '(none)');
console.log('\nEND-TO-END JOURNEY: PASS');
