import type { AiUserContext } from "@/lib/ai/context";
import type { RoadmapPlan } from "@/types/career";
import { experiencePromptLine, isJobSwitchProfile } from "@/lib/experience-segment";
import { needsProjectHelp, companyTypeLabel, jobSearchChannelLabel, interviewLanguageLabel } from "@/types/onboarding";

export type RoadmapInput = {
  degree?: string;
  skillLevel?: string;
  interestedRole?: string;
  targetDomain?: string;
  careerPreference?: string;
};

export const ROADMAP_SYSTEM_PROMPT = `You are a senior career coach specializing in Indian tech hiring (2024-2026 market).
Create a concrete phased job preparation roadmap. Use day, week, and month labels (e.g. "Week 1-2:", "Month 2:", "Daily:") — do NOT promise a fixed total duration or guaranteed job offer. Pace varies by candidate skill, time available, and market.

AUDIENCE (check candidate profile):
- FRESHER (0 years): first job, campus/off-campus, portfolio projects, fresher salary bands.
- EXPERIENCED (1–2+ years or job-switch goal): lateral hiring, impact bullets, reason for change, hike expectations — NOT fresher/campus advice.

CRITICAL RULES:
1. PRIMARY focus = Target job role (not domain label if they conflict).
   Example: role "Mobile Developer" + domain "Web Development" → plan must bridge INTO mobile (Kotlin/Swift or React Native/Flutter), NOT generic web-only tasks.
2. Every bullet must be SPECIFIC: name tools, frameworks, project ideas, and timeframes.
3. Use Indian context: Naukri, LinkedIn India, campus/off-campus drives, INR salary bands where relevant.
4. Adapt to skill level (Beginner = fundamentals first; Advanced = portfolio depth + system design basics).
5. If has_projects indicates no portfolio yet (no / in_progress), include 2 portfolio projects with clear deliverables.
6. If english_level <= 2, communication plan must prioritize interview spoken English.
7. Prefix each action with a phase label like "Week 1-2:", "Week 3-4:", "Month 2:", or "Daily:" — candidates may need more or fewer phases; never state a fixed total like "90 days" or promise they will get hired by a date.
8. Do not guarantee employment, interviews, or offers — focus on preparation steps only.

Return ONLY valid JSON:
{
  "headline": "One motivating line personalized to their role",
  "primaryFocus": "The exact role + stack they should optimize for",
  "bridgeNote": "Optional 1 sentence if role and domain differ; empty string if aligned",
  "technicalSkills": string[],
  "communicationPlan": string[],
  "hrPreparation": string[],
  "jobApplicationStrategy": string[],
  "resumeApproach": string[]
}

Each array: 5-6 items. No generic filler. No repeating the same advice across sections.`;

type CareerFocus = {
  primaryFocus: string;
  bridgeNote: string;
  stack: string[];
  projects: string[];
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+/ ]/g, " ");
}

export function resolveCareerFocus(role: string, domain: string): CareerFocus {
  const r = normalize(role);
  const d = normalize(domain);

  if (r.includes("mobile") || r.includes("android") || r.includes("ios")) {
    const bridge =
      d.includes("web") && !d.includes("mobile")
        ? `Your background is in ${domain}, but your target is ${role}. This plan bridges web fundamentals into mobile hiring requirements.`
        : "";
    return {
      primaryFocus: "Mobile Developer (Android / iOS or cross-platform)",
      bridgeNote: bridge,
      stack: ["Kotlin or Java (Android)", "Swift or React Native/Flutter", "REST APIs", "Git", "Play Store / App Store basics"],
      projects: [
        "Notes/expense tracker app with local storage + API sync",
        "Clone a popular app screen (e.g., Swiggy home or Instagram feed) with clean UI",
      ],
    };
  }

  if (r.includes("frontend") || d.includes("web")) {
    return {
      primaryFocus: "Frontend / Web Developer",
      bridgeNote: "",
      stack: ["HTML/CSS", "JavaScript", "React.js", "Responsive UI", "Git", "Basic REST integration"],
      projects: ["Portfolio site with project case studies", "Dashboard UI with charts and API data"],
    };
  }

  if (r.includes("backend") || r.includes("full stack")) {
    return {
      primaryFocus: r.includes("full") ? "Full Stack Developer" : "Backend Developer",
      bridgeNote: "",
      stack: ["Node.js or Python", "REST APIs", "PostgreSQL/MongoDB", "Auth (JWT)", "Deployment (Render/Railway)"],
      projects: ["CRUD API with auth + docs", "Full stack app: frontend + API + database"],
    };
  }

  if (r.includes("data")) {
    return {
      primaryFocus: r.includes("scientist") ? "Data Scientist" : "Data Analyst",
      bridgeNote: "",
      stack: ["SQL", "Python (Pandas)", "Excel/Sheets", "Visualization (Power BI or Tableau)", "Basic statistics"],
      projects: ["End-to-end analysis on a public dataset with insights deck", "SQL + dashboard project for business KPIs"],
    };
  }

  if (r.includes("qa") || r.includes("test")) {
    return {
      primaryFocus: "QA / Software Tester",
      bridgeNote: "",
      stack: ["Manual testing", "Test cases & bug reports", "Selenium/Cypress basics", "API testing (Postman)", "Agile/JIRA"],
      projects: ["Test plan + bug report portfolio for a sample web app", "Automated smoke test suite for a demo site"],
    };
  }

  if (r.includes("devops") || r.includes("cloud")) {
    return {
      primaryFocus: "DevOps / Cloud Engineer",
      bridgeNote: "",
      stack: ["Linux basics", "Docker", "CI/CD (GitHub Actions)", "AWS/GCP fundamentals", "Monitoring basics"],
      projects: ["Dockerize a web app + deploy pipeline", "Infrastructure-as-code mini lab (Terraform or CloudFormation intro)"],
    };
  }

  if (r.includes("ai") || r.includes("ml") || d.includes("ai")) {
    return {
      primaryFocus: "AI / ML Engineer (fresher track)",
      bridgeNote: "",
      stack: ["Python", "NumPy/Pandas", "Scikit-learn", "Basic deep learning intro", "Model deployment basics"],
      projects: ["Classification project with metrics + README", "Simple NLP or CV mini-project with demo notebook"],
    };
  }

  return {
    primaryFocus: role || domain || "IT fresher role",
    bridgeNote:
      role && domain && !r.includes(d.split(" ")[0] ?? "")
        ? `Aligning your ${domain} background toward ${role} hiring expectations.`
        : "",
    stack: ["Core programming", "Git", "One framework in your domain", "APIs", "Deployment basics"],
    projects: ["One portfolio project with README and live demo", "One case-study style project showing problem → solution → impact"],
  };
}

function phase(weeks: string, text: string): string {
  return `${weeks}: ${text}`;
}

export function buildSmartFallbackRoadmap(input: RoadmapInput, ctx?: AiUserContext): RoadmapPlan {
  const degree = input.degree?.trim() || ctx?.degree || "your degree";
  const role = input.interestedRole?.trim() || ctx?.interestedRole || "IT fresher role";
  const domain = input.targetDomain?.trim() || ctx?.targetDomain || "General IT";
  const level = input.skillLevel?.trim() || ctx?.skillLevel || "Beginner";
  const preference = input.careerPreference?.trim() || ctx?.careerPreference || "Get first IT job";
  const hasProjects = ctx?.hasProjects ?? "unknown";
  const english = ctx?.englishLevel ?? 3;
  const jobSearch = ctx?.jobSearchStatus ?? "not_started";
  const jobSwitch = isJobSwitchProfile({ workExperience: ctx?.workExperience, careerPreference: preference });

  const focus = resolveCareerFocus(role, domain);
  const stackList = focus.stack.join(", ");

  const technicalSkills = [
    phase("Week 1-2", `Master ${focus.stack[0]} and ${focus.stack[1]} — build daily 1-hour practice blocks aligned to ${focus.primaryFocus}.`),
    phase("Week 3-4", `Study ${stackList}; complete tutorials with notes you can explain in interviews.`),
    phase("Month 2", `Project 1 — ${focus.projects[0]}. Deploy or share APK/repo link on GitHub.`),
    phase("Month 2-3", `Project 2 — ${focus.projects[1]}. Add metrics in README (load time, users, accuracy, etc.).`),
    phase("Month 3", `Mock technical round: explain architecture, trade-offs, and debugging steps for both projects.`),
    level.toLowerCase().includes("beginner")
      ? phase("Week 1", "Solidify Git, CLI, and debugging — recruiters expect this even for freshers.")
      : phase("Week 2", "Add one advanced topic for your stack (state management, testing, or CI) to stand out."),
  ];

  const communicationPlan =
    english <= 2
      ? [
          phase("Daily", "10-minute spoken intro: name, degree, why this role — record and re-record until under 60 seconds."),
          phase("Daily", "Read one technical paragraph aloud; focus on clear T sounds and short sentences."),
          phase("Week 2", "STAR story practice: 1 teamwork + 1 challenge story, 90 seconds each."),
          phase("Weekly", "Use the app's Communication Analysis on your recorded answers."),
          phase("Week 4", "Mock HR with a friend — eliminate filler words and long pauses."),
        ]
      : [
          phase("Week 1", `60-second pitch: ${degree} → why ${role} → one project proof point.`),
          phase("Daily", "Practice Point → Example → Result answers in under 90 seconds."),
          phase("Weekly", "Record mock answers; fix pacing, filler words, and weak openings."),
          phase("Week 3", "Prepare answers for 'walk me through your project' with live demo flow."),
          phase("Month 2", "Weekly mock interview round — refine weak answers from AI feedback."),
        ];

  const hrPreparation = jobSwitch
    ? [
        phase("Week 1", `Script: "Why ${role} at this stage?" — tie current company work to the target role.`),
        phase("Week 2", "Prepare 'Why are you leaving?' — positive framing: growth, stack, impact, not complaints."),
        phase("Week 3", "Salary & hike: research 20–40% uplift for 1–2 yr lateral moves in your city; practice negotiation."),
        phase("Week 4", "Prepare 'What did you achieve in your last role?' with 2 metrics (time saved, revenue, users, bugs fixed)."),
        phase("Before each interview", "Notice period & joining date — have a clear answer ready."),
      ]
    : [
        phase("Week 1", `Script: "Why ${role}?" — connect ${degree} background to ${focus.primaryFocus}.`),
        phase("Week 2", "Prepare 3 STAR stories: teamwork, failure/learning, ownership under deadline."),
        phase("Week 3", "Salary & joining: research fresher band for your city; practice confident, polite responses."),
        phase("Week 4", "Prepare 'Why should we hire you?' with 2 project proofs + willingness to learn."),
        phase("Before each interview", "Company research (product, news, culture) + 2 thoughtful questions for HR."),
      ];

  const applyIntensity =
    jobSearch === "heavy" ? "15-20" : jobSearch === "light" ? "5-8" : "8-12";

  const jobApplicationStrategy = jobSwitch
    ? [
        phase("Week 1", "Update LinkedIn headline: current role → target role; add 3 impact bullets to About."),
        phase("Daily", `Apply to ${applyIntensity} lateral ${role} openings — filter 1–3 yrs experience on Naukri/LinkedIn.`),
        phase("Weekly", "Track funnel: applied → HR screen → tech → offer; note rejection reasons."),
        phase("Week 2+", "Message recruiters and ex-colleagues for referrals — lead with one quantified achievement."),
        preference.toLowerCase().includes("switch")
          ? phase("Week 3", "Highlight transferable skills and stack overlap in every application.")
          : phase("Week 3", "Target product companies and service firms hiring 1–2 yr profiles for your stack."),
      ]
    : [
        phase("Week 1", "Optimize Naukri + LinkedIn India profiles with role keywords and project links."),
        phase("Daily", `Apply to ${applyIntensity} ${role} roles — tailor headline + skills per posting.`),
        phase("Weekly", "Track funnel in a sheet: applied → shortlist → interview → offer."),
        phase("Week 2+", "Follow up recruiters 5-7 days after applying with 3-line project-focused message."),
        preference.toLowerCase().includes("switch")
          ? phase("Week 3", "Highlight transferable skills from non-IT background in every application.")
          : phase("Week 3", "Target off-campus drives, referral posts, and fresher-specific job filters on Naukri."),
      ];

  const resumeApproach = jobSwitch
    ? [
        phase("Week 1", `Headline: "${role} | ${focus.stack.slice(0, 2).join(" · ")}" + years of experience upfront.`),
        phase("Week 2", "Rewrite last role bullets with metrics: % improvement, users, latency, revenue, tickets closed."),
        phase("Week 2", "Add 'Key achievements' section — 3 bullets recruiters can scan in 10 seconds."),
        phase("Week 3", "Two-page max if needed; lead with recent role; remove college-only filler."),
        phase("Ongoing", "Before each apply: mirror JD keywords into your top 3 bullets."),
      ]
    : [
        phase("Week 1", `Headline: "${role} | ${focus.stack.slice(0, 3).join(" · ")}" + GitHub/LinkedIn links.`),
        needsProjectHelp(hasProjects)
          ? phase("Week 2-4", "Add Projects section with 2 in-progress builds — honest status + expected completion date.")
          : phase("Week 2", "Quantify project bullets: users, performance, accuracy, or time saved."),
        phase("Week 2", "ATS pass: mirror keywords from 5 job descriptions into skills + project bullets."),
        phase("Week 3", "One-page resume for freshers; PDF export; test on Naukri upload preview."),
        phase("Ongoing", "Before each apply: tweak 3 bullets to match that company's stack keywords."),
      ];

  return {
    headline: jobSwitch
      ? `Your phased plan to grow into a stronger ${role} role — pace yourself in weeks or months`
      : `Your phased plan to prepare for ${role} interviews — progress at your own speed`,
    primaryFocus: focus.primaryFocus,
    bridgeNote: focus.bridgeNote,
    technicalSkills,
    communicationPlan,
    hrPreparation,
    jobApplicationStrategy,
    resumeApproach,
  };
}

export function parseRoadmapResponse(raw: string, fallback: RoadmapPlan): RoadmapPlan {
  try {
    const parsed = JSON.parse(raw) as Partial<RoadmapPlan>;
    const pick = (arr: unknown, min: number) =>
      Array.isArray(arr) && arr.length >= min ? arr.map(String) : null;

    const technicalSkills = pick(parsed.technicalSkills, 3);
    const communicationPlan = pick(parsed.communicationPlan, 3);
    const hrPreparation = pick(parsed.hrPreparation, 3);
    const jobApplicationStrategy = pick(parsed.jobApplicationStrategy, 3);
    const resumeApproach = pick(parsed.resumeApproach, 3);

    if (!technicalSkills || !communicationPlan || !hrPreparation || !jobApplicationStrategy || !resumeApproach) {
      return fallback;
    }

    return {
      headline: String(parsed.headline ?? fallback.headline ?? "Your personalized preparation roadmap"),
      primaryFocus: String(parsed.primaryFocus ?? fallback.primaryFocus ?? ""),
      bridgeNote: String(parsed.bridgeNote ?? fallback.bridgeNote ?? ""),
      technicalSkills,
      communicationPlan,
      hrPreparation,
      jobApplicationStrategy,
      resumeApproach,
    };
  } catch {
    return fallback;
  }
}

export function buildRoadmapUserPrompt(ctx: AiUserContext, body: RoadmapInput): string {
  const role = body.interestedRole ?? ctx.interestedRole;
  const domain = body.targetDomain ?? ctx.targetDomain;
  const degree = body.degree ?? ctx.degree ?? "Not specified";
  const skillLevel = body.skillLevel ?? ctx.skillLevel ?? "Beginner";
  const careerGoal = body.careerPreference ?? ctx.careerPreference ?? "Not specified";

  return [
    "Generate a roadmap for this candidate:",
    "",
    `Degree: ${degree}`,
    `Target role (PRIMARY): ${role || "Not specified"}`,
    `Selected domain: ${domain || "Not specified"}`,
    `Skill level: ${skillLevel}`,
    `Career goal: ${careerGoal}`,
    `Work experience: ${ctx.workExperience ? ctx.workExperience.replace(/_/g, " ") : "fresher (default)"}`,
    experiencePromptLine(ctx),
    `City: ${ctx.city || "India (general)"}`,
    `Graduation: ${ctx.graduationYear || "Not specified"}`,
    `Coding self-rating: ${ctx.codingLevel ?? "?"}/5`,
    `English self-rating: ${ctx.englishLevel ?? "?"}/5`,
    `Projects on resume: ${ctx.hasProjects || "unknown"}`,
    ctx.biggestBlocker ? `Priority challenge: ${ctx.biggestBlocker}` : "",
    ctx.weeklyHours ? `Weekly prep hours: ${ctx.weeklyHours}` : "",
    ctx.preferredCompanyType
      ? `Preferred company type: ${companyTypeLabel(ctx.preferredCompanyType)}`
      : "",
    ctx.jobSearchChannel ? `Job search channel: ${jobSearchChannelLabel(ctx.jobSearchChannel)}` : "",
    ctx.interviewLanguage ? `Interview language: ${interviewLanguageLabel(ctx.interviewLanguage)}` : "",
    `Job search activity: ${ctx.jobSearchStatus || "unknown"}`,
    `Joining timeline: ${ctx.joiningTimeline || "unknown"}`,
    "",
    role && domain && !normalize(role).includes(normalize(domain).split(" ")[0] ?? "zzz")
      ? `NOTE: Role "${role}" may differ from domain "${domain}". Bridge the gap explicitly in technicalSkills and bridgeNote.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
