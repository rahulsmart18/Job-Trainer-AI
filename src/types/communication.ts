export type CommunicationAnalysis = {
  score: number;
  grammarMistakes: string[];
  correctedSentences: string[];
  suggestions: string[];
};

export type AnalyzeApiResponse = {
  extractedText: string;
  analysis: CommunicationAnalysis;
};
