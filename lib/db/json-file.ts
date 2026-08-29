import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Tiny JSON-file persistence for local development only. It backs fixture mode
 * so that an authored rep survives a dev-server reload; it is never used when
 * Supabase is configured, and `getBackend()` refuses to select it in production.
 */

/** Resolved per call so the location can be overridden at runtime. */
export function dataDir(): string {
  return process.env.NEXTREP_DATA_DIR ?? path.join(process.cwd(), ".nextrep-data");
}

/**
 * The bundler traces filesystem access to decide what to ship. This store is
 * development-only and its directory is not known statically, so tracing it
 * would pull the entire project — including `public/` — into the server bundle.
 */
function resolve(fileName: string): string {
  return path.join(/* turbopackIgnore: true */ dataDir(), fileName);
}

/** Serialises writes per file so concurrent requests cannot interleave. */
const queues = new Map<string, Promise<unknown>>();

async function withLock<T>(file: string, run: () => Promise<T>): Promise<T> {
  const previous = queues.get(file) ?? Promise.resolve();
  const next = previous.then(run, run);
  queues.set(
    file,
    next.catch(() => undefined),
  );
  return next;
}

export async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(resolve(fileName), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile(fileName: string, value: unknown): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
  const target = resolve(fileName);
  // Write-then-rename so a crash mid-write cannot leave a truncated file.
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), "utf8");
  await rename(temporary, target);
}

/** Read, transform and write a file as one serialized operation. */
export async function updateJsonFile<T, R>(
  fileName: string,
  fallback: T,
  mutate: (current: T) => { next: T; result: R },
): Promise<R> {
  return withLock(fileName, async () => {
    const current = await readJsonFile<T>(fileName, fallback);
    const { next, result } = mutate(current);
    await writeJsonFile(fileName, next);
    return result;
  });
}
