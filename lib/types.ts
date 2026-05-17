export type SourceConfig = {
  name: string;
  url: string;
  type: "html" | "calendar" | "manual";
  enabled: boolean;
  programHint?: string;
  fallbackUrls?: string[];
};

export type ExtractedLink = {
  title: string;
  url: string;
  sourceName: string;
  programHint?: string | null;
  status?: string | null;
  documentType?: string | null;
};

export type FundingProfile = {
  id: string;
  name: string;
  description: string | null;
  profile_prompt: string;
};

export type AiAnalysis = {
  summary: string;
  program: string | null;
  status: string | null;
  applicant_eligibility: string[];
  eligible_activities: string[];
  budget_text: string | null;
  cofinancing_text: string | null;
  region_text: string | null;
  deadline_text: string | null;
  deadline_at: string | null;
  relevance_score: number;
  recommendation: string;
  risks: string[];
  manual_checks: string[];
  keywords: string[];
};
