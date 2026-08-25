/**
 * Browser smoke test for the two flows that matter.
 *
 * Not part of `pnpm verify`: it needs a built server already running, and a
 * quality gate that silently skips when its dependency is missing is worse than
 * no gate. Run it deliberately:
 *
 *   pnpm build
 *   READREP_SESSION_SECRET=$(openssl rand -hex 32) pnpm --filter @readrep/web start
 *   READREP_BASE_URL=http://localhost:3001 pnpm --filter @readrep/web test:browser
 *
 * The load-bearing check is that the answer is absent from the served HTML,
 * from the RSC flight payload, and from every network response before the
 * player commits. That is the one property that makes a reveal a reveal, and it
 * cannot be verified from a unit test of the interface alone.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.READREP_BASE_URL ?? "http://localhost:3001";
const SHOT = process.env.READREP_SHOT_DIR ?? "./.screenshots";
const PASSWORD = process.env.READREP_SEED_PASSWORD ?? "ReadRep-dev-2026";

/**
 * Deliberately distinctive and unique per run.
 *
 * The seed ships one assignment so a developer can try the player session
 * immediately. This title is created only by the assign UI during this run, so
 * the player-side check below cannot pass on seeded data.
 */
const ASSIGNED_TITLE = `Closeout reads ${Date.now()}`;

const pass = [];
const fail = [];
const check = (name, ok, detail = "") => {
  (ok ? pass : fail).push(name + (detail ? ` — ${detail}` : ""));
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/** Visible text only. `textContent` would also return inline RSC script bodies. */
const visibleText = (page) => page.evaluate(() => document.body.innerText);

/**
 * Case-insensitive contains.
 *
 * Section labels are uppercased in CSS, and `innerText` returns rendered text,
 * so a case-sensitive match would fail on styling rather than on substance.
 */
const has = (haystack, needle) => haystack.toLowerCase().includes(needle.toLowerCase());

mkdirSync(SHOT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.READREP_CHROMIUM ?? "/opt/pw-browsers/chromium",
  // The sandbox routes outbound traffic through a proxy; localhost must not.
  args: ["--no-proxy-server"],
});

async function signIn(ctx, email) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in`);
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 20000,
  });
  return page;
}

/**
 * Presses a key until the interface reacts.
 *
 * The keyboard handler is attached on hydration, so a key pressed in the gap
 * between first paint and hydration is genuinely lost. Retrying is what a
 * player would do; it is not papering over a bug.
 */
async function pressUntilArmed(page, key, attempts = 20) {
  for (let i = 0; i < attempts; i += 1) {
    await page.keyboard.press(key);
    if (!(await page.isDisabled('button:has-text("Lock in my read")'))) return true;
    await page.waitForTimeout(150);
  }
  return false;
}

/* -------------------- Player flow, desktop -------------------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await signIn(ctx, "player@readrep.local");
  check("player signs in and lands on their sessions", page.url().includes("/player"));
  check("player dashboard names the player", has(await visibleText(page), "Jordan"));
  await page.screenshot({ path: `${SHOT}/01-player-home.png`, fullPage: true });

  // Record every response body while the pre-reveal page loads.
  const bodies = [];
  page.on("response", async (r) => {
    if (r.request().resourceType() === "image" || r.url().includes("/_next/static"))
      return;
    try {
      bodies.push(await r.text());
    } catch {
      /* opaque or already consumed */
    }
  });

  await page.click('a[href^="/session/"]');
  await page.waitForSelector("#question-heading");
  const prompt = await page.textContent("#question-heading");
  check(
    "session pauses on a question",
    prompt?.includes("best read"),
    prompt?.slice(0, 44),
  );

  // The answer must not be anywhere in what was served.
  const answerMarkers = [
    "corner defender left first",
    "The low man has already stepped",
    "rationale",
    "preferredOptionId",
    "quality",
  ];
  const html = await page.content();
  const inHtml = answerMarkers.filter((m) => html.includes(m));
  check("served HTML carries no answer", inHtml.length === 0, inHtml.join(", "));

  const joined = bodies.join("\n");
  const inNetwork = answerMarkers.filter((m) => joined.includes(m));
  check(
    "no network response carries the answer",
    inNetwork.length === 0,
    inNetwork.join(", ") || `${bodies.length} responses inspected`,
  );

  check(
    "cannot continue before committing",
    await page.isDisabled('button:has-text("Lock in my read")'),
  );
  await page.screenshot({ path: `${SHOT}/02-session-decide.png`, fullPage: true });

  // Keyboard path: 2 = "Skip to the weak-side corner", the preferred read.
  check("keyboard number key selects an option", await pressUntilArmed(page, "2"));
  await page.keyboard.press("Enter");
  await page.waitForSelector("#reveal-heading", { timeout: 15000 });

  const reveal = await visibleText(page);
  check("reveal arrives only after committing", has(reveal, "Preferred read"));
  check("reveal states what was visible", has(reveal, "What was happening"));
  check("reveal teaches the cue", has(reveal, "The cue"));
  check(
    "reveal cites the coach's own rule",
    has(reveal, "look weak-side before forcing the finish"),
  );
  check("reveal reports the outcome separately", has(reveal, "What actually happened"));
  check("a preferred read is shown with a missed shot", has(reveal, "Missed shot"));
  check(
    "reveal says the result does not grade the read",
    has(reveal, "A good decision can miss"),
  );
  check("reveal surfaces uncertainty", has(reveal, "What we could not see"));
  check("reveal names the off-screen limit", has(reveal, "Off screen"));
  check("reveal gives a next-time cue", has(reveal, "Next time"));
  check("reflection is offered", has(reveal, "What did you miss"));
  check("player is never told they were wrong", !/\bwrong\b/i.test(reveal));
  await page.screenshot({ path: `${SHOT}/03-session-reveal.png`, fullPage: true });

  await page.fill("#missed-cue", "I watched my own defender instead of the low man.");
  await page.check("input[type=checkbox]");
  await page.click('button:has-text("Next rep")');

  /* Rep 2 — court-area selection */
  await page.waitForSelector("#question-heading", { timeout: 15000 });
  const p2 = await page.textContent("#question-heading");
  check(
    "second rep uses a different response type",
    p2?.includes("attacking"),
    p2?.slice(0, 44),
  );
  const areas = await page.locator("fieldset button").count();
  check("court areas are selectable", areas >= 4, `${areas} areas`);
  await page.screenshot({ path: `${SHOT}/04-session-court-area.png`, fullPage: true });

  await page.click("fieldset button >> nth=0");
  await page.click('button:has-text("Lock in my read")');
  await page.waitForSelector("#reveal-heading", { timeout: 15000 });
  await page.click('button:has-text("Next rep")');

  /* Rep 3 — written answer, deliberately not auto-graded */
  await page.waitForSelector("#question-heading", { timeout: 15000 });
  check(
    "third rep accepts a written answer",
    (await page.locator("#short-answer").count()) === 1,
  );
  await page.fill("#short-answer", "Tag the roller first, then recover to the corner.");
  await page.click('button:has-text("Lock in my read")');
  await page.waitForSelector("#reveal-heading", { timeout: 15000 });
  check(
    "written answers are not auto-graded",
    has(await visibleText(page), "not graded automatically"),
  );

  await page.click('button:has-text("Finish session")');
  await page.waitForURL("**/player", { timeout: 15000 });
  check(
    "session reads as complete afterwards",
    has(await visibleText(page), "Complete"),
  );
  await page.screenshot({ path: `${SHOT}/05-player-complete.png`, fullPage: true });
  await ctx.close();
}

/* -------------------- Mobile -------------------- */
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await signIn(ctx, "player@readrep.local");
  await page.goto(`${BASE}/player`);
  await page.screenshot({ path: `${SHOT}/06-mobile-player.png`, fullPage: true });
  check(
    "player home does not scroll sideways at 390px",
    !(await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    )),
  );
  await ctx.close();
}

/* -------------------- Coach -------------------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await signIn(ctx, "coach@readrep.local");
  await page.goto(`${BASE}/coach`);
  const coach = await visibleText(page);
  check("coach sees their team", has(coach, "Northside Select 16U"));
  check("coach dashboard shows no invented score", !/basketball\s*iq/i.test(coach));
  await page.screenshot({ path: `${SHOT}/07-coach-home.png`, fullPage: true });

  await page.goto(`${BASE}/coach/review`);
  const queue = await visibleText(page);
  check("review queue lists what is waiting", has(queue, "Waiting on you"));
  check("queue labels manually authored proposals", has(queue, "Written by hand"));
  await page.screenshot({ path: `${SHOT}/08-coach-queue.png`, fullPage: true });

  // Wait for the navigation, not for "h1" -- the queue page has one of its own,
  // so waiting on the selector alone resolves against the page we are leaving.
  const candidateHref = await page.getAttribute(
    'a[href^="/coach/review/cand-"]',
    "href",
  );
  await page.goto(`${BASE}${candidateHref}`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Observed", { timeout: 15000 });
  const review = await visibleText(page);
  check("review separates observed facts", has(review, "Observed — what is visible"));
  check("review separates inference", has(review, "Inferred — basketball reasoning"));
  check(
    "review shows the applicable coach rules",
    has(review, "Your rules for this situation"),
  );
  check(
    "review shows the outcome apart from the read",
    has(review, "What happened on the possession"),
  );
  await page.screenshot({ path: `${SHOT}/09-coach-review.png`, fullPage: true });

  await page.click('button:has-text("Approve")');
  await page.waitForSelector('a:has-text("Assign to player")', { timeout: 15000 });
  const approved = await visibleText(page);
  check("approval shows a success state", has(approved, "Approved and published"));
  check(
    "approval says the moment does not reach the player until assigned",
    has(approved, "reaches them only once you assign it"),
  );
  await page.screenshot({ path: `${SHOT}/10-coach-after-approve.png`, fullPage: true });

  /* ---- Assign the approved moment to a player ---- */
  await page.click('a:has-text("Assign to player")');
  await page.waitForURL("**/coach/assign/**", { timeout: 15000 });
  await page.waitForSelector("#assignment-title");

  const assignText = await visibleText(page);
  check("assign screen names the moment's owner", has(assignText, "Jordan"));
  check("assign screen lists the rest of the roster", has(assignText, "Taylor"));
  check(
    "a teammate is marked unavailable for another player's film",
    has(assignText, "Unavailable"),
  );
  check(
    "the reason for ineligibility is explained",
    has(assignText, "another player's film") || has(assignText, "consent"),
  );
  check(
    "an ineligible player cannot be selected",
    await page.isDisabled('button:has-text("Taylor")'),
  );
  check("the due date is marked optional", has(assignText, "optional"));

  await page.fill("#assignment-title", ASSIGNED_TITLE);
  const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  await page.fill("#assignment-due", due);
  await page.screenshot({ path: `${SHOT}/14-coach-assign.png`, fullPage: true });

  await page.click('[data-testid="assign-submit"]');
  await page.waitForSelector('[data-testid="assign-success"]', { timeout: 15000 });
  const assignedText = await visibleText(page);
  check("assignment shows a clear success state", has(assignedText, "Assigned"));
  check("the success state names the player", has(assignedText, "Jordan"));
  check(
    "the submit control is gone once it has succeeded",
    (await page.locator('[data-testid="assign-submit"]').count()) === 0,
  );
  await page.screenshot({
    path: `${SHOT}/15-coach-assign-success.png`,
    fullPage: true,
  });

  await page.goto(`${BASE}/coach/review`);
  check(
    "an approved candidate leaves the pending queue",
    has(await visibleText(page), "Already decided"),
  );

  await page.goto(`${BASE}/coach/review/cand-transition-ungrounded`);
  check(
    "a proposal with no coach rule is labelled general reasoning",
    has(await visibleText(page), "General basketball reasoning"),
  );
  await page.screenshot({ path: `${SHOT}/11-coach-ungrounded.png`, fullPage: true });

  await page.goto(`${BASE}/coach/system`);
  const system = await visibleText(page);
  check("questionnaire renders", has(system, "Your system"));
  check(
    "questionnaire previews the rule an answer produces",
    has(system, "Becomes the rule"),
  );
  const answered = system.match(/(\d+) of (\d+) answered/);
  check(
    "questionnaire is pre-filled from the saved revision",
    answered?.[1] === "16" && answered?.[2] === "16",
    answered?.[0],
  );
  await page.screenshot({ path: `${SHOT}/12-coach-system.png`, fullPage: true });
  await ctx.close();
}

/* -------------------- The assignment reaches the player -------------------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await signIn(ctx, "player@readrep.local");
  await page.goto(`${BASE}/player`);
  const home = await visibleText(page);

  check(
    "the coach's new assignment appears in the player's queue",
    has(home, ASSIGNED_TITLE),
  );
  check("the due date is shown to the player", /due\s+\w{3}\s+\d{1,2}/i.test(home));

  // Count list entries, not raw text matches: the dashboard legitimately shows
  // the next session twice, once in "Next up" and once in "All sessions".
  const entries = await page.locator(`ul li a:has-text("${ASSIGNED_TITLE}")`).count();
  check(
    "it was created exactly once, not duplicated",
    entries === 1,
    `${entries} entries`,
  );

  await page.locator(`a:has-text("${ASSIGNED_TITLE}")`).first().click();
  await page.waitForSelector("#question-heading", { timeout: 15000 });
  check(
    "the assigned session opens on a question",
    (await page.locator("#question-heading").count()) === 1,
  );
  await page.screenshot({ path: `${SHOT}/16-player-assigned.png`, fullPage: true });
  await ctx.close();
}

/* -------------------- Cross-account isolation -------------------- */
{
  const ctx = await browser.newContext();
  const page = await signIn(ctx, "outsider@readrep.local");

  const r1 = await page.goto(`${BASE}/session/assignment-jordan-week-1`);
  const b1 = await visibleText(page);
  check(
    "a coach from another team cannot open the session",
    (r1?.status() ?? 0) >= 400 || !has(b1, "best read"),
    `status ${r1?.status()}`,
  );

  const r2 = await page.goto(`${BASE}/coach/review/cand-low-man-tag`);
  const b2 = await visibleText(page);
  check(
    "a coach from another team cannot open the candidate",
    (r2?.status() ?? 0) >= 400 || !has(b2, "Observed"),
    `status ${r2?.status()}`,
  );

  const r3 = await page.goto(`${BASE}/coach/assign/moment-pnr-low-tag`);
  const b3 = await visibleText(page);
  check(
    "a coach from another team cannot open the assign screen",
    (r3?.status() ?? 0) >= 400 || !has(b3, "Session name"),
    `status ${r3?.status()}`,
  );
  await page.screenshot({ path: `${SHOT}/13-outsider-denied.png`, fullPage: true });
  await ctx.close();
}

/* -------------------- Trainer with no grant -------------------- */
{
  const ctx = await browser.newContext();
  const page = await signIn(ctx, "trainer@readrep.local");
  const r = await page.goto(`${BASE}/coach/review/cand-low-man-tag`);
  const b = await visibleText(page);
  check(
    "a trainer with no access grant is refused",
    (r?.status() ?? 0) >= 400 || !has(b, "Observed"),
    `status ${r?.status()}`,
  );
  await ctx.close();
}

await browser.close();
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if (fail.length) {
  console.log("\nFAILURES:");
  for (const f of fail) console.log("  - " + f);
  process.exitCode = 1;
}
