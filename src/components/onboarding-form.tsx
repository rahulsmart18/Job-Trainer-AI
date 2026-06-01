"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mapOnboardingToProfile, mapProfileToOnboardingForm, type EditableProfile } from "@/lib/profile-mapper";
import { SearchableSelect } from "@/components/searchable-select";
import { Spinner } from "@/components/ui/spinner";
import {
  BIGGEST_BLOCKER_OPTIONS,
  BRANCHES,
  careerGoalsForTrack,
  CODING_LEVEL_LABELS,
  COMPANY_TYPE_OPTIONS,
  createInitialForm,
  DOMAINS,
  ENGLISH_LEVEL_LABELS,
  GRADUATION_YEARS,
  HAS_PROJECTS_OPTIONS,
  INTERVIEW_EXPERIENCE_OPTIONS,
  INTERVIEW_LANGUAGE_OPTIONS,
  JOB_SEARCH_CHANNEL_OPTIONS,
  JOB_SEARCH_STATUS,
  JOB_TRACK_OPTIONS,
  jobRolesForTrack,
  JOINING_TIMELINES,
  ONBOARDING_STEPS,
  OTHER_VALUE,
  QUALIFICATIONS,
  suggestJobTrackFromBranch,
  STUDENT_STATUS_OPTIONS,
  WEEKLY_HOURS_OPTIONS,
  type JobTrack,
  type OnboardingFormData,
} from "@/types/onboarding";
import { WORK_EXPERIENCE_OPTIONS } from "@/lib/experience-segment";

type Props = {
  defaultName: string;
  /** When true, pre-fill the form with the user's saved profile for editing. */
  editMode?: boolean;
};

const inputClass = "field-input";
const labelClass = "text-sm font-semibold text-foreground";
const hintClass = "text-xs text-muted";

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className={labelClass}>{label}</label>
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  );
}

function LevelSlider({
  label,
  hint,
  value,
  labels,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  labels: readonly string[];
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <FieldLabel label={label} hint={hint} />
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-gold"
      />
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{labels[0]}</span>
        <span className="font-semibold text-gold">{labels[value - 1]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

function choiceFilled(selected: string, custom: string): boolean {
  if (!selected) return false;
  if (selected === OTHER_VALUE) return custom.trim().length >= 2;
  return true;
}

function canProceed(step: number, form: OnboardingFormData): boolean {
  switch (step) {
    case 0:
      return (
        form.fullName.trim().length > 0 &&
        Boolean(form.workExperience) &&
        Boolean(form.studentStatus)
      );
    case 1:
      return (
        choiceFilled(form.qualification, form.qualificationOther) &&
        choiceFilled(form.branch, form.branchOther) &&
        Boolean(form.graduationYear)
      );
    case 2:
      return (
        Boolean(form.jobTrack) &&
        Boolean(form.careerPreference) &&
        choiceFilled(form.interestedRole, form.interestedRoleOther) &&
        (form.jobTrack === "non_it" || Boolean(form.preferredCompanyType)) &&
        Boolean(form.jobSearchChannel)
      );
    case 3:
      return Boolean(
        form.hasProjects &&
          form.biggestBlocker &&
          form.interviewExperience &&
          form.interviewLanguage,
      );
    case 4:
      return Boolean(form.weeklyHours && form.jobSearchStatus && form.joiningTimeline);
    default:
      return false;
  }
}

export function OnboardingForm({ defaultName, editMode = false }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingFormData>(() => createInitialForm(defaultName));
  const [isSaving, setIsSaving] = useState(false);
  const [prefilling, setPrefilling] = useState(editMode);
  const [error, setError] = useState("");
  const stepTopRef = useRef<HTMLDivElement>(null);
  const isFirstStepRender = useRef(true);

  useEffect(() => {
    if (!editMode) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const json = (await res.json()) as { profile?: EditableProfile | null };
        if (active && json.profile) {
          setForm(mapProfileToOnboardingForm(json.profile, defaultName));
        }
      } catch {
        /* keep blank form if prefill fails */
      } finally {
        if (active) setPrefilling(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [editMode, defaultName]);

  useEffect(() => {
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }
    stepTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const totalSteps = ONBOARDING_STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;
  const current = ONBOARDING_STEPS[step];

  useEffect(() => {
    if (step === 2 && !form.jobTrack) {
      setForm((prev) => ({
        ...prev,
        jobTrack: suggestJobTrackFromBranch(prev.branch, prev.branchOther),
      }));
    }
  }, [step, form.jobTrack, form.branch, form.branchOther]);

  const update = <K extends keyof OnboardingFormData>(key: K, value: OnboardingFormData[K]) => {
    setForm((prev) => {
      let next = { ...prev, [key]: value };

      if (key === "jobTrack") {
        next = {
          ...next,
          careerPreference: "",
          interestedRole: "",
          interestedRoleOther: "",
          targetDomain: "",
          targetDomainOther: "",
          preferredCompanyType: "",
        };
      }

      if (key === "careerPreference" && value === "switch_to_it") {
        next = {
          ...next,
          jobTrack: "it" as JobTrack,
          careerPreference: "switch_to_it",
          interestedRole: "",
          interestedRoleOther: "",
          targetDomain: "",
          targetDomainOther: "",
          preferredCompanyType: "",
        };
      }

      if (key === "workExperience") {
        const track = (next.jobTrack || "it") as JobTrack;
        const allowed = careerGoalsForTrack(track, String(value)).map((g) => g.id);
        if (next.careerPreference && !allowed.includes(next.careerPreference as (typeof allowed)[number])) {
          next.careerPreference = "";
        }
      }
      return next;
    });
  };

  const save = async () => {
    setIsSaving(true);
    setError("");
    try {
      const payload = mapOnboardingToProfile(form);
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Failed to save profile.");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const next = () => {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
      return;
    }
    void save();
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="grid gap-5">
            <div>
              <FieldLabel label="Full name" hint="Pre-filled from your Google account." />
              <input
                className={inputClass}
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
              />
            </div>
            <div>
              <FieldLabel label="City (optional)" hint="Helps tailor location and relocation advice." />
              <input
                className={inputClass}
                placeholder="e.g., Bangalore"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              />
            </div>
            <div>
              <FieldLabel
                label="Where are you in your college journey?"
                hint="Helps us calibrate advice for placements vs off-campus search."
              />
              <div className="mt-2 grid gap-2">
                {STUDENT_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("studentStatus", opt.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      form.studentStatus === opt.id
                        ? "border-gold/50 bg-gold/10 ring-2 ring-gold/25"
                        : "inner-card hover:border-gold/30 hover:bg-gold/5"
                    }`}
                  >
                    <p className="font-semibold">{opt.label}</p>
                    <p className="mt-0.5 text-xs text-muted">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel
                label="Professional work experience"
                hint="Be honest — freshers and job-switchers get different coaching paths."
              />
              <div className="mt-2 grid gap-2">
                {WORK_EXPERIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("workExperience", opt.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      form.workExperience === opt.id
                        ? "border-gold/50 bg-gold/10 ring-2 ring-gold/25"
                        : "inner-card hover:border-gold/30 hover:bg-gold/5"
                    }`}
                  >
                    <p className="font-semibold">{opt.label}</p>
                    <p className="mt-0.5 text-xs text-muted">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="grid gap-5">
            <SearchableSelect
              label="Highest qualification"
              hint="Search if you don't see yours — or pick Other."
              value={form.qualification}
              otherValue={form.qualificationOther}
              onChange={(v) => update("qualification", v)}
              onOtherChange={(v) => update("qualificationOther", v)}
              options={QUALIFICATIONS}
              otherFieldName="qualification"
              placeholder="Search qualification…"
            />
            <SearchableSelect
              label="Branch / field of study"
              hint="Engineering, commerce, design, etc."
              value={form.branch}
              otherValue={form.branchOther}
              onChange={(v) => update("branch", v)}
              onOtherChange={(v) => update("branchOther", v)}
              options={BRANCHES}
              otherFieldName="branch"
              placeholder="Search branch…"
            />
            <div>
              <FieldLabel label="When did/will you graduate?" hint="Approximate is fine." />
              <select
                className={inputClass}
                value={form.graduationYear}
                onChange={(e) => update("graduationYear", e.target.value)}
              >
                <option value="">Select year</option>
                {GRADUATION_YEARS.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 2: {
        const track = form.jobTrack as JobTrack;
        const isIt = track === "it";
        const goals = track ? careerGoalsForTrack(track, form.workExperience) : [];
        const roles = track ? jobRolesForTrack(track) : [];

        return (
          <div className="grid gap-5">
            <div>
              <FieldLabel
                label="What kind of job are you preparing for?"
                hint="We’ll show the right roles and goals. You can change this anytime."
              />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {JOB_TRACK_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("jobTrack", opt.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      form.jobTrack === opt.id
                        ? "border-gold/50 bg-gold/10 ring-2 ring-gold/25"
                        : "inner-card hover:border-gold/30 hover:bg-gold/5"
                    }`}
                  >
                    <p className="font-semibold">{opt.label}</p>
                    <p className="mt-0.5 text-xs text-muted">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {track && (
              <>
                <div>
                  <FieldLabel
                    label="What's your main goal right now?"
                    hint={
                      isIt
                        ? "Choose the one that best matches your situation today."
                        : "Pick your priority — select “Switch into IT” if you’re moving to software roles."
                    }
                  />
                  <div className="mt-2 grid gap-2">
                    {goals.map((goal) => (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => update("careerPreference", goal.id)}
                        className={`rounded-xl border p-3 text-left transition ${
                          form.careerPreference === goal.id
                        ? "border-gold/50 bg-gold/10 ring-2 ring-gold/25"
                        : "inner-card hover:border-gold/30 hover:bg-gold/5"
                        }`}
                      >
                        <p className="font-semibold">{goal.label}</p>
                        <p className="mt-0.5 text-xs text-muted">{goal.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <SearchableSelect
                  label={isIt ? "Which IT role are you targeting?" : "Which role or field are you targeting?"}
                  hint={
                    isIt
                      ? "One primary role — e.g. Frontend Developer, Data Analyst, QA Tester."
                      : "Finance, HR, core engineering, banking, etc. — or pick “Not sure”."
                  }
                  value={form.interestedRole}
                  otherValue={form.interestedRoleOther}
                  onChange={(v) => update("interestedRole", v)}
                  onOtherChange={(v) => update("interestedRoleOther", v)}
                  options={roles}
                  otherFieldName="job role"
                  placeholder="Search role…"
                />

                {isIt && (
                  <SearchableSelect
                    label="Which skill area do you want to grow in? (optional)"
                    hint="Skip if unsure — we’ll infer from your target role."
                    value={form.targetDomain}
                    otherValue={form.targetDomainOther}
                    onChange={(v) => update("targetDomain", v)}
                    onOtherChange={(v) => update("targetDomainOther", v)}
                    options={DOMAINS}
                    otherFieldName="domain"
                    placeholder="Search domain…"
                  />
                )}

                {isIt && (
                  <div>
                    <FieldLabel
                      label="What type of company do you prefer?"
                      hint="No wrong answer — we'll tailor application strategy and salary expectations."
                    />
                    <div className="mt-2 grid gap-2">
                      {COMPANY_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => update("preferredCompanyType", opt.id)}
                          className={`rounded-xl border p-3 text-left transition ${
                            form.preferredCompanyType === opt.id
                        ? "border-gold/50 bg-gold/10 ring-2 ring-gold/25"
                        : "inner-card hover:border-gold/30 hover:bg-gold/5"
                          }`}
                        >
                          <p className="font-semibold">{opt.label}</p>
                          <p className="mt-0.5 text-xs text-muted">{opt.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <FieldLabel
                    label="How will you mainly search for jobs?"
                    hint="Campus vs off-campus changes prep focus and timeline."
                  />
                  <div className="mt-2 grid gap-2">
                    {JOB_SEARCH_CHANNEL_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => update("jobSearchChannel", opt.id)}
                        className={`rounded-xl border p-3 text-left transition ${
                          form.jobSearchChannel === opt.id
                        ? "border-gold/50 bg-gold/10 ring-2 ring-gold/25"
                        : "inner-card hover:border-gold/30 hover:bg-gold/5"
                        }`}
                      >
                        <p className="font-semibold">{opt.label}</p>
                        <p className="mt-0.5 text-xs text-muted">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      }

      case 3:
        return (
          <div className="grid gap-6">
            <LevelSlider
              label="How strong are your coding / technical skills?"
              hint="1 = just started tutorials · 5 = can build and explain projects independently"
              value={form.codingLevel}
              labels={CODING_LEVEL_LABELS}
              onChange={(v) => update("codingLevel", v)}
            />
            <LevelSlider
              label="How confident is your English in interviews?"
              hint="Be honest — we adjust communication coaching to your level."
              value={form.englishLevel}
              labels={ENGLISH_LEVEL_LABELS}
              onChange={(v) => update("englishLevel", v)}
            />
            <div>
              <FieldLabel
                label="Which language do you use in interviews?"
                hint="Mock interviews and HR answers will match your comfort level."
              />
              <div className="mt-2 grid gap-2">
                {INTERVIEW_LANGUAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("interviewLanguage", opt.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      form.interviewLanguage === opt.id
                        ? "border-gold/50 bg-gold/10 ring-2 ring-gold/25"
                        : "inner-card hover:border-gold/30 hover:bg-gold/5"
                    }`}
                  >
                    <p className="font-semibold">{opt.label}</p>
                    <p className="mt-0.5 text-xs text-muted">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel
                label="Do you have projects for your resume?"
                hint="GitHub links, college builds, or personal apps all count."
              />
              <div className="mt-2 flex flex-col gap-2">
                {HAS_PROJECTS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("hasProjects", opt.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                      form.hasProjects === opt.id
                        ? "border-gold/50 bg-gold/10 ring-2 ring-gold/25"
                        : "inner-card hover:border-gold/30 hover:bg-gold/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel
                label="What's your biggest challenge right now?"
                hint="We'll prioritize this in your roadmap and HR coaching."
              />
              <div className="mt-2 grid gap-2">
                {BIGGEST_BLOCKER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("biggestBlocker", opt.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      form.biggestBlocker === opt.id
                        ? "border-gold/50 bg-gold/10 ring-2 ring-gold/25"
                        : "inner-card hover:border-gold/30 hover:bg-gold/5"
                    }`}
                  >
                    <p className="font-semibold">{opt.label}</p>
                    <p className="mt-0.5 text-xs text-muted">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel label="Have you attended job interviews before?" />
              <div className="mt-2 grid gap-2">
                {INTERVIEW_EXPERIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("interviewExperience", opt.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                      form.interviewExperience === opt.id
                        ? "border-gold/50 bg-gold/10 ring-2 ring-gold/25"
                        : "inner-card hover:border-gold/30 hover:bg-gold/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="grid gap-5">
            <div>
              <FieldLabel
                label="How many hours per week can you spend on job prep?"
                hint="Include learning, projects, and interview practice — realistic beats optimistic."
              />
              <div className="mt-2 grid gap-2">
                {WEEKLY_HOURS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("weeklyHours", opt.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      form.weeklyHours === opt.id
                        ? "border-gold/50 bg-gold/10 ring-2 ring-gold/25"
                        : "inner-card hover:border-gold/30 hover:bg-gold/5"
                    }`}
                  >
                    <p className="font-semibold">{opt.label}</p>
                    <p className="mt-0.5 text-xs text-muted">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel label="Where are you with job applications?" />
              <div className="mt-2 grid gap-2">
                {JOB_SEARCH_STATUS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update("jobSearchStatus", opt.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                      form.jobSearchStatus === opt.id
                        ? "border-gold/50 bg-gold/10 ring-2 ring-gold/25"
                        : "inner-card hover:border-gold/30 hover:bg-gold/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel
                label="When would you be ready to join if you get an offer?"
                hint="This is your preference — actual timing depends on hiring companies."
              />
              <select
                className={inputClass}
                value={form.joiningTimeline}
                onChange={(e) => update("joiningTimeline", e.target.value)}
              >
                <option value="">Select timeline</option>
                {JOINING_TIMELINES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (prefilling) {
    return (
      <div className="mt-8 flex items-center gap-3 text-sm text-muted">
        <Spinner label="Loading your saved answers…" />
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div ref={stepTopRef} className="scroll-mt-8 mb-6">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
          <span>
            Step {step + 1} of {totalSteps}
          </span>
          <span>~{Math.max(1, totalSteps - step)} min left</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-champagne shimmer transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{current.title}</h2>
        <p className="mt-1 text-sm text-muted">{current.hint}</p>
      </div>

      {renderStep()}

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={isSaving}
            className="rounded-xl border border-gold/30 bg-surface-elevated/60 px-5 py-3 font-semibold text-champagne transition hover:bg-gold/10 disabled:opacity-60"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={next}
          disabled={isSaving || !canProceed(step, form)}
          className="btn-lux press flex-1 rounded-xl px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <Spinner onLux label="Saving…" />
          ) : step === totalSteps - 1 ? (
            editMode ? "Save changes" : "Go to my dashboard"
          ) : (
            "Next"
          )}
        </button>
      </div>

      {error && <p className="mt-3 rounded-xl bg-urgency/10 p-3 text-sm text-urgency">{error}</p>}
    </div>
  );
}
