export interface NavItem {
  href: string;
  label: string;
  description: string;
}

export const PRIMARY_NAV: NavItem[] = [
  {
    href: "/today",
    label: "Today",
    description: "The five stories that matter this morning",
  },
  {
    href: "/politics",
    label: "Politics",
    description: "Everything NGN has published, by topic",
  },
  {
    href: "/issues",
    label: "Issues",
    description: "Background guides to the big debates",
  },
  {
    href: "/weekly",
    label: "Weekly",
    description: "One longer editor's article each week",
  },
  {
    href: "/discuss",
    label: "Discuss",
    description: "Student conversation, moderated",
  },
];
