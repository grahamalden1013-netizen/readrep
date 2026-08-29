/**
 * Canvas rendering for the NextRep demo film. Runs inside the browser page used
 * by `render.mjs`; keep it free of Node APIs and module imports.
 */

const COURT_LENGTH = 94;
const COURT_WIDTH = 50;
const HOOP = { left: { x: 5.25, y: 25 }, right: { x: 88.75, y: 25 } };
const THREE_RADIUS = 23.75;
const CORNER_Y = [3, 47];

const PALETTE = {
  surround: "#0b0c0b",
  floor: "#c1854a",
  floorDark: "#a86f39",
  paint: "#96602c",
  line: "rgba(255,255,255,0.82)",
  white: { fill: "#f1efe8", stroke: "#15181a", text: "#15181a" },
  red: { fill: "#c22a21", stroke: "#4d0f0a", text: "#ffe9e6" },
  ball: "#e2801f",
  ballStroke: "#7a3d06",
};

function ease(t) {
  return t * t * (3 - 2 * t);
}

/** Interpolates a [seconds, x, y] keyframe track at local time `t`. */
function sample(track, t) {
  if (t <= track[0][0]) return { x: track[0][1], y: track[0][2] };
  const last = track[track.length - 1];
  if (t >= last[0]) return { x: last[1], y: last[2] };

  for (let i = 0; i < track.length - 1; i += 1) {
    const [t0, x0, y0] = track[i];
    const [t1, x1, y1] = track[i + 1];
    if (t >= t0 && t <= t1) {
      const span = t1 - t0;
      const k = span === 0 ? 0 : ease((t - t0) / span);
      return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k };
    }
  }
  return { x: last[1], y: last[2] };
}

function makeTransform(width, height) {
  const pad = 24;
  const scale = (width - pad * 2) / COURT_LENGTH;
  return {
    scale,
    ox: pad,
    oy: (height - COURT_WIDTH * scale) / 2,
    px(x) {
      return this.ox + x * this.scale;
    },
    py(y) {
      return this.oy + y * this.scale;
    },
    len(feet) {
      return feet * this.scale;
    },
  };
}

function drawHalf(ctx, T, side) {
  const hoop = HOOP[side];
  const dir = side === "left" ? 1 : -1;
  const baseline = side === "left" ? 0 : COURT_LENGTH;

  // Key + free-throw circle
  const keyFar = baseline + dir * 19;
  ctx.fillStyle = PALETTE.paint;
  ctx.fillRect(
    T.px(Math.min(baseline, keyFar)),
    T.py(17),
    T.len(19),
    T.len(16),
  );
  ctx.strokeRect(
    T.px(Math.min(baseline, keyFar)),
    T.py(17),
    T.len(19),
    T.len(16),
  );

  ctx.beginPath();
  ctx.arc(T.px(keyFar), T.py(25), T.len(6), 0, Math.PI * 2);
  ctx.stroke();

  // Three-point line: two straight corners joined by the arc.
  const cornerOffset = Math.sqrt(THREE_RADIUS ** 2 - (25 - CORNER_Y[0]) ** 2);
  const cornerX = hoop.x + dir * cornerOffset;
  const a0 = Math.atan2(CORNER_Y[0] - 25, cornerX - hoop.x);
  const a1 = Math.atan2(CORNER_Y[1] - 25, cornerX - hoop.x);

  ctx.beginPath();
  ctx.moveTo(T.px(baseline), T.py(CORNER_Y[0]));
  ctx.lineTo(T.px(cornerX), T.py(CORNER_Y[0]));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(T.px(baseline), T.py(CORNER_Y[1]));
  ctx.lineTo(T.px(cornerX), T.py(CORNER_Y[1]));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(T.px(hoop.x), T.py(25), T.len(THREE_RADIUS), a0, a1, side === "right");
  ctx.stroke();

  // Restricted area
  ctx.beginPath();
  ctx.arc(T.px(hoop.x), T.py(25), T.len(4), -Math.PI / 2, Math.PI / 2, side === "right");
  ctx.stroke();

  // Backboard + rim
  const boardX = baseline + dir * 4;
  ctx.lineWidth = Math.max(1, T.len(0.4));
  ctx.beginPath();
  ctx.moveTo(T.px(boardX), T.py(22));
  ctx.lineTo(T.px(boardX), T.py(28));
  ctx.stroke();
  ctx.lineWidth = Math.max(1, T.len(0.22));

  ctx.beginPath();
  ctx.arc(T.px(hoop.x), T.py(25), T.len(0.75), 0, Math.PI * 2);
  ctx.stroke();
}

function drawCourt(ctx, T, width, height) {
  ctx.fillStyle = PALETTE.surround;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(T.px(0), T.py(0), T.len(COURT_LENGTH), T.len(COURT_WIDTH));

  // Plank texture keeps large flat areas from banding in the encode.
  ctx.fillStyle = PALETTE.floorDark;
  ctx.globalAlpha = 0.18;
  for (let x = 0; x < COURT_LENGTH; x += 4) {
    ctx.fillRect(T.px(x), T.py(0), T.len(0.5), T.len(COURT_WIDTH));
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = PALETTE.line;
  ctx.lineWidth = Math.max(1, T.len(0.22));

  ctx.strokeRect(T.px(0), T.py(0), T.len(COURT_LENGTH), T.len(COURT_WIDTH));

  ctx.beginPath();
  ctx.moveTo(T.px(47), T.py(0));
  ctx.lineTo(T.px(47), T.py(COURT_WIDTH));
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(T.px(47), T.py(25), T.len(6), 0, Math.PI * 2);
  ctx.stroke();

  drawHalf(ctx, T, "left");
  drawHalf(ctx, T, "right");
}

function drawPlayer(ctx, T, id, pos) {
  const team = id.startsWith("w") ? PALETTE.white : PALETTE.red;
  const number = id.slice(1);
  const radius = T.len(1.7);

  ctx.beginPath();
  ctx.arc(T.px(pos.x), T.py(pos.y) + radius * 0.35, radius * 0.95, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(T.px(pos.x), T.py(pos.y), radius, 0, Math.PI * 2);
  ctx.fillStyle = team.fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1, radius * 0.13);
  ctx.strokeStyle = team.stroke;
  ctx.stroke();

  ctx.fillStyle = team.text;
  ctx.font = `700 ${Math.round(radius * 1.05)}px "Arial", "Helvetica", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(number, T.px(pos.x), T.py(pos.y) + radius * 0.05);
}

/**
 * Nudges the ball clear of whoever is holding it so their jersey number stays
 * readable — the player has to be identifiable by number for the demo to work.
 */
function offsetBall(pos, players) {
  let holder = null;
  let holderDistance = Infinity;
  for (const player of players) {
    const distance = Math.hypot(player.x - pos.x, player.y - pos.y);
    if (distance < holderDistance) {
      holderDistance = distance;
      holder = player;
    }
  }
  if (!holder || holderDistance > 2.6) return pos;

  // Pick the seat around the holder that stays clearest of everyone else.
  const others = players.filter((player) => player !== holder);
  let best = pos;
  let bestClearance = -Infinity;
  for (let step = 0; step < 16; step += 1) {
    const angle = (step / 16) * Math.PI * 2;
    const candidate = {
      x: holder.x + Math.cos(angle) * 2.6,
      y: holder.y + Math.sin(angle) * 2.6,
    };
    const clearance = others.reduce(
      (min, player) => Math.min(min, Math.hypot(player.x - candidate.x, player.y - candidate.y)),
      Infinity,
    );
    if (clearance > bestClearance) {
      bestClearance = clearance;
      best = candidate;
    }
  }
  return best;
}

function drawBall(ctx, T, pos) {
  const radius = T.len(0.72);
  ctx.beginPath();
  ctx.arc(T.px(pos.x), T.py(pos.y), radius, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.ball;
  ctx.fill();
  ctx.lineWidth = Math.max(1, radius * 0.34);
  ctx.strokeStyle = PALETTE.ballStroke;
  ctx.stroke();
}

function formatClock(totalSeconds) {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function drawOverlay(ctx, width, height, possession, localSeconds) {
  ctx.save();
  ctx.fillStyle = "rgba(11,12,11,0.78)";
  ctx.fillRect(20, 18, 116, 34);
  ctx.fillStyle = "#f1efe8";
  ctx.font = '600 16px "Arial", "Helvetica", sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${possession.clock.period}  ${formatClock(possession.clock.startSeconds - localSeconds)}`,
    34,
    36,
  );

  ctx.fillStyle = "rgba(241,239,232,0.55)";
  ctx.font = '600 12px "Arial", "Helvetica", sans-serif';
  ctx.textAlign = "right";
  ctx.fillText("DEMO FILM — ANIMATED RE-CREATION", width - 24, height - 26);
  ctx.restore();
}

/**
 * Fade up from black at the start of each possession so the cut reads as an
 * edit. Deliberately no fade-out: a rep's clip ends on the last frame of its
 * possession, and that frame has to show the outcome, not black.
 */
function drawCut(ctx, width, height, localSeconds) {
  const fade = 0.4;
  if (localSeconds >= fade) return;
  ctx.fillStyle = `rgba(0,0,0,${1 - localSeconds / fade})`;
  ctx.fillRect(0, 0, width, height);
}

function renderFrame(ctx, film, timeMs) {
  const { WIDTH, HEIGHT, POSSESSIONS } = film;
  const possession =
    POSSESSIONS.find((p) => timeMs >= p.startMs && timeMs < p.endMs) ??
    POSSESSIONS[POSSESSIONS.length - 1];

  const localSeconds = (timeMs - possession.startMs) / 1000;
  const T = makeTransform(WIDTH, HEIGHT);

  drawCourt(ctx, T, WIDTH, HEIGHT);

  // Our player is always on the white team; draw white last so that their
  // jersey number is never buried under a defender.
  const entries = Object.entries(possession.tracks).sort(
    (a, b) => Number(a[0].startsWith("w")) - Number(b[0].startsWith("w")),
  );
  const players = [];
  for (const [id, track] of entries) {
    const pos = sample(track, localSeconds);
    players.push(pos);
    drawPlayer(ctx, T, id, pos);
  }
  drawBall(ctx, T, offsetBall(sample(possession.ball, localSeconds), players));

  drawOverlay(ctx, WIDTH, HEIGHT, possession, localSeconds);
  drawCut(ctx, WIDTH, HEIGHT, localSeconds);
}

globalThis.NEXTREP_DRAW = { renderFrame };

export { renderFrame };
