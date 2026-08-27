import type { Category, CategorySlug } from "@/types/ngn";

export const CATEGORIES: Record<CategorySlug, Category> = {
  congress: { slug: "congress", label: "Congress" },
  elections: { slug: "elections", label: "Elections" },
  courts: { slug: "courts", label: "Courts" },
  economy: { slug: "economy", label: "Economy" },
  immigration: { slug: "immigration", label: "Immigration" },
  climate: { slug: "climate", label: "Climate" },
  health: { slug: "health", label: "Health" },
  education: { slug: "education", label: "Education" },
  technology: { slug: "technology", label: "Technology" },
  "foreign-policy": { slug: "foreign-policy", label: "Foreign Policy" },
  justice: { slug: "justice", label: "Justice" },
  explainer: { slug: "explainer", label: "Explainer" },
};

export function categoryLabel(slug: CategorySlug) {
  return CATEGORIES[slug]?.label ?? "News";
}
