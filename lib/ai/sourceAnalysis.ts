import type { SourceType } from "@/types/ngn";

/**
 * Source labelling for the evidence composer.
 *
 * This never asserts a source is true. It classifies what KIND of source a URL
 * is, so a student can see at a glance whether they are citing primary data or
 * a commentary page — and so the judge can weigh "supported" against "cited
 * something".
 */

type Rule = {
  test: RegExp;
  sourceType: SourceType;
  publisher: string;
};

const RULES: Rule[] = [
  { test: /(^|\.)census\.gov$/i, sourceType: "Official data", publisher: "U.S. Census Bureau" },
  { test: /(^|\.)bls\.gov$/i, sourceType: "Official data", publisher: "Bureau of Labor Statistics" },
  { test: /(^|\.)cbo\.gov$/i, sourceType: "Government document", publisher: "Congressional Budget Office" },
  { test: /(^|\.)gao\.gov$/i, sourceType: "Government document", publisher: "Government Accountability Office" },
  { test: /(^|\.)congress\.gov$/i, sourceType: "Government document", publisher: "U.S. Congress" },
  { test: /(^|\.)supremecourt\.gov$/i, sourceType: "Legal opinion", publisher: "Supreme Court of the United States" },
  { test: /(^|\.)federalregister\.gov$/i, sourceType: "Government document", publisher: "Federal Register" },
  { test: /(^|\.)brookings\.edu$/i, sourceType: "Research organization", publisher: "Brookings Institution" },
  { test: /(^|\.)aei\.org$/i, sourceType: "Research organization", publisher: "American Enterprise Institute" },
  { test: /(^|\.)pewresearch\.org$/i, sourceType: "Research organization", publisher: "Pew Research Center" },
  { test: /(^|\.)cato\.org$/i, sourceType: "Research organization", publisher: "Cato Institute" },
  { test: /(^|\.)urban\.org$/i, sourceType: "Research organization", publisher: "Urban Institute" },
  { test: /(^|\.)reuters\.com$/i, sourceType: "News reporting", publisher: "Reuters" },
  { test: /(^|\.)apnews\.com$/i, sourceType: "News reporting", publisher: "Associated Press" },
  { test: /(^|\.)nber\.org$/i, sourceType: "Academic study", publisher: "National Bureau of Economic Research" },
  { test: /\.gov$/i, sourceType: "Government document", publisher: "Government source" },
  { test: /\.edu$/i, sourceType: "Academic study", publisher: "Academic source" },
];

export type SourceAssessment = {
  publisher: string;
  sourceType: SourceType;
  /** Shown next to the evidence chip. Never a truth claim. */
  note: string;
  valid: boolean;
};

export function assessSource(rawUrl: string): SourceAssessment {
  let host: string;
  try {
    host = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).hostname
      .replace(/^www\./, "");
  } catch {
    return {
      publisher: "Unrecognised link",
      sourceType: "News reporting",
      note: "This does not look like a valid URL. Evidence with a broken link will not count as support.",
      valid: false,
    };
  }

  const rule = RULES.find((r) => r.test.test(host));

  if (!rule) {
    return {
      publisher: host,
      sourceType: "News reporting",
      note: "NGN does not recognise this publisher. A link is not proof — your argument still has to explain why this source supports your claim.",
      valid: true,
    };
  }

  const notes: Record<SourceType, string> = {
    "Government document": "A primary government document. Strong support when you quote the relevant passage.",
    "Official data": "Official statistics. Strong support — cite the specific figure, not the whole dataset.",
    "Research organization": "A research organisation. Useful, but note that many have a known point of view; say what the finding is, not just who published it.",
    "News reporting": "News reporting. Best used for what happened; weaker for contested interpretation.",
    "Legal opinion": "A legal opinion. Quote the holding, not the headline.",
    "Academic study": "An academic study. Strong support — name the finding and its limits.",
  };

  return {
    publisher: rule.publisher,
    sourceType: rule.sourceType,
    note: notes[rule.sourceType],
    valid: true,
  };
}
