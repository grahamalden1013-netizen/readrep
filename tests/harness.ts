/** Tiny assertion harness — the project has no test framework installed. */

let passed = 0;
let failed = 0;
const failures: string[] = [];

export function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  const run = async () => {
    try {
      await fn();
      passed += 1;
      console.log(`  ok   ${name}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${message}`);
      console.log(`  FAIL ${name}\n       ${message}`);
    }
  };
  return run();
}

export function group(name: string) {
  console.log(`\n${name}`);
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function equal<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function deepEqual(actual: unknown, expected: unknown, message: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message} — expected ${b}, got ${a}`);
}

export function includes(haystack: string, needle: string, message: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`${message} — "${needle}" not found`);
  }
}

export function excludes(haystack: string, needle: string, message: string) {
  if (haystack.includes(needle)) {
    throw new Error(`${message} — "${needle}" should not be present`);
  }
}

export function report(): never {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exit(failed > 0 ? 1 : 0);
}
