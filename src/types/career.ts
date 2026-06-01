export type HrQaItem = {
  question: string;
  answerScript: string;
  proTip?: string;
};

export type HrGuidancePlan = {
  headline?: string;
  roleFocus?: string;
  bridgeNote?: string;
  hrCommunicationTips: string[];
  recruiterApproachScripts: string[];
  commonHrQuestions: HrQaItem[];
  realWorldScenarios: string[];
};

export type RoadmapPlan = {
  headline?: string;
  primaryFocus?: string;
  bridgeNote?: string;
  technicalSkills: string[];
  communicationPlan: string[];
  hrPreparation: string[];
  jobApplicationStrategy: string[];
  resumeApproach: string[];
};

export type HrGuidancePlanLegacy = {
  hrCommunicationTips: string[];
  recruiterApproachScripts: string[];
  commonHrQuestions: string[];
  realWorldScenarios: string[];
};
