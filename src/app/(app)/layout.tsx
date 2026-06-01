import { AppNav } from "@/components/app-nav";
import { RouteTransition } from "@/components/route-transition";
import { getNavInfo } from "@/lib/app-data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const nav = await getNavInfo();

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <AppNav userName={nav.userName} paid={nav.paid} unlockedFeatures={nav.unlockedFeatures} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-5 sm:py-8 md:px-8 md:py-10">
          <RouteTransition>{children}</RouteTransition>
        </div>
      </main>
    </div>
  );
}
