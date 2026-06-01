type SpinnerProps = {
  /** Use the dark spinner variant on gold/light buttons. */
  onLux?: boolean;
  className?: string;
  label?: string;
};

/** Accessible inline loading spinner that inherits the current text color. */
export function Spinner({ onLux = false, className = "", label }: SpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`spinner ${onLux ? "spinner-on-lux" : ""} ${className}`}
        role="status"
        aria-label={label ?? "Loading"}
      />
      {label && <span>{label}</span>}
    </span>
  );
}

/** Animated three-dot indicator (e.g. "AI is thinking"). */
export function LoadingDots({ className = "" }: { className?: string }) {
  return (
    <span className={`dots ${className}`} role="status" aria-label="Loading">
      <span />
      <span />
      <span />
    </span>
  );
}
