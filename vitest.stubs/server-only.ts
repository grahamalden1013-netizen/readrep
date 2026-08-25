/**
 * Test stub for the `server-only` marker package.
 *
 * The real package throws unless resolved under the `react-server` condition,
 * which Vitest does not set. Stubbing it lets server modules be unit-tested
 * directly; it does not weaken the guarantee, because the real package is still
 * what Next resolves at build time and a client import still fails the build.
 */
export {};
