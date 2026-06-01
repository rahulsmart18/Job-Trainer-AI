import type { FeatureId } from "@/lib/features";

export type NavItem = {
  href: string;
  label: string;
  /** Icon key resolved by the <NavIcon> component. */
  icon: string;
  /** Short beginner-friendly description. */
  desc: string;
  /** Premium feature this page maps to (for PRO hints). Omitted = always free. */
  feature?: FeatureId;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home", desc: "Your overview" },
  { href: "/roadmap", label: "Roadmap", icon: "map", desc: "Step-by-step path", feature: "roadmap" },
  {
    href: "/mock-interview",
    label: "Mock Interview",
    icon: "mic",
    desc: "Practice by voice",
    feature: "mock_interview",
  },
  { href: "/hr-question", label: "HR Questions", icon: "chat", desc: "Answer prep", feature: "hr_scripts" },
  {
    href: "/communication-analysis",
    label: "Communication",
    icon: "wave",
    desc: "Speaking score",
    feature: "communication",
  },
  { href: "/progress", label: "Progress", icon: "chart", desc: "Track your growth" },
  { href: "/settings", label: "Settings", icon: "gear", desc: "Account & plan" },
];

export function navItemByHref(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
