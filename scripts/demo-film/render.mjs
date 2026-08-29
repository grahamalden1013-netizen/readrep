/**
 * Renders the committed demo film from `choreography.mjs` + `draw.mjs`.
 *
 * The output (public/demo/*) is checked in, so this only needs to run when the
 * choreography changes. It needs two tools that are deliberately not project
 * dependencies — install them anywhere and point NODE_PATH at them:
 *
 *   mkdir -p /tmp/nextrep-film && cd /tmp/nextrep-film
 *   npm install playwright ffmpeg-static
 *   cd -
 *   NODE_PATH=/tmp/nextrep-film/node_modules node scripts/demo-film/render.mjs
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const outDir = path.join(repoRoot, "public", "demo");
const workDir = process.env.FILM_WORK_DIR ?? path.join(repoRoot, ".film-frames");

const { chromium } = require("playwright");
const ffmpegPath = require("ffmpeg-static");

const film = (await import("./choreography.mjs")).default;
const { FPS, WIDTH, HEIGHT, DURATION_MS } = film;
const totalFrames = Math.round((DURATION_MS / 1000) * FPS);
const POSTER_AT_MS = film.POSSESSIONS[0].pauseMs;

const stripExports = (source) => source.replace(/^export .*$/gm, "");
const choreographySrc = stripExports(fs.readFileSync(path.join(here, "choreography.mjs"), "utf8"));
const drawSrc = stripExports(fs.readFileSync(path.join(here, "draw.mjs"), "utf8"));

fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

// Honours a preinstalled Chromium (e.g. PLAYWRIGHT_BROWSERS_PATH) when the
// bundled build is not downloaded.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
await page.setContent(
  `<!doctype html><meta charset="utf-8"><body style="margin:0"><canvas id="c" width="${WIDTH}" height="${HEIGHT}"></canvas></body>`,
);
await page.addScriptTag({ content: choreographySrc });
await page.addScriptTag({ content: drawSrc });
await page.evaluate(() => {
  const canvas = document.getElementById("c");
  globalThis.__ctx = canvas.getContext("2d");
  globalThis.__batch = (startFrame, count, fps) => {
    const out = [];
    for (let i = 0; i < count; i += 1) {
      globalThis.NEXTREP_DRAW.renderFrame(
        globalThis.__ctx,
        globalThis.NEXTREP_FILM,
        ((startFrame + i) / fps) * 1000,
      );
      out.push(canvas.toDataURL("image/png").slice("data:image/png;base64,".length));
    }
    return out;
  };
});

const BATCH = 24;
for (let frame = 0; frame < totalFrames; frame += BATCH) {
  const count = Math.min(BATCH, totalFrames - frame);
  const encoded = await page.evaluate(
    ([start, size, fps]) => globalThis.__batch(start, size, fps),
    [frame, count, FPS],
  );
  encoded.forEach((base64, i) => {
    const name = String(frame + i + 1).padStart(5, "0");
    fs.writeFileSync(path.join(workDir, `${name}.png`), Buffer.from(base64, "base64"));
  });
  if (frame % (BATCH * 20) === 0) {
    process.stdout.write(`  frames ${frame + count}/${totalFrames}\n`);
  }
}

// Poster: the first rep's decision point, so the still shows a real read.
const posterFrame = String(Math.round((POSTER_AT_MS / 1000) * FPS)).padStart(5, "0");
fs.copyFileSync(path.join(workDir, `${posterFrame}.png`), path.join(outDir, "dragons-film-poster.png"));

await browser.close();

// Two encodings: VP9/WebM for Chromium and Firefox builds without proprietary
// codecs, H.264/MP4 for Safari and older iOS. The player picks the first it
// can decode.
execFileSync(
  ffmpegPath,
  [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(workDir, "%05d.png"),
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "26",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    path.join(outDir, "dragons-film.mp4"),
  ],
  { stdio: "inherit" },
);

execFileSync(
  ffmpegPath,
  [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(workDir, "%05d.png"),
    "-c:v", "libvpx-vp9",
    "-crf", "34",
    "-b:v", "0",
    "-row-mt", "1",
    "-pix_fmt", "yuv420p",
    path.join(outDir, "dragons-film.webm"),
  ],
  { stdio: "inherit" },
);

fs.rmSync(workDir, { recursive: true, force: true });
console.log(`Wrote ${path.join(outDir, "dragons-film.mp4")} (${totalFrames} frames @ ${FPS}fps)`);
