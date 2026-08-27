import type { Article } from "@/types/ngn";

export const whoRegulatesAi: Article = {
  id: "art-ai-rules",
  slug: "who-gets-to-regulate-ai",
  headline: "The Real AI Fight in Washington Is About Who Gets to Write the Rules",
  subheadline:
    "Before anyone agrees on what artificial intelligence rules should say, there is an unresolved question underneath: which government does the regulating.",
  summary:
    "AI policy is being made simultaneously by states, federal agencies using existing authority, and Congress. Whether federal law overrides state law — preemption — is the pivotal unsettled question.",
  inTwentySeconds:
    "There is no single national AI law. States are passing their own rules, federal agencies are applying laws written decades ago, and Congress keeps introducing bills that mostly do not pass. The biggest fight is not liberal-versus-conservative — it is whether a federal standard should replace state laws, which determines whether companies face one rulebook or fifty.",
  category: "technology",
  issueSlugs: ["technology"],
  quickWhatHappened:
    "In the absence of a comprehensive federal statute, state legislatures and federal agencies have both moved to regulate AI systems, creating overlapping and sometimes conflicting requirements.",
  quickWhyItMatters:
    "The rules being set now govern systems used in hiring, lending, medical tools, schools and content platforms — including tools already used on students.",
  quickWhatNext:
    "Watch for preemption language in any federal proposal. That single provision determines whether a federal law becomes a floor that states can build on or a ceiling that replaces state law.",
  body: [
    {
      heading: "Three rulemakers, one technology",
      paragraphs: [
        "AI policy in the United States is not being made in one place. It is being made in three at once, and they do not coordinate.",
        "State legislatures have passed laws on specific applications — automated decisions in hiring, disclosure requirements for synthetic media in elections, restrictions on certain uses of facial recognition. States move faster than Congress because they face fewer procedural obstacles.",
        "Federal agencies are applying existing authority. Regulators have generally taken the position that laws prohibiting discrimination, deceptive business practices and unsafe medical devices already apply when the tool involved is an AI system.",
        "Congress has held extensive hearings and introduced many bills. Comprehensive legislation has not been enacted.",
      ],
    },
    {
      heading: "Preemption is the whole ballgame",
      paragraphs: [
        "When federal and state law conflict, the Constitution's Supremacy Clause means federal law generally wins. But Congress decides how much room to leave: it can set a floor that states may exceed, or it can preempt state law entirely.",
        "That choice, more than any specific safety requirement, determines the shape of AI regulation. A federal law with broad preemption means one national standard. A federal floor means companies must comply with the strictest state rule in practice.",
        "This is why the coalitions in AI policy do not map neatly onto party lines. Members of both parties have argued for a single national standard, and members of both parties have argued for preserving state authority.",
      ],
    },
    {
      heading: "What people actually disagree about",
      paragraphs: [
        "Underneath the procedural question are several substantive ones, and it helps to keep them separate.",
      ],
      bullets: [
        "Risk framing: whether rules should target specific high-stakes uses — hiring, lending, medical devices, criminal justice — or the underlying models themselves.",
        "Transparency: what developers must disclose about training data, capabilities and known failure modes.",
        "Liability: who is responsible when an AI system causes harm — the developer, the company deploying it, or the user.",
        "Copyright: whether training a model on copyrighted work requires permission, which is being litigated rather than legislated.",
        "Competition: whether compliance requirements would entrench the largest companies by making the rules too expensive for smaller ones.",
      ],
    },
    {
      heading: "Why this matters in a classroom",
      paragraphs: [
        "AI policy can feel abstract until it reaches the places students already encounter it: plagiarism-detection tools, admissions screening, tutoring systems and content moderation on the platforms teenagers use.",
        "Most of those uses are governed today by school district contracts and existing student privacy law rather than by any AI-specific statute. Where AI rules do exist, they typically require disclosure and a human review process rather than banning the tool.",
        "That distinction — disclosure and human review rather than prohibition — is the dominant regulatory approach in the United States so far.",
      ],
    },
  ],
  democraticView: {
    label: "Many Democratic lawmakers",
    summary:
      "A common position among Democratic officials emphasizes civil rights protections, algorithmic discrimination and worker impact.",
    points: [
      "Frequently support requirements that automated systems used in hiring, housing and lending be audited for discriminatory outcomes.",
      "Often favor preserving state authority, arguing federal preemption would freeze protections at a low level.",
      "Generally support transparency requirements and disclosure of AI-generated political content.",
    ],
  },
  republicanView: {
    label: "Many Republican lawmakers",
    summary:
      "A common position among Republican officials emphasizes avoiding rules that would slow domestic development, alongside concerns about the political neutrality of AI systems.",
    points: [
      "Frequently warn that heavy regulation would push development overseas and entrench the largest incumbent firms.",
      "Many favor a single federal standard preempting state laws, arguing a patchwork is unworkable.",
      "Some emphasize concerns that AI systems reflect political bias in their outputs and support transparency requirements for that reason.",
    ],
  },
  otherViews: [
    {
      label: "AI safety researchers",
      summary:
        "A research community focused on catastrophic and systemic risk argues the current debate underweights the most severe scenarios.",
      points: [
        "Argue for evaluation requirements before deployment of the most capable systems.",
        "Disagree internally about how imminent severe risks are and how much regulation is warranted now.",
      ],
    },
    {
      label: "Civil liberties and labor organizations",
      summary:
        "These groups focus on present-day deployment rather than future capability.",
      points: [
        "Emphasize surveillance, workplace monitoring and automated decision-making already in use.",
        "Argue that enforcement of existing law matters more than new statutes if agencies lack technical capacity.",
      ],
    },
    {
      label: "Smaller developers and open-source advocates",
      summary:
        "This group often opposes both the largest companies and the strictest proposals.",
      points: [
        "Warn that licensing or audit requirements scaled to large firms would be prohibitive for small teams.",
        "Argue that open model weights improve external scrutiny; critics counter that they also remove safeguards.",
      ],
    },
  ],
  knownFacts: [
    "There is no comprehensive federal statute governing artificial intelligence in the United States.",
    "Multiple states have enacted AI-specific laws covering particular applications.",
    "Federal agencies have stated that existing civil rights, consumer protection and product safety laws apply to AI systems.",
    "The Supremacy Clause of the Constitution establishes that valid federal law overrides conflicting state law.",
    "Questions about copyright and model training are currently being decided in litigation.",
  ],
  uncertainties: [
    "Whether Congress will pass a comprehensive AI statute, and whether it would preempt state law, is unresolved.",
    "Courts have not settled whether training on copyrighted material is permissible without a license.",
    "Estimates of AI's labor market effects vary enormously and depend on assumptions researchers disagree about.",
  ],
  keyTerms: [
    {
      term: "Preemption",
      definition:
        "When federal law overrides state law. Congress chooses whether a federal standard is a floor states can exceed or a ceiling that replaces state rules.",
    },
    {
      term: "Algorithmic discrimination",
      definition:
        "When an automated system produces systematically worse outcomes for a protected group, whether or not that was intended.",
    },
    {
      term: "Model weights",
      definition:
        "The numerical parameters that define a trained AI system. Whether to release them publicly is a central policy debate.",
    },
    {
      term: "Rulemaking",
      definition:
        "The process by which a federal agency writes binding regulations under authority Congress already granted it.",
    },
  ],
  sources: [
    {
      id: "src-nist",
      publisher: "National Institute of Standards and Technology",
      title: "AI Risk Management Framework",
      date: "Reference document",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
    {
      id: "src-ftc",
      publisher: "Federal Trade Commission",
      title: "Business guidance on AI claims and consumer protection",
      date: "Updated periodically",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
    {
      id: "src-state-ai",
      publisher: "State legislature",
      title: "Enacted state AI statutes",
      date: "By session",
      url: "#",
      kind: "primary",
      isPlaceholder: true,
    },
  ],
  authorId: "ngn-desk",
  type: "news",
  status: "published",
  publishedAt: "2026-08-26T10:30:00.000Z",
  updatedAt: "2026-08-26T10:30:00.000Z",
  readTime: 6,
  cover: { pattern: "orbit", hue: 255 },
  featured: false,
  significance: 82,
  isDemo: true,
};
