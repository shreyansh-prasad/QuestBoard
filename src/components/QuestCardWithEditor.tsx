"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import KPIEditor from "./KPIEditor";

interface Quest {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  created_at: string;
  kpis?: Array<{
    id: string;
    name: string;
    value: number;
    target: number | null;
    unit: string | null;
  }>;
}

interface QuestCardWithEditorProps {
  quest: Quest;
  isEditable?: boolean;
}

interface NewKPI {
  id: string;
  name: string;
  value: string;
  target: string;
  unit: string;
}

export default function QuestCardWithEditor({
  quest,
  isEditable = false,
}: QuestCardWithEditorProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(quest.progress);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingKPIs, setIsCreatingKPIs] = useState(false);
  const [newKPIs, setNewKPIs] = useState<NewKPI[]>([
    { id: "1", name: "", value: "0", target: "", unit: "" },
  ]);
  const [editData, setEditData] = useState({
    title: quest.title,
    description: quest.description || "",
    status: quest.status,
  });

  // Sync progress with prop changes
  useEffect(() => {
    setProgress(quest.progress);
  }, [quest.progress]);

  // Sync edit data with quest changes
  useEffect(() => {
    setEditData({
      title: quest.title,
      description: quest.description || "",
      status: quest.status,
    });
  }, [quest]);

  const handleKPIUpdate = (newValue: number, newProgress?: number) => {
    if (newProgress !== undefined) {
      setProgress(newProgress);
    }
  };

  const handleEdit = async () => {
    setError(null);
    setIsEditing(true);
    // Initialize new KPIs if quest has no KPIs
    if (!quest.kpis || quest.kpis.length === 0) {
      setNewKPIs([{ id: "1", name: "", value: "0", target: "", unit: "" }]);
    }
  };

  const handleSaveEdit = async () => {
    setError(null);

    if (!editData.title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      const response = await fetch(`/api/quests/${quest.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: editData.title.trim(),
          description: editData.description.trim() || null,
          status: editData.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update quest");
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating quest:", error);
      setError(error instanceof Error ? error.message : "Failed to update quest");
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      title: quest.title,
      description: quest.description || "",
      status: quest.status,
    });
    setError(null);
    setIsEditing(false);
    setNewKPIs([{ id: "1", name: "", value: "0", target: "", unit: "" }]);
    setIsCreatingKPIs(false);
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/quests/${quest.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete quest");
      }

      router.refresh();
    } catch (error) {
      console.error("Error deleting quest:", error);
      setError(error instanceof Error ? error.message : "Failed to delete quest");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setError(null);
  };

  const addNewKPIField = () => {
    setNewKPIs([
      ...newKPIs,
      {
        id: Date.now().toString(),
        name: "",
        value: "0",
        target: "",
        unit: "",
      },
    ]);
  };

  const removeNewKPIField = (id: string) => {
    if (newKPIs.length > 1) {
      setNewKPIs(newKPIs.filter((kpi) => kpi.id !== id));
    }
  };

  const updateNewKPI = (id: string, field: keyof NewKPI, value: string) => {
    setNewKPIs(
      newKPIs.map((kpi) => (kpi.id === id ? { ...kpi, [field]: value } : kpi))
    );
  };

  const handleCreateKPIs = async () => {
    setError(null);

    // Validate at least one KPI has a name
    const validKPIs = newKPIs.filter((kpi) => kpi.name.trim());
    if (validKPIs.length === 0) {
      setError("At least one KPI with a name is required");
      return;
    }

    setIsCreatingKPIs(true);

    try {
      const kpisData = validKPIs.map((kpi) => ({
        name: kpi.name.trim(),
        value: kpi.value ? parseFloat(kpi.value) : 0,
        target: kpi.target ? parseFloat(kpi.target) : null,
        unit: kpi.unit.trim() || null,
      }));

      const response = await fetch(`/api/quests/${quest.id}/kpis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ kpis: kpisData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create KPIs");
      }

      // Update progress if provided
      if (data.progress !== undefined) {
        setProgress(data.progress);
      }

      // Reset form and refresh
      setNewKPIs([{ id: "1", name: "", value: "0", target: "", unit: "" }]);
      setIsCreatingKPIs(false);
      router.refresh();
    } catch (error) {
      console.error("Error creating KPIs:", error);
      setError(error instanceof Error ? error.message : "Failed to create KPIs");
      setIsCreatingKPIs(false);
    }
  };

  const hasKPIs = quest.kpis && quest.kpis.length > 0;
  const showKPICreation = isEditing && isEditable && !hasKPIs;

  return (
    <div className="rounded-card bg-background-card border border-border p-6">
      {/* Header with title and actions */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="w-full rounded border border-border bg-background px-2 py-1 text-lg font-semibold text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary"
              placeholder="Quest title"
              autoFocus
            />
          ) : (
            <h3 className="text-lg font-semibold text-text-primary">
              {quest.title}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  quest.status === "completed"
                    ? "bg-green-500/20 text-green-400"
                    : quest.status === "active"
                    ? "bg-blue-500/20 text-blue-400"
                    : quest.status === "paused"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {quest.status}
              </span>
              {isEditable && (
                <>
                  <button
                    onClick={handleEdit}
                    className="rounded px-2 py-1 text-xs font-medium text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
                    title="Edit quest"
                    aria-label="Edit quest"
                  >
                    ✏️
                  </button>
                  {!showDeleteConfirm ? (
                    <button
                      onClick={handleDelete}
                      className="rounded px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Delete quest"
                      aria-label="Delete quest"
                    >
                      🗑️
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="rounded px-2 py-1 text-xs font-medium text-red-400 bg-red-500/20 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Confirm delete"
                        aria-label="Confirm delete"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelDelete}
                        disabled={isDeleting}
                        className="rounded px-2 py-1 text-xs font-medium text-text-secondary hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Cancel delete"
                        aria-label="Cancel delete"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {isEditing ? (
        <div className="mb-3">
          <textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary"
            placeholder="Quest description (optional)"
            rows={3}
          />
        </div>
      ) : (
        quest.description && (
          <p className="mb-3 text-sm text-text-secondary">
            {quest.description}
          </p>
        )
      )}

      {/* Status (when editing) */}
      {isEditing && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Status
          </label>
          <select
            value={editData.status}
            onChange={(e) => setEditData({ ...editData, status: e.target.value })}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary"
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      )}

      {/* Edit actions */}
      {isEditing && (
        <div className="mb-3 flex gap-2">
          <button
            onClick={handleSaveEdit}
            className="rounded px-3 py-1.5 text-sm font-medium text-green-400 bg-green-500/20 hover:bg-green-500/30 transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleCancelEdit}
            className="rounded px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-background transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-3 rounded border border-red-500/50 bg-red-500/10 p-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-background">
          <div
            className="h-full bg-text-primary transition-all"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-3 border-t border-border pt-3">
        {hasKPIs ? (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
              Key Performance Indicators
            </h4>
            {isEditable ? (
              // Editable KPIs with +/- buttons
              quest.kpis!.map((kpi) => (
                <KPIEditor
                  key={kpi.id}
                  kpi={{
                    id: kpi.id,
                    name: kpi.name,
                    value: Number(kpi.value) || 0,
                    target: kpi.target != null ? Number(kpi.target) : null,
                    unit: kpi.unit,
                  }}
                  onUpdate={handleKPIUpdate}
                />
              ))
            ) : (
              // Read-only KPIs
              quest.kpis!.map((kpi) => (
                <div
                  key={kpi.id}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <span className="text-text-muted font-medium">{kpi.name}:</span>
                  <span className="text-text-secondary font-semibold">
                    {Number(kpi.value) || 0} {kpi.unit || ""}
                    {kpi.target != null && ` / ${Number(kpi.target)}${kpi.unit || ""}`}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : showKPICreation ? (
          // KPI Creation Form (when editing and no KPIs exist)
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                Create Key Performance Indicators
              </h4>
            </div>
            <div className="space-y-3">
              {newKPIs.map((kpi, index) => (
                <div
                  key={kpi.id}
                  className="rounded border border-border bg-background p-3 space-y-2"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-text-muted">
                      KPI {index + 1}
                    </span>
                    {newKPIs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeNewKPIField(kpi.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={kpi.name}
                        onChange={(e) => updateNewKPI(kpi.id, "name", e.target.value)}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-text-primary focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary"
                        placeholder="e.g., Study Hours"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={kpi.unit}
                        onChange={(e) => updateNewKPI(kpi.id, "unit", e.target.value)}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-text-primary focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary"
                        placeholder="e.g., hours"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">
                        Current Value
                      </label>
                      <input
                        type="number"
                        value={kpi.value}
                        onChange={(e) => updateNewKPI(kpi.id, "value", e.target.value)}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-text-primary focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary"
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">
                        Target
                      </label>
                      <input
                        type="number"
                        value={kpi.target}
                        onChange={(e) => updateNewKPI(kpi.id, "target", e.target.value)}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-text-primary focus:border-text-secondary focus:outline-none focus:ring-1 focus:ring-text-secondary"
                        placeholder="Optional"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addNewKPIField}
                className="rounded px-3 py-1.5 text-xs font-medium text-text-secondary border border-border bg-background hover:bg-background-card transition-colors"
              >
                + Add Another KPI
              </button>
              <button
                type="button"
                onClick={handleCreateKPIs}
                disabled={isCreatingKPIs}
                className="rounded px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/20 hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingKPIs ? "Creating..." : "Create KPIs"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-text-muted">
              {isEditable
                ? "No KPIs yet. Click Edit to add KPIs."
                : "No KPIs defined for this quest."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
