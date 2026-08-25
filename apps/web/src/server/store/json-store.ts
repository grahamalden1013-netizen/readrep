import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * A small file-backed document store: the Phase 0 persistence adapter.
 *
 * Chosen so that ReadRep runs, persists a player's answers, and passes its
 * tests with no database and no cloud credentials. It satisfies the same
 * repository ports that a managed PostgreSQL adapter will satisfy in Phase 1,
 * so nothing above the port changes when it is replaced.
 *
 * What it is not: concurrent, transactional, or indexed. It serializes writes
 * behind an in-process lock and rewrites a whole collection per write, which is
 * fine for a pilot fixture and would not be fine for real traffic. That
 * limitation is recorded in docs/KNOWN_LIMITATIONS.md rather than papered over.
 */

type Document = { id: string };

export class JsonCollection<T extends Document> {
  readonly #file: string;
  #cache: Map<string, T> | null = null;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string, name: string) {
    this.#file = join(dataDir, `${name}.json`);
  }

  /** Serializes access so two requests cannot interleave a read-modify-write. */
  #withLock<R>(operation: () => Promise<R>): Promise<R> {
    const result = this.#queue.then(operation, operation);
    this.#queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async #load(): Promise<Map<string, T>> {
    if (this.#cache) return this.#cache;
    try {
      const raw = await readFile(this.#file, "utf8");
      const rows = JSON.parse(raw) as T[];
      this.#cache = new Map(rows.map((row) => [row.id, row]));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      this.#cache = new Map();
    }
    return this.#cache;
  }

  async #flush(): Promise<void> {
    const rows = [...(this.#cache?.values() ?? [])];
    await mkdir(dirname(this.#file), { recursive: true });
    // Write to a temporary file and rename, so a crash mid-write cannot leave a
    // truncated collection behind.
    const temporary = `${this.#file}.tmp`;
    await writeFile(temporary, JSON.stringify(rows, null, 2), "utf8");
    await rename(temporary, this.#file);
  }

  async findById(id: string): Promise<T | null> {
    return this.#withLock(async () => (await this.#load()).get(id) ?? null);
  }

  async all(): Promise<T[]> {
    return this.#withLock(async () => [...(await this.#load()).values()]);
  }

  async filter(predicate: (row: T) => boolean): Promise<T[]> {
    return this.#withLock(async () =>
      [...(await this.#load()).values()].filter(predicate),
    );
  }

  async find(predicate: (row: T) => boolean): Promise<T | null> {
    return this.#withLock(
      async () => [...(await this.#load()).values()].find(predicate) ?? null,
    );
  }

  async put(row: T): Promise<T> {
    return this.#withLock(async () => {
      const rows = await this.#load();
      rows.set(row.id, row);
      await this.#flush();
      return row;
    });
  }

  async putMany(newRows: readonly T[]): Promise<T[]> {
    return this.#withLock(async () => {
      const rows = await this.#load();
      for (const row of newRows) rows.set(row.id, row);
      await this.#flush();
      return [...newRows];
    });
  }

  async delete(id: string): Promise<void> {
    return this.#withLock(async () => {
      const rows = await this.#load();
      rows.delete(id);
      await this.#flush();
    });
  }

  /** Empties the collection. Used by the seed script and by tests. */
  async clear(): Promise<void> {
    return this.#withLock(async () => {
      this.#cache = new Map();
      await this.#flush();
    });
  }

  /** Drops the in-memory cache so the next read comes from disk. */
  invalidate(): void {
    this.#cache = null;
  }
}
