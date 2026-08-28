import type { Source } from "@/types/ngn";

/**
 * DEMO CONTENT — see `data/demo/README.md`.
 *
 * A shared catalogue of primary and reputable sources, ordered by the evidence
 * hierarchy NGN teaches: government documents and official data first, then
 * research organisations, then reporting.
 *
 * Links point at stable section pages rather than deep-linked documents, so
 * they do not rot. Before any of this ships as real editorial content an editor
 * must replace each entry with the exact document cited.
 */

function source(
  id: string,
  publisher: string,
  title: string,
  date: string,
  sourceType: Source["sourceType"],
  url: string,
): Source {
  return { id, publisher, title, date, sourceType, url };
}

export const SOURCES = {
  // --- Elections and government ------------------------------------------
  archivesElectoralCollege: source(
    "archives-ec",
    "U.S. National Archives",
    "About the Electoral College",
    "Updated continuously",
    "Government document",
    "https://www.archives.gov/electoral-college/about",
  ),
  archivesAmendments: source(
    "archives-amendments",
    "U.S. National Archives",
    "The Constitution: Amendments 11–27",
    "Updated continuously",
    "Government document",
    "https://www.archives.gov/founding-docs/amendments-11-27",
  ),
  congressLegislation: source(
    "congress-legislation",
    "U.S. Congress",
    "Legislation search — bills and resolutions",
    "Updated continuously",
    "Government document",
    "https://www.congress.gov/search",
  ),
  fecData: source(
    "fec-data",
    "Federal Election Commission",
    "Election results and voting statistics",
    "Updated after each federal election",
    "Official data",
    "https://www.fec.gov/introduction-campaign-finance/election-results-and-voting-information/",
  ),
  censusVoting: source(
    "census-voting",
    "U.S. Census Bureau",
    "Voting and Registration tables",
    "Published after each federal election",
    "Official data",
    "https://www.census.gov/topics/public-sector/voting.html",
  ),
  supremeCourtOpinions: source(
    "scotus-opinions",
    "Supreme Court of the United States",
    "Opinions of the Court",
    "Updated each term",
    "Legal opinion",
    "https://www.supremecourt.gov/opinions/opinions.aspx",
  ),

  // --- Economy ------------------------------------------------------------
  dolMinimumWage: source(
    "dol-minimum-wage",
    "U.S. Department of Labor",
    "Minimum Wage — Wage and Hour Division",
    "Updated continuously",
    "Government document",
    "https://www.dol.gov/agencies/whd/minimum-wage",
  ),
  blsData: source(
    "bls-data",
    "Bureau of Labor Statistics",
    "Employment, wages and earnings data",
    "Updated monthly",
    "Official data",
    "https://www.bls.gov/data/",
  ),
  cboReports: source(
    "cbo-reports",
    "Congressional Budget Office",
    "Budget and economic analysis reports",
    "Published throughout the year",
    "Government document",
    "https://www.cbo.gov/publications",
  ),
  nberPapers: source(
    "nber-papers",
    "National Bureau of Economic Research",
    "Working paper series",
    "Published continuously",
    "Academic study",
    "https://www.nber.org/papers",
  ),

  // --- Technology ---------------------------------------------------------
  section230Text: source(
    "section-230",
    "U.S. Congress",
    "47 U.S.C. § 230 — Protection for private blocking and screening",
    "Enacted 1996",
    "Government document",
    "https://www.congress.gov/browse/united-states-code",
  ),
  nistAIFramework: source(
    "nist-ai-rmf",
    "National Institute of Standards and Technology",
    "AI Risk Management Framework",
    "Updated continuously",
    "Government document",
    "https://www.nist.gov/itl/ai-risk-management-framework",
  ),
  ftcConsumerProtection: source(
    "ftc-tech",
    "Federal Trade Commission",
    "Technology and consumer protection enforcement",
    "Updated continuously",
    "Government document",
    "https://www.ftc.gov/business-guidance/privacy-security",
  ),

  // --- Defense and foreign policy ----------------------------------------
  defenseBudget: source(
    "dod-budget",
    "U.S. Department of Defense",
    "Defense budget materials",
    "Published annually",
    "Government document",
    "https://comptroller.defense.gov/Budget-Materials/",
  ),
  gaoReports: source(
    "gao-reports",
    "Government Accountability Office",
    "Reports and testimonies",
    "Published continuously",
    "Government document",
    "https://www.gao.gov/reports-testimonies",
  ),
  stateDept: source(
    "state-dept",
    "U.S. Department of State",
    "Bureau of Political-Military Affairs",
    "Updated continuously",
    "Government document",
    "https://www.state.gov/bureaus-offices/under-secretary-for-arms-control-and-international-security-affairs/bureau-of-political-military-affairs/",
  ),

  // --- Education ----------------------------------------------------------
  nces: source(
    "nces",
    "National Center for Education Statistics",
    "Digest of Education Statistics",
    "Published annually",
    "Official data",
    "https://nces.ed.gov/programs/digest/",
  ),
  edGov: source(
    "ed-gov",
    "U.S. Department of Education",
    "Policy, data and research",
    "Updated continuously",
    "Government document",
    "https://www.ed.gov/",
  ),

  // --- Environment --------------------------------------------------------
  epaEmissions: source(
    "epa-ghg",
    "Environmental Protection Agency",
    "Greenhouse Gas Emissions data",
    "Published annually",
    "Official data",
    "https://www.epa.gov/ghgemissions",
  ),
  eiaEnergy: source(
    "eia-energy",
    "U.S. Energy Information Administration",
    "Energy data and analysis",
    "Updated monthly",
    "Official data",
    "https://www.eia.gov/",
  ),

  // --- Research organisations (a deliberate spread of viewpoints) ---------
  pewResearch: source(
    "pew",
    "Pew Research Center",
    "Politics and policy survey research",
    "Published continuously",
    "Research organization",
    "https://www.pewresearch.org/politics/",
  ),
  brookings: source(
    "brookings",
    "Brookings Institution",
    "Governance and economic studies",
    "Published continuously",
    "Research organization",
    "https://www.brookings.edu/topic/u-s-government-politics/",
  ),
  cato: source(
    "cato",
    "Cato Institute",
    "Policy analysis",
    "Published continuously",
    "Research organization",
    "https://www.cato.org/research",
  ),
  aei: source(
    "aei",
    "American Enterprise Institute",
    "Policy research",
    "Published continuously",
    "Research organization",
    "https://www.aei.org/research-products/",
  ),
  urban: source(
    "urban",
    "Urban Institute",
    "Evidence-based policy research",
    "Published continuously",
    "Research organization",
    "https://www.urban.org/research",
  ),

  // --- Reporting ----------------------------------------------------------
  reuters: source(
    "reuters",
    "Reuters",
    "U.S. politics coverage",
    "Updated continuously",
    "News reporting",
    "https://www.reuters.com/world/us/",
  ),
  ap: source(
    "ap",
    "Associated Press",
    "U.S. government and politics",
    "Updated continuously",
    "News reporting",
    "https://apnews.com/hub/politics",
  ),
} satisfies Record<string, Source>;

export const ALL_SOURCES: Source[] = Object.values(SOURCES);
