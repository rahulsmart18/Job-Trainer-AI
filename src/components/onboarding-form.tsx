"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  defaultName: string;
};

export function OnboardingForm({ defaultName }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: defaultName,
    degree: "",
    skillLevel: "",
    interestedRole: "",
    targetDomain: "",
    careerPreference: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  return (
    <>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Full name"
          value={form.fullName}
          onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
        />
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Degree (e.g., BTech CSE)"
          value={form.degree}
          onChange={(e) => setForm((prev) => ({ ...prev, degree: e.target.value }))}
        />
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Current skill level (e.g., Intermediate)"
          value={form.skillLevel}
          onChange={(e) => setForm((prev) => ({ ...prev, skillLevel: e.target.value }))}
        />
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Interested role (or Any)"
          value={form.interestedRole}
          onChange={(e) => setForm((prev) => ({ ...prev, interestedRole: e.target.value }))}
        />
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Domain of interest (e.g., Data, Frontend, AI/ML)"
          value={form.targetDomain}
          onChange={(e) => setForm((prev) => ({ ...prev, targetDomain: e.target.value }))}
        />
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Career preference (Same field / Switching to IT / Other)"
          value={form.careerPreference}
          onChange={(e) => setForm((prev) => ({ ...prev, careerPreference: e.target.value }))}
        />
      </div>
      <button
        type="button"
        onClick={save}
        disabled={isSaving}
        className="mt-6 w-full rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-3 text-center font-semibold text-white shadow-lg shadow-primary/30 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save and Continue"}
      </button>
      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </>
  );
}
