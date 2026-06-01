export type JobTrack = "it" | "non_it";

export type OnboardingDetails = {
  jobTrack: JobTrack | "";
  studentStatus: string;
  biggestBlocker: string;
  weeklyHours: string;
  interviewExperience: string;
  preferredCompanyType: string;
  jobSearchChannel: string;
  interviewLanguage: string;
};

export type OnboardingFormData = OnboardingDetails & {
  fullName: string;
  city: string;
  workExperience: string;
  qualification: string;
  qualificationOther: string;
  branch: string;
  branchOther: string;
  graduationYear: string;
  careerPreference: string;
  interestedRole: string;
  interestedRoleOther: string;
  targetDomain: string;
  targetDomainOther: string;
  codingLevel: number;
  englishLevel: number;
  hasProjects: string;
  jobSearchStatus: string;
  joiningTimeline: string;
};

/** Stored in form when user picks a custom value not in the preset list. */
export const OTHER_VALUE = "__other__";

export const QUALIFICATIONS = [
  "12th / Intermediate",
  "Diploma",
  "B.Tech / B.E.",
  "BCA",
  "MCA",
  "B.Sc",
  "M.Sc",
  "M.Tech",
  "MBA",
  "B.Com",
  "BBA",
  "B.A.",
  "PhD / Doctorate",
  OTHER_VALUE,
] as const;

export const BRANCHES = [
  "Computer Science (CSE)",
  "Information Technology (IT)",
  "Electronics (ECE)",
  "Electrical (EEE)",
  "Mechanical",
  "Civil",
  "AI & Machine Learning",
  "Data Science",
  "Cybersecurity",
  "Commerce / Accounting",
  "Finance",
  "Biotechnology",
  "UI/UX / Design",
  "Marketing / Business",
  OTHER_VALUE,
] as const;

export const GRADUATION_YEARS = [
  { id: "2027", label: "2027 (2+ years left)" },
  { id: "2026", label: "2026 (final year or just passed out)" },
  { id: "2025", label: "2025" },
  { id: "2024", label: "2024" },
  { id: "2023 or earlier", label: "2023 or earlier" },
] as const;

export const STUDENT_STATUS_OPTIONS = [
  {
    id: "final_year",
    label: "Final-year student",
    description: "Still in college — preparing for placements or off-campus",
  },
  {
    id: "just_graduated",
    label: "Recently graduated",
    description: "Finished within the last 12 months — looking for first job",
  },
  {
    id: "graduated_earlier",
    label: "Graduated earlier",
    description: "Degree done a while ago — still seeking the right role",
  },
  {
    id: "career_break",
    label: "Gap after college",
    description: "Break for exams, health, or family — ready to restart prep",
  },
] as const;

export const CAREER_GOALS = [
  {
    id: "first_it_job",
    label: "Land my first IT job",
    description: "I need a clear path from college to my first offer",
  },
  {
    id: "switch_job",
    label: "Switch to a better job",
    description: "I have some experience — want a stronger role or company",
  },
  {
    id: "switch_to_it",
    label: "Move into IT from another field",
    description: "Non-tech or different background — breaking into tech",
  },
  {
    id: "improve_skills",
    label: "Build skills before I apply",
    description: "Focus on learning and projects first, then interviews",
  },
  {
    id: "interview_prep",
    label: "Fix interviews & HR answers",
    description: "I apply but fail in communication or HR rounds",
  },
] as const;

export const JOB_TRACK_OPTIONS = [
  {
    id: "it" as const,
    label: "IT / Software",
    description: "Developer, QA, data, DevOps — tech roles and campus IT drives",
  },
  {
    id: "non_it" as const,
    label: "Non-IT / Other field",
    description: "Commerce, core engineering, HR, finance, banking, government, etc.",
  },
] as const;

const IT_BRANCH_IDS = new Set([
  "Computer Science (CSE)",
  "Information Technology (IT)",
  "AI & Machine Learning",
  "Data Science",
  "Cybersecurity",
]);

/** Suggest track from branch — user can always override on the next step. */
export function suggestJobTrackFromBranch(branch: string, branchOther: string): JobTrack {
  const value = branch === OTHER_VALUE ? branchOther.trim() : branch;
  if (!value) return "non_it";
  const lower = value.toLowerCase();
  if (IT_BRANCH_IDS.has(branch)) return "it";
  if (/computer|cse|information tech|\bit\b|software|data science|cyber|ai |machine learning|bca|mca/.test(lower)) {
    return "it";
  }
  return "non_it";
}

export const NON_IT_CAREER_GOALS = [
  {
    id: "first_job",
    label: "Land my first job in my field",
    description: "Clear path from college to my first offer in my domain",
  },
  {
    id: "switch_career",
    label: "Switch career or industry",
    description: "Moving to a different field than my degree or last role",
  },
  {
    id: "improve_skills",
    label: "Build skills before I apply",
    description: "Focus on learning and resume first, then applications",
  },
  {
    id: "interview_prep",
    label: "Fix interviews & HR answers",
    description: "I apply but struggle in communication or HR rounds",
  },
  {
    id: "switch_to_it",
    label: "Switch into IT / Software",
    description: "Non-tech background — preparing for a tech role",
  },
] as const;

/** Fresher path hides job-switch goal; experienced path hides first-job goal. */
export function careerGoalsForExperience(workExperience: string) {
  if (!workExperience || workExperience === "fresher") {
    return CAREER_GOALS.filter((g) => g.id !== "switch_job");
  }
  return CAREER_GOALS.filter((g) => g.id !== "first_it_job");
}

export function careerGoalsForTrack(track: JobTrack, workExperience: string) {
  if (track === "it") return careerGoalsForExperience(workExperience);
  const isFresher = !workExperience || workExperience === "fresher";
  return NON_IT_CAREER_GOALS.filter((g) => {
    if (isFresher && g.id === "switch_career") return false;
    if (!isFresher && g.id === "first_job") return false;
    return true;
  });
}

export const NON_IT_JOB_ROLES = [
  "Finance / Accounting Executive",
  "HR / Operations Executive",
  "Sales / Business Development",
  "Marketing / Digital Marketing",
  "Core Engineer (Mechanical / Civil / EEE)",
  "Banking / Insurance",
  "Government / PSU",
  "Analyst (Business / Research)",
  "Graduate Trainee (Any field)",
  "Not sure — recommend from my degree",
  OTHER_VALUE,
] as const;

export function jobRolesForTrack(track: JobTrack): readonly string[] {
  return track === "it" ? JOB_ROLES : NON_IT_JOB_ROLES;
}

/** Map IT role → skill domain when user skips the domain picker. */
export function inferDomainFromRole(role: string): string {
  const r = role.toLowerCase();
  if (/front|full stack|web/.test(r)) return "Web Development";
  if (/back|api|server/.test(r)) return "Web Development";
  if (/mobile|android|ios/.test(r)) return "Mobile Apps";
  if (/data analyst|data sci|business analyst/.test(r)) return "Data & Analytics";
  if (/ai|ml|machine learning/.test(r)) return "AI / Machine Learning";
  if (/devops|cloud/.test(r)) return "Cloud & DevOps";
  if (/qa|test/.test(r)) return "Testing / QA";
  if (/cyber|security/.test(r)) return "Cybersecurity";
  if (/ui|ux|design/.test(r)) return "UI/UX Design";
  if (/embedded|iot/.test(r)) return "Embedded / IoT";
  if (/sap|erp/.test(r)) return "Enterprise (SAP / ERP)";
  return "General IT / Open to all";
}

export const JOB_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Mobile Developer (Android / iOS)",
  "Data Analyst",
  "Data Scientist",
  "Business Analyst",
  "QA / Software Tester",
  "DevOps Engineer",
  "Cloud Engineer",
  "AI / ML Engineer",
  "Cybersecurity Analyst",
  "UI/UX Designer",
  "Product Manager (Associate)",
  "Technical / IT Support",
  "Database Administrator",
  "SAP / ERP Consultant",
  "Digital Marketing (Tech)",
  "Graduate Trainee / Fresher",
  "Any IT role",
  OTHER_VALUE,
] as const;

export const DOMAINS = [
  "Web Development",
  "Mobile Apps",
  "Data & Analytics",
  "AI / Machine Learning",
  "Cloud & DevOps",
  "Testing / QA",
  "Cybersecurity",
  "UI/UX Design",
  "Embedded / IoT",
  "Enterprise (SAP / ERP)",
  "General IT / Open to all",
  OTHER_VALUE,
] as const;

export const HAS_PROJECTS_OPTIONS = [
  { id: "yes_resume", label: "Yes — on resume with link or demo" },
  { id: "built_not_listed", label: "Built projects — not on resume yet" },
  { id: "in_progress", label: "Working on my first project now" },
  { id: "no", label: "Not yet — need project ideas" },
] as const;

export const BIGGEST_BLOCKER_OPTIONS = [
  {
    id: "no_direction",
    label: "I don't know which role to target",
    description: "Too many options — DevOps, data, full stack…",
  },
  {
    id: "weak_english",
    label: "English / speaking confidence",
    description: "I know concepts but struggle to explain in interviews",
  },
  {
    id: "no_projects",
    label: "No portfolio or resume projects",
    description: "Resume feels empty compared to other candidates",
  },
  {
    id: "low_coding",
    label: "Coding skills feel too weak",
    description: "College syllabus isn't enough — need hands-on practice",
  },
  {
    id: "interview_fear",
    label: "Interview & HR round anxiety",
    description: "I freeze on Tell me about yourself or HR questions",
  },
  {
    id: "not_applying",
    label: "Don't know how to apply",
    description: "Unsure about Naukri, LinkedIn, referrals, or off-campus",
  },
] as const;

export const INTERVIEW_EXPERIENCE_OPTIONS = [
  { id: "never", label: "Never attended a job interview" },
  { id: "1_2", label: "1–2 interviews (campus or off-campus)" },
  { id: "several", label: "Several interviews — no offer yet" },
] as const;

export const WEEKLY_HOURS_OPTIONS = [
  { id: "under_5", label: "Less than 5 hours / week", description: "Side prep alongside college or work" },
  { id: "5_10", label: "5–10 hours / week", description: "Steady part-time prep" },
  { id: "10_15", label: "10–15 hours / week", description: "Serious daily practice" },
  { id: "15_plus", label: "15+ hours / week", description: "Full-time job search focus" },
] as const;

export const JOB_SEARCH_STATUS = [
  { id: "not_started", label: "Haven't applied anywhere yet" },
  { id: "learning_first", label: "Still learning — will apply soon" },
  { id: "light", label: "Applying sometimes (~1–5 roles/week)" },
  { id: "active", label: "Actively applying (~5+ roles/week)" },
] as const;

export const JOINING_TIMELINES = [
  { id: "immediate", label: "Ready when a good offer comes" },
  { id: "within_months", label: "Within a few months (flexible)" },
  { id: "after_prep", label: "After I finish key skills/projects" },
  { id: "exploring", label: "Exploring only — no fixed date" },
] as const;

export const COMPANY_TYPE_OPTIONS = [
  {
    id: "startup",
    label: "Startups & product companies",
    description: "Smaller teams, faster learning, often higher ownership early on",
  },
  {
    id: "mnc_services",
    label: "MNCs & IT services",
    description: "TCS, Infosys, Wipro, Cognizant — structured fresher programs",
  },
  {
    id: "product_mnc",
    label: "Product MNCs",
    description: "Amazon, Microsoft, Adobe India — product roles with tougher bar",
  },
  {
    id: "open",
    label: "Open to any — help me decide",
    description: "Not sure yet which type fits my profile best",
  },
] as const;

export const JOB_SEARCH_CHANNEL_OPTIONS = [
  {
    id: "campus",
    label: "Campus placements only",
    description: "College drives, TPO, pool campus — main path for me",
  },
  {
    id: "both",
    label: "Campus + off-campus together",
    description: "Placements plus Naukri, LinkedIn, and referrals in parallel",
  },
  {
    id: "off_campus",
    label: "Off-campus only",
    description: "No campus drive / already graduated — applying on my own",
  },
  {
    id: "internship_ppo",
    label: "Internship or PPO first",
    description: "Want an internship or pre-placement offer before full-time",
  },
] as const;

export const INTERVIEW_LANGUAGE_OPTIONS = [
  {
    id: "english",
    label: "English",
    description: "Comfortable answering fully in English",
  },
  {
    id: "hinglish",
    label: "English + Hindi (Hinglish)",
    description: "Mix languages — common in many Indian HR rounds",
  },
  {
    id: "hindi",
    label: "Hindi preferred",
    description: "More confident in Hindi for HR and intro rounds",
  },
  {
    id: "regional",
    label: "Regional language + some English",
    description: "Telugu, Tamil, Kannada, etc. — building English for interviews",
  },
  {
    id: "english_goal",
    label: "Want to move to English-only",
    description: "Currently struggle — need structured English interview prep",
  },
] as const;

export const CODING_LEVEL_LABELS = [
  "Beginner — just started",
  "Basic — tutorials done",
  "Intermediate — small projects",
  "Advanced — deployable apps",
  "Strong — interview-ready projects",
] as const;

export const ENGLISH_LEVEL_LABELS = [
  "Struggle in interviews",
  "Basic — short answers only",
  "Average — gets the point across",
  "Good — clear and confident",
  "Fluent — comfortable with HR",
] as const;

export const ONBOARDING_STEPS = [
  {
    title: "Who are you right now?",
    hint: "Honest answers help us match the right role and prep intensity — no wrong choices.",
  },
  {
    title: "Your education background",
    hint: "Degree and branch shape which roles recruiters expect from you.",
  },
  {
    title: "What are you preparing for?",
    hint: "Pick IT or non-IT, then your goal, target role, and how you'll apply.",
  },
  {
    title: "Skills, projects & challenges",
    hint: "Include how you speak in interviews — we tune HR and communication coaching.",
  },
  {
    title: "Prep time & applications",
    hint: "How much time you can invest and whether you've started applying — pace varies for everyone.",
  },
] as const;

const labelFrom = <T extends { id: string; label: string }>(options: readonly T[], id: string) =>
  options.find((o) => o.id === id)?.label ?? id;

export function studentStatusLabel(id: string): string {
  return labelFrom(STUDENT_STATUS_OPTIONS, id);
}

export function biggestBlockerLabel(id: string): string {
  return labelFrom(BIGGEST_BLOCKER_OPTIONS, id);
}

export function weeklyHoursLabel(id: string): string {
  return labelFrom(WEEKLY_HOURS_OPTIONS, id);
}

export function interviewExperienceLabel(id: string): string {
  return labelFrom(INTERVIEW_EXPERIENCE_OPTIONS, id);
}

export function companyTypeLabel(id: string): string {
  return labelFrom(COMPANY_TYPE_OPTIONS, id);
}

export function jobSearchChannelLabel(id: string): string {
  return labelFrom(JOB_SEARCH_CHANNEL_OPTIONS, id);
}

export function interviewLanguageLabel(id: string): string {
  return labelFrom(INTERVIEW_LANGUAGE_OPTIONS, id);
}

export function jobTrackLabel(track: JobTrack | ""): string {
  if (track === "it") return "IT / Software";
  if (track === "non_it") return "Non-IT / Other field";
  return "";
}

export function hasProjectsLabel(id: string): string {
  return labelFrom(HAS_PROJECTS_OPTIONS, id);
}

export function jobSearchStatusLabel(id: string): string {
  return labelFrom(JOB_SEARCH_STATUS, id);
}

export function joiningTimelineLabel(id: string): string {
  return labelFrom(JOINING_TIMELINES, id);
}

export function hasResumeProjects(hasProjects: string): boolean {
  return hasProjects === "yes_resume" || hasProjects === "yes";
}

export function hasAnyProjectsBuilt(hasProjects: string): boolean {
  return hasResumeProjects(hasProjects) || hasProjects === "built_not_listed";
}

export function needsProjectHelp(hasProjects: string): boolean {
  return hasProjects === "no" || hasProjects === "in_progress";
}

export function otherOptionLabel(field: string): string {
  return `Other — type your ${field}`;
}

export function createInitialForm(defaultName: string): OnboardingFormData {
  return {
    fullName: defaultName,
    city: "",
    workExperience: "",
    jobTrack: "",
    studentStatus: "",
    qualification: "",
    qualificationOther: "",
    branch: "",
    branchOther: "",
    graduationYear: "",
    careerPreference: "",
    interestedRole: "",
    interestedRoleOther: "",
    targetDomain: "",
    targetDomainOther: "",
    codingLevel: 2,
    englishLevel: 2,
    hasProjects: "",
    biggestBlocker: "",
    interviewExperience: "",
    weeklyHours: "",
    preferredCompanyType: "",
    jobSearchChannel: "",
    interviewLanguage: "",
    jobSearchStatus: "",
    joiningTimeline: "",
  };
}
