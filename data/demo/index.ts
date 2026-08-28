/**
 * Demo content barrel.
 *
 * `isDemoContent()` is the single switch the UI reads to decide whether to
 * label seeded participation figures. When a real backend is connected this
 * returns false and the `DemoBadge` components disappear.
 */

export * from "./sources";
export * from "./debates";
export * from "./articles";
export * from "./issues";
export * from "./parties";
export * from "./discussions";
export * from "./community";
export * from "./classroom";

export function isDemoContent(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export const DEMO_NOTICE =
  "Seeded demo data — participation figures are illustrative.";
