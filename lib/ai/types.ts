import type {
  ArticleSection,
  KeyTerm,
  Perspective,
  Source,
} from "@/types/ngn";

/** Everything the newsroom expects a generated draft to contain. */
export interface GeneratedDraft {
  headline: string;
  subheadline: string;
  summary: string;
  inTwentySeconds: string;
  quickWhatHappened: string;
  quickWhyItMatters: string;
  quickWhatNext: string;
  body: ArticleSection[];
  democraticView: Perspective;
  republicanView: Perspective;
  otherViews: Perspective[];
  knownFacts: string[];
  uncertainties: string[];
  keyTerms: KeyTerm[];
  sources: Source[];
  /** Model-reported confidence notes for the human editor, never for readers. */
  editorNotes: string[];
}

export interface DraftRequest {
  headline: string;
  topic: string;
  sourceUrls: string[];
  sourceText: string;
  notes: string;
}

/** The four "I don't get it" modes. */
export type ExplainMode =
  | "sixty-seconds"
  | "background"
  | "from-scratch"
  | "define-terms";

export interface ExplainResponse {
  mode: ExplainMode;
  title: string;
  paragraphs: string[];
  terms?: KeyTerm[];
}

export interface AskResponse {
  answer: string;
  /** Which parts of the article the answer was drawn from. */
  citations: string[];
  /** Set when the question cannot be answered from approved material. */
  outOfScope: boolean;
}

export interface AiProvider {
  readonly name: "claude" | "mock";
  generateDraft(request: DraftRequest): Promise<GeneratedDraft>;
  explain(articleSlug: string, mode: ExplainMode): Promise<ExplainResponse>;
  ask(articleSlug: string, question: string): Promise<AskResponse>;
}
