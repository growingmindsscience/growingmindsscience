import { type Placement } from "@/lib/titration";

export type AgeBand = "24-30m" | "30-36m" | "36-42m" | "48-60m" | "42-48m";
export type Strength =
  | "correlational-strong"
  | "rct"
  | "rct-replicated"
  | "theory-derived";
export type Consensus = "high" | "moderate" | "emerging";

export interface Game {
  id: string;
  title: string;
  levels: (Placement | "CPX")[];
  age_bands: AgeBand[];
  goal: string;
  materials: string[];
  duration_min: number;
  frequency_rx: string;
  script: string[];
  level_up: string;
  level_down: string;
  bilingual_note: string;
  evidence: { tag_ids: string[]; strength: Strength; consensus: Consensus };
  printable_id: string | null;
}

export interface GamesCatalog {
  artifact: "games.catalog";
  version: string;
  games: Game[];
}

export interface AssessmentCopy {
  artifact: "assessment.copy";
  version: string;
  states: Record<string, { lines: string[] }>;
}

export interface PromptsDeck {
  artifact: "prompts.deck";
  version: string;
  bands: Record<AgeBand, string[]>;
}

export interface Citation {
  tag_id: string;
  anchor: string;
  claim_scope: string;
  verified: boolean;
  full_cite: string | null;
  notes?: string;
}

export interface CitationsTable {
  artifact: "citations";
  version: string;
  citations: Citation[];
}
