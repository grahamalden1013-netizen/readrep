import type { Author } from "@/types/ngn";

/**
 * Demo newsroom. These are fictional staff profiles for the NGN demo build,
 * not real journalists.
 */
export const AUTHORS: Author[] = [
  {
    id: "nora-halloway",
    name: "Nora Halloway",
    role: "Editor-in-Chief",
    bio: "Writes The NGN Weekly. Spent a decade covering state legislatures before deciding that the hardest part of political news is the part everyone assumes you already know.",
    initials: "NH",
    hue: 40,
  },
  {
    id: "dev-anand",
    name: "Dev Anand",
    role: "Politics Editor",
    bio: "Covers Congress and the federal agencies. Believes most political fights make sense once you know which rulebook everyone is arguing about.",
    initials: "DA",
    hue: 210,
  },
  {
    id: "sam-reyes",
    name: "Sam Reyes",
    role: "Economy Desk",
    bio: "Translates budgets, prices and labor data into plain language. Formerly taught high-school economics.",
    initials: "SR",
    hue: 95,
  },
  {
    id: "iris-chen",
    name: "Iris Chen",
    role: "Courts & Law",
    bio: "Reads the opinions so you do not have to, then explains what the Court actually decided versus what people say it decided.",
    initials: "IC",
    hue: 285,
  },
  {
    id: "ngn-desk",
    name: "The NGN Desk",
    role: "Staff",
    bio: "Reported and edited by the NGN newsroom.",
    initials: "NG",
    hue: 175,
  },
];

const BY_ID = new Map(AUTHORS.map((author) => [author.id, author]));

export function getAuthor(id: string): Author {
  return BY_ID.get(id) ?? AUTHORS[AUTHORS.length - 1];
}
