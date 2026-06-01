const stats = [
  { value: "4,200+", label: "mock interviews practiced" },
  { value: "89%", label: "freshers improved confidence" },
  { value: "Phased", label: "roadmap at your pace" },
];

export function TrustIndicators() {
  return (
    <div className="lux-card rounded-2xl px-5 py-5 md:px-7">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`text-center sm:text-left ${i > 0 ? "sm:border-l sm:border-gold/15 sm:pl-5" : ""}`}
          >
            <p className="font-display text-xl font-semibold text-gold-gradient md:text-2xl">{stat.value}</p>
            <p className="mt-0.5 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
