"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface KPIEditorProps {
  kpi: {
    id: string;
    name: string;
    value: number;
    target: number | null;
    unit: string | null;
  };
  onUpdate?: (newValue: number, newProgress?: number) => void;
  className?: string;
}

export default function KPIEditor({
  kpi,
  onUpdate,
  className = "",
}: KPIEditorProps) {
  const router = useRouter();
  const [value, setValue] = useState(Number(kpi.value) || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with prop changes
  useEffect(() => {
    setValue(Number(kpi.value) || 0);
  }, [kpi.value]);

  const updateKPI = async (operation: "set" | "increment" | "decrement", amount?: number) => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/kpis/${kpi.id}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          value: amount !== undefined ? amount : 1,
          operation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update KPI");
      }

      setValue(Number(data.value) || 0);
      setIsEditing(false);
      setIsUpdating(false);
      
      if (onUpdate) {
        onUpdate(Number(data.value) || 0, data.progress);
      }

      // Refresh the page data without full reload
      router.refresh();
    } catch (error) {
      console.error("Error updating KPI:", error);
      setError(error instanceof Error ? error.message : "Failed to update KPI");
      setIsUpdating(false);
    }
  };

  const handleSetValue = () => {
    const newValue = parseFloat(String(value));
    if (isNaN(newValue) || newValue < 0) {
      setError("Value must be a non-negative number");
      return;
    }
    updateKPI("set", newValue);
  };

  const handleIncrement = () => {
    updateKPI("increment", 1);
  };

  const handleDecrement = () => {
    if (value > 0) {
      updateKPI("decrement", 1);
    }
  };

  const displayValue = value.toFixed(2).replace(/\.?0+$/, "");
  const displayTarget = kpi.target ? Number(kpi.target).toFixed(2).replace(/\.?0+$/, "") : null;
  const unitText = kpi.unit ? ` ${kpi.unit}` : "";

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-muted truncate">
            {kpi.name}:
          </span>
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="number"
                value={value}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setValue(val);
                    setError(null);
                  }
                }}
                min="0"
                step="0.01"
                className="w-24 rounded border border-text-secondary bg-background px-3 py-1.5 text-sm text-text-primary focus:border-text-primary focus:outline-none focus:ring-2 focus:ring-text-secondary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSetValue();
                  } else if (e.key === "Escape") {
                    setValue(Number(kpi.value) || 0);
                    setIsEditing(false);
                    setError(null);
                  }
                }}
              />
              <button
                onClick={handleSetValue}
                disabled={isUpdating}
                className="rounded px-3 py-1.5 text-sm font-medium text-green-400 bg-green-500/20 hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-green-500/30"
                title="Save"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setValue(Number(kpi.value) || 0);
                  setIsEditing(false);
                  setError(null);
                }}
                disabled={isUpdating}
                className="rounded px-3 py-1.5 text-sm font-medium text-red-400 bg-red-500/20 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/30"
                title="Cancel"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDecrement}
                disabled={isUpdating || value <= 0}
                className="rounded px-2 py-1 text-sm font-medium text-text-secondary hover:bg-background hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-border"
                title="Decrement"
                aria-label="Decrement value"
              >
                −
              </button>
              <span
                className="text-sm font-semibold text-text-primary cursor-pointer hover:text-text-secondary transition-colors px-2 py-1 rounded hover:bg-background-card min-w-[60px] text-center"
                onClick={() => setIsEditing(true)}
                title="Click to edit value"
              >
                {displayValue}
                {unitText}
                {displayTarget && (
                  <span className="text-text-muted font-normal"> / {displayTarget}{unitText}</span>
                )}
              </span>
              <button
                onClick={handleIncrement}
                disabled={isUpdating}
                className="rounded px-2 py-1 text-sm font-medium text-text-secondary hover:bg-background hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-border"
                title="Increment"
                aria-label="Increment value"
              >
                +
              </button>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
