export type CommunicationCorrection = {
  /** The exact phrase the user said. */
  original: string;
  /** The professional, corrected version. */
  improved: string;
  /** Short reason this was a mistake. */
  issue?: string;
};

export type CommunicationAnalysis = {
  score: number;
  detectedAnswerType?: string;
  grammarMistakes: string[];
  correctedSentences: string[];
  /** Paired before/after fixes for the side-by-side comparison. */
  corrections?: CommunicationCorrection[];
  improvedIntro?: string;
  suggestions: string[];
  fluency: number;
  clarity: number;
  confidence: number;
  grammarScore?: number;
  professionalismScore?: number;
  fillerWords: string[];
  nextBestAction: string;
};

export type AnalyzeApiResponse = {
  extractedText: string;
  analysis: CommunicationAnalysis;
  source: string;
  previousScore?: number | null;
};

export type MockInterviewTurn = {
  question: string;
  feedback?: string;
  score?: number;
  improvementTip?: string;
  done?: boolean;
  summary?: string;
};

export type FeatureUsage = {
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
};

export type UsageSnapshot = {
  communication: FeatureUsage;
  mockInterview: FeatureUsage;
  unlockedFeatures: string[];
  hasAnyPaid: boolean;
};

export type CareerInsights = {
  readinessScore: number;
  startingReadiness: number;
  weeklyDelta: number;
  biggestGap: string;
  strengths: string[];
  todaysMission: string;
  nextCheckpoint: string;
  latestCommunicationScore: number | null;
  scoreTrend: number | null;
  confidenceImprovement: number | null;
  streakDays: number;
  mockInterviewCount: number;
  paid: boolean;
  unlockedFeatures?: string[];
  usage?: UsageSnapshot;
};
