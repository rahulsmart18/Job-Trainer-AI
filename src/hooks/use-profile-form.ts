"use client";

import { useEffect, useState } from "react";
import { profileToRoadmapForm } from "@/lib/profile-mapper";

type RoadmapForm = {
  degree: string;
  skillLevel: string;
  interestedRole: string;
  targetDomain: string;
  careerPreference: string;
};

const emptyForm: RoadmapForm = {
  degree: "",
  skillLevel: "",
  interestedRole: "",
  targetDomain: "",
  careerPreference: "",
};

type ProfileResponse = {
  degree?: string;
  skillLevel?: string;
  interestedRole?: string;
  targetDomain?: string;
  careerPreference?: string;
  onboardingComplete?: boolean;
};

export function useProfileForm() {
  const [form, setForm] = useState<RoadmapForm>(emptyForm);
  const [loaded, setLoaded] = useState(false);
  const [fromOnboarding, setFromOnboarding] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/profile");
        const json = (await response.json()) as { profile?: ProfileResponse | null };

        if (response.ok && json.profile) {
          const p = json.profile;
          setForm(
            profileToRoadmapForm({
              degree: p.degree,
              skill_level: p.skillLevel,
              interested_role: p.interestedRole,
              target_domain: p.targetDomain,
              career_preference: p.careerPreference,
            }),
          );
          setFromOnboarding(Boolean(p.onboardingComplete && p.degree));
        }
      } finally {
        setLoaded(true);
      }
    };
    void load();
  }, []);

  return { form, setForm, loaded, fromOnboarding };
}
