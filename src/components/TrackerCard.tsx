interface TrackerCardProps {
  name: string;
  value: number;
  target: number | null;
  unit?: string | null;
  className?: string;
}

export default function TrackerCard({
  name,
  value,
  target,
  unit = null,
  className = "",
}: TrackerCardProps) {
  // Calculate percentage if target exists
  const clampedValue = target && target > 0 ? Math.min(value, target) : value;
  const percentage = target && target > 0 ? (clampedValue / target) * 100 : null;
  const displayValue = value.toFixed(2).replace(/\.?0+$/, ""); // Remove trailing zeros
  const displayTarget = target ? target.toFixed(2).replace(/\.?0+$/, "") : null;
  const unitText = unit ? ` ${unit}` : "";

  return (
    <div
      className={`rounded-card bg-background-card border border-border p-4 transition-shadow hover:border-text-secondary/50 ${className}`}
    >
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-text-primary">{name}</h3>
      </div>

      {/* Value Display */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-text-primary">
            {displayValue}
            {unitText}
          </span>
          {displayTarget && (
            <span className="text-sm text-text-muted">
              / {displayTarget}
              {unitText}
            </span>
          )}
          {target && value > target && (
            <span
              className="ml-1 text-xs text-text-muted"
              aria-label="Target exceeded"
            >
              (exceeded)
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {target && target > 0 ? (
        <div className="space-y-1">
          <div
            role="progressbar"
            aria-valuenow={clampedValue}
            aria-valuemin={0}
            aria-valuemax={target}
            aria-label={`${name}: ${displayValue}${unitText}${
              target && value > target ? " (exceeded)" : ""
            } out of ${displayTarget}${unitText}`}
            className="h-2 overflow-hidden rounded-full bg-background"
          >
            <div
              className="h-full bg-text-primary transition-all duration-300 ease-in-out"
              style={{ width: `${Math.min(percentage || 0, 100)}%` }}
            />
          </div>
          {percentage !== null && (
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span className="sr-only">
                {percentage >= 100
                  ? "Complete"
                  : `${percentage.toFixed(0)}% complete`}{" "}
                ({displayValue}
                {unitText} of {displayTarget}
                {unitText})
              </span>
              <span aria-hidden="true">{percentage.toFixed(0)}%</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-text-muted">
          <span>No target set</span>
        </div>
      )}
    </div>
  );
}
