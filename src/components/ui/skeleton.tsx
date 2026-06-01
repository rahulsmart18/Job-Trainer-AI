type SkeletonProps = {
  className?: string;
};

/** Shimmering placeholder block used while content loads. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <span className={`skeleton block ${className}`} aria-hidden="true" />;
}

/** A few stacked skeleton lines, handy for text blocks. */
export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className="skeleton block h-3.5"
          style={{ width: i === lines - 1 ? "70%" : "100%" }}
        />
      ))}
    </div>
  );
}

/** A card-shaped skeleton with a title line and body lines. */
export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`inner-card ${className}`} aria-hidden="true">
      <span className="skeleton block h-4 w-1/3" />
      <div className="mt-3 space-y-2">
        <span className="skeleton block h-3" />
        <span className="skeleton block h-3" />
        <span className="skeleton block h-3 w-2/3" />
      </div>
    </div>
  );
}
