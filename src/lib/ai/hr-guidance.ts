import type { AiUserContext } from "@/lib/ai/context";
import type { HrGuidancePlan, HrQaItem } from "@/types/career";
import { resolveCareerFocus } from "@/lib/ai/roadmap";
import { experiencePromptLine, isJobSwitchProfile, workExperienceLabel } from "@/lib/experience-segment";

export type HrGuidanceInput = {
  interestedRole?: string;
  targetDomain?: string;
  skillLevel?: string;
  careerPreference?: string;
  degree?: string;
};

export const HR_GUIDANCE_SYSTEM_PROMPT = `You are an expert HR interview coach for Indian tech candidates (2024-2026 hiring market).
Write copy-paste ready scripts the candidate can practice aloud.

AUDIENCE:
- FRESHER (0 years): humble, first-job tone, fresher salary bands, campus/off-campus context.
- EXPERIENCED (1–2+ years or job switch): impact bullets, reason for leaving, hike negotiation — never call them a fresher.

RULES:
1. Target job ROLE is primary. If role and domain conflict (e.g. Mobile Developer + Web Development), bridge explicitly in answers.
2. commonHrQuestions must be FULL answer scripts (60-120 words each), not vague advice like "explain your motivation".
3. Use natural spoken English — confident, interview-appropriate for their experience level.
4. Include Indian context where relevant (Naukri, LinkedIn India, INR salary bands).
5. recruiterApproachScripts: complete LinkedIn/WhatsApp/Email messages with [brackets] for personalization.

Return ONLY valid JSON:
{
  "headline": "One line personalized to their role",
  "roleFocus": "Exact role they are interviewing for",
  "bridgeNote": "One sentence if role/domain mismatch, else empty string",
  "hrCommunicationTips": string[],
  "recruiterApproachScripts": string[],
  "commonHrQuestions": [
    { "question": "...", "answerScript": "Full spoken answer...", "proTip": "Optional 1-line delivery tip" }
  ],
  "realWorldScenarios": string[]
}

Include at least 6 commonHrQuestions covering:
- Tell me about yourself
- Why this role
- Why should we hire you
- Strengths and weaknesses
- Salary expectation
- Are you open to relocation / learning new tools

Each other array: 4-5 items.`;

function normalize(s: string): string {
  return s.toLowerCase();
}

export function buildSmartHrFallback(input: HrGuidanceInput, ctx?: AiUserContext): HrGuidancePlan {
  const role = input.interestedRole?.trim() || ctx?.interestedRole || "your target role";
  const domain = input.targetDomain?.trim() || ctx?.targetDomain || "your field";
  const level = input.skillLevel?.trim() || ctx?.skillLevel || "Intermediate";
  const degree = input.degree?.trim() || ctx?.degree || "my degree";
  const preference = input.careerPreference?.trim() || ctx?.careerPreference || "getting my first IT job";
  const name = ctx?.fullName?.split(" ")[0] || "I";
  const jobSwitch = isJobSwitchProfile({ workExperience: ctx?.workExperience, careerPreference: preference });
  const expLabel = ctx?.workExperience ? workExperienceLabel(ctx.workExperience) : "no prior work experience";

  const focus = resolveCareerFocus(role, domain);
  const isMobile = normalize(role).includes("mobile") || normalize(role).includes("android");
  const webToMobile = isMobile && normalize(domain).includes("web");

  const commonHrQuestions: HrQaItem[] = [
    {
      question: "Tell me about yourself",
      answerScript: webToMobile
        ? `"Good morning. I'm ${name}, a ${degree} graduate with a strong interest in ${focus.primaryFocus}. I started with ${domain} — HTML, CSS, JavaScript, and React — which taught me how users interact with products. That pushed me toward mobile, where I began building Android-style apps with ${isMobile ? "Kotlin/React Native" : "relevant mobile tools"}. I've completed [Project 1 name] — [one-line impact]. I'm now actively preparing for ${role} roles and I'm excited to bring my UI thinking and problem-solving to your team."`
        : jobSwitch
          ? `"Good morning. I'm ${name}, a ${degree} graduate with ${expLabel.toLowerCase()} in ${domain}. I've been working on ${focus.stack.slice(0, 2).join(" and ")} and delivered [specific achievement with metric]. I'm now looking for a ${role} role where I can take on more ownership and grow my impact. My recent work on [Project] taught me [skill], and I'm ready to bring that to your team."`
          : `"Good morning. I'm ${name}, a ${degree} graduate targeting ${role} roles. At ${level} level, I've built skills in ${focus.stack.slice(0, 3).join(", ")}. My best project is [Project name] — where I [specific outcome]. I'm ${preference.toLowerCase().includes("switch") ? "transitioning into IT" : "focused on landing my first role"} and I'm looking for a team where I can learn fast and contribute from day one."`,
      proTip: "Keep it under 90 seconds. Smile on the first line — HR decides in the first 15 seconds.",
    },
    {
      question: `Why ${role}?`,
      answerScript: webToMobile
        ? `"Mobile apps reach users where they spend most of their time — on their phones. My ${domain} background helps me think about layout, performance, and user flow, which maps directly to mobile UX. I chose ${role} because I enjoy building tangible products people use daily. I've already started [mobile project/course] and I'm committed to deepening my skills in ${focus.stack[0]} and publishing real apps."`
        : `"I chose ${role} because it matches both my skills and long-term goal. During ${degree}, I realized I enjoy building practical solutions. I've invested time in ${domain} through projects and self-study. ${role} lets me do meaningful work while growing in a high-demand area in India."`,
      proTip: "Never say 'for money' or 'because friends suggested'. Tie answer to ONE project proof.",
    },
    {
      question: "Why should we hire you?",
      answerScript: jobSwitch
        ? `"You should hire me because I've already delivered in a professional setting. In my current/previous role, I [metric-backed achievement]. I bring ${level.toLowerCase()} ${domain} skills plus the discipline of shipping under deadlines. I'm not job-hopping casually — I'm looking for the right ${role} team where I can contribute from month one and grow into a senior contributor."`
        : `"You should hire me because I combine ${level.toLowerCase()} ${domain} skills with strong willingness to learn. In [Project], I [specific measurable result]. I'm disciplined — I practice interview answers and code daily. As a fresher, I won't pretend to know everything, but I will take ownership, ask smart questions, and deliver on tasks you assign. I'm looking for a long-term growth path, not just any job."`,
      proTip: "End with energy — HR remembers the last sentence.",
    },
    {
      question: "What are your strengths and weaknesses?",
      answerScript: `"My strength is quick learning and consistent practice. For example, when I built [Project], I [specific action and result]. My weakness is [real but safe weakness — e.g. public speaking]. I'm actively improving it through daily mock interviews and recording my answers. I see every interview as part of that improvement plan."`,
      proTip: "Weakness must include what you're doing to fix it.",
    },
    ...(jobSwitch
      ? [
          {
            question: "Why are you leaving your current job?",
            answerScript: `"I've learned a lot in my current role — especially [skill/project]. I'm now looking for [specific growth: bigger product, new stack, more ownership]. This ${role} opportunity aligns with that next step. I'm leaving on good terms and can serve my notice period of [X weeks]."`,
            proTip: "Never badmouth your employer — focus on growth, not complaints.",
          } satisfies HrQaItem,
        ]
      : []),
    {
      question: "What are your salary expectations?",
      answerScript: jobSwitch
        ? `"Based on my ${expLabel.toLowerCase()} and research on Naukri/LinkedIn for ${role} in my city, I'm expecting ₹[X] to ₹[Y] LPA — typically a 20–40% uplift from my current package for a lateral move. I'm flexible for the right team, learning scope, and WFH policy, but I want a fair market-aligned offer."`
        : `"As a fresher in ${role}, I've researched market ranges on Naukri and LinkedIn for my city and skill level. I'm flexible in the range of ₹[X] to ₹[Y] LPA depending on role, learning opportunities, and company growth. My priority right now is the right team and mentorship — I'm confident that performance will justify growth in salary over time."`,
      proTip: jobSwitch
        ? "Research market rate for 1–2 yr profiles in your stack; never quote current CTC first."
        : "Research ₹3–6 LPA for most fresher IT roles; adjust for city.",
    },
    {
      question: "Are you open to learning new tools / technologies?",
      answerScript: `"Absolutely. In fact, that's how I moved toward ${role}. I learned [Tool A] in [timeframe] for [Project], and I'm currently picking up [Tool B]. I follow documentation, build small projects, and I'm comfortable asking seniors when stuck. I see every new stack requirement as a chance to become more valuable to the team."`,
      proTip: "Give a past example — 'absolutely' alone sounds empty.",
    },
    {
      question: "Where do you see yourself in 3 years?",
      answerScript: `"In three years, I see myself as a solid ${role} contributing to production features independently, mentoring newer joiners, and possibly leading a small module. I want to grow with the company — deepen technical skills, improve communication with stakeholders, and take on more responsibility as I prove myself in the first 12–18 months."`,
      proTip: "Align with the company — avoid 'CEO in 3 years'.",
    },
  ];

  return {
    headline: `HR scripts tailored for ${role} interviews`,
    roleFocus: focus.primaryFocus,
    bridgeNote: focus.bridgeNote,
    hrCommunicationTips: [
      "Open with: 'Good morning, thank you for this opportunity.' — confident tone, brief pause.",
      `Use Point → Example → Result. At ${level} level, aim for 45–90 seconds per answer.`,
      webToMobile
        ? "If asked about background mismatch: 'My web experience is an advantage for mobile UI and API integration.'"
        : `Link ${degree} to ${role} in every third sentence — repetition builds credibility.`,
      "Maintain eye contact, pause before hard questions, never interrupt HR.",
      "Close with: 'Thank you. I'm very interested in this role and happy to share my portfolio or complete any assignment.'",
    ],
    recruiterApproachScripts: jobSwitch
      ? [
          `Hi [Recruiter Name], I'm ${name} with ${expLabel.toLowerCase()} in ${domain}, now targeting ${role} roles. Recent win: [metric-backed achievement]. Open to lateral opportunities — resume attached. Thank you!`,
          `Hello [Name], I'm exploring ${role} positions with 1–2 yrs experience filter. Stack: ${focus.stack.slice(0, 3).join(", ")}. Would appreciate a referral if your team is hiring.`,
          `Subject: ${role} — ${expLabel} | ${name}\n\nDear HR,\nI am interested in lateral ${role} openings. I bring production experience in ${focus.stack.slice(0, 2).join(" & ")} and am on [X weeks] notice.\n\nRegards,\n${name}`,
          `Hi [Name], following up on my ${role} application. Since applying I [new achievement/certification]. Available for a call this week.`,
        ]
      : [
          `Hi [Recruiter Name], I'm ${name}, a ${degree} graduate targeting ${role} roles. I recently built [Project] using ${focus.stack.slice(0, 2).join(" & ")}. Would you be open to reviewing my resume for fresher openings? Portfolio: [link]. Thank you!`,
          `Hello [Name], I'm actively applying for ${role} positions in ${domain}. Key project: [1-line impact]. If your team has junior openings, I'd appreciate a referral or application link. Best, ${name}`,
          `Subject: Application — ${role} Fresher | ${name}\n\nDear HR Team,\nI am interested in ${role} opportunities. With ${level} skills in ${focus.stack.slice(0, 3).join(", ")}, I've attached my resume and GitHub link.\n\nRegards,\n${name}`,
          `Hi [Name], following up on my ${role} application. I've added [Project] since we last spoke. Happy to share a demo or take a screening call this week.`,
        ],
    commonHrQuestions,
    realWorldScenarios: [
      `If HR says "Your background is ${domain}, not ${role}": "I've deliberately bridged into ${role} through [course/project]. My ${domain} base helps with [UI/APIs/logic]. I'm happy to complete a small assignment to prove fit."`,
      "If asked about a career gap: Be honest briefly, then pivot to skills built (courses, projects, certifications).",
      "If salary offered is low: 'Thank you. Based on my research, I was expecting closer to ₹[X]. Is there flexibility or a review after probation?'",
      "If rejected: 'Could you share one skill I should improve? I want to come back stronger.'",
      "If HR goes silent: Send a polite follow-up after 5 days with one new project update.",
    ],
  };
}

type ParsedQa = HrQaItem & { answer?: string };

export function parseHrGuidanceResponse(raw: string, fallback: HrGuidancePlan): HrGuidancePlan {
  try {
    const parsed = JSON.parse(raw) as Partial<HrGuidancePlan> & {
      commonHrQuestions?: Array<string | ParsedQa>;
    };

    const tips = Array.isArray(parsed.hrCommunicationTips) ? parsed.hrCommunicationTips.map(String) : null;
    const scripts = Array.isArray(parsed.recruiterApproachScripts)
      ? parsed.recruiterApproachScripts.map(String)
      : null;
    const scenarios = Array.isArray(parsed.realWorldScenarios) ? parsed.realWorldScenarios.map(String) : null;

    let qa: HrQaItem[] | null = null;
    if (Array.isArray(parsed.commonHrQuestions)) {
      const rawQa = parsed.commonHrQuestions as Array<string | ParsedQa>;
      qa = rawQa
        .map((item): HrQaItem | null => {
          if (typeof item === "string") {
            const match = item.match(/^Q:\s*(.+?)\s*A:\s*([\s\S]+)$/i);
            if (match) return { question: match[1].trim(), answerScript: match[2].trim() };
            return { question: "Interview question", answerScript: item };
          }
          if (item && typeof item === "object" && "question" in item) {
            return {
              question: String(item.question),
              answerScript: String(item.answerScript ?? item.answer ?? ""),
              proTip: item.proTip ? String(item.proTip) : undefined,
            };
          }
          return null;
        })
        .filter((x): x is HrQaItem => x !== null && x.answerScript.length > 20);
    }

    if (!tips || !scripts || !scenarios || !qa || qa.length < 4) {
      return fallback;
    }

    return {
      headline: String(parsed.headline ?? fallback.headline ?? ""),
      roleFocus: String(parsed.roleFocus ?? fallback.roleFocus ?? ""),
      bridgeNote: String(parsed.bridgeNote ?? fallback.bridgeNote ?? ""),
      hrCommunicationTips: tips,
      recruiterApproachScripts: scripts,
      commonHrQuestions: qa,
      realWorldScenarios: scenarios,
    };
  } catch {
    return fallback;
  }
}

export function buildHrUserPrompt(ctx: AiUserContext, body: HrGuidanceInput): string {
  const role = body.interestedRole ?? ctx.interestedRole;
  const domain = body.targetDomain ?? ctx.targetDomain;

  return [
    "Create HR guidance for:",
    `Degree: ${body.degree ?? ctx.degree ?? "Not specified"}`,
    `Target role (PRIMARY): ${role || "Not specified"}`,
    `Domain: ${domain || "Not specified"}`,
    `Skill level: ${body.skillLevel ?? ctx.skillLevel ?? "Intermediate"}`,
    `Career goal: ${body.careerPreference ?? ctx.careerPreference ?? "Not specified"}`,
    experiencePromptLine(ctx),
    `English level: ${ctx.englishLevel ?? "?"}/5`,
    `Projects on resume: ${ctx.hasProjects ?? "unknown"}`,
    `City: ${ctx.city || "India"}`,
    "",
    role && domain && !normalize(role).includes(normalize(domain).split(" ")[0] ?? "___")
      ? `IMPORTANT: Bridge ${domain} background toward ${role} in every answer script.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
