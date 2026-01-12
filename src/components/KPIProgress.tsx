interface KPIProgressProps {
  name: string;
  value: number;
  target: number | null;
  unit?: string | null;
  showLabel?: boolean;
  className?: string;
}

export default function KPIProgress({
  name,
  value,
  target,
  unit = null,
  showLabel = true,
  className = "",
}: KPIProgressProps) {
  // Calculate percentage if target exists
  // Clamp value to target for progress bar semantics (can't exceed 100%)
  const clampedValue = target && target > 0 ? Math.min(value, target) : value;
  const percentage = target && target > 0 ? (clampedValue / target) * 100 : null;
  const displayValue = value.toFixed(2).replace(/\.?0+$/, ""); // Remove trailing zeros
  const displayTarget = target ? target.toFixed(2).replace(/\.?0+$/, "") : null;
  const unitText = unit ? ` ${unit}` : "";

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-text-primary">{name}</span>
          <span className="text-text-secondary">
            {displayValue}
            {unitText}
            {displayTarget && ` / ${displayTarget}${unitText}`}
            {target && value > target && (
              <span className="ml-1 text-xs text-text-muted" aria-label="Target exceeded">
                (exceeded)
              </span>
            )}
          </span>
        </div>
      )}

      {/* Progress Bar */}
      {target && target > 0 ? (
        <div className="relative">
          <div
            role="progressbar"
            aria-valuenow={clampedValue}
            aria-valuemin={0}
            aria-valuemax={target}
            aria-label={`${name}: ${displayValue}${unitText}${target && value > target ? " (exceeded)" : ""} out of ${displayTarget}${unitText}`}
            className="h-2 overflow-hidden rounded-full bg-background"
          >
            <div
              className="h-full bg-text-primary transition-all duration-300 ease-in-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          {percentage !== null && (
            <span className="sr-only">
              {percentage >= 100 ? "Complete" : `${percentage.toFixed(0)}% complete`} ({displayValue}
              {unitText} of {displayTarget}
              {unitText})
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center text-sm text-text-muted">
          <span>
            Current: {displayValue}
            {unitText}
            {target === null && " (no target set)"}
          </span>
        </div>
      )}
    </div>
  );
}
