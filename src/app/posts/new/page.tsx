"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

interface Quest {
  id: string;
  title: string;
  status: string;
}

interface QuestKPI {
  questId: string;
  questTitle: string;
  kpiId: string;
  kpiName: string;
  unit: string | null;
}

interface KPIUpdate {
  kpiId: string;
  questId: string;
  value: number;
}

interface FormErrors {
  title?: string;
  content?: string;
  kpiUpdates?: string;
  general?: string;
}

export default function NewPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingQuests, setLoadingQuests] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [quests, setQuests] = useState<Quest[]>([]);
  const [allKPIs, setAllKPIs] = useState<QuestKPI[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    published: false,
    questId: "",
    kpiUpdates: [] as KPIUpdate[],
  });

  useEffect(() => {
    loadUserQuests();
  }, []);

  const loadUserQuests = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/auth/login");
        return;
      }

      // Get user's profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        // Check if table doesn't exist
        if (profileError.code === 'PGRST205' || profileError.message?.includes('schema cache')) {
          setErrors({ 
            general: "Database tables not found. Please run migrations first. See README.md section 'Database Setup' for instructions." 
          });
        } else {
          setErrors({ general: "Error loading profile. Please try again." });
        }
        setLoadingQuests(false);
        return;
      }

      if (!profile) {
        setErrors({ 
          general: "Profile not found. Please complete your profile setup first. Click here to create your profile.",
        });
        // Redirect to signup since profile doesn't exist
        setTimeout(() => {
          router.push("/auth/signup");
        }, 3000);
        setLoadingQuests(false);
        return;
      }

      // Fetch user's active quests
      const { data: userQuests, error: questsError } = await supabase
        .from("quests")
        .select("id, title, status")
        .eq("profile_id", profile.id)
        .in("status", ["active", "paused"])
        .order("created_at", { ascending: false });

      if (questsError) {
        console.error("Error loading quests:", questsError);
        setLoadingQuests(false);
        return;
      }

      setQuests(userQuests || []);

      // Load KPIs for all quests
      if (userQuests && userQuests.length > 0) {
        const kpiList: QuestKPI[] = [];
        await Promise.all(
          userQuests.map(async (quest) => {
            const { data: kpis } = await supabase
              .from("kpis")
              .select("id, name, unit")
              .eq("quest_id", quest.id);

            if (kpis && kpis.length > 0) {
              kpis.forEach((kpi) => {
                kpiList.push({
                  questId: quest.id,
                  questTitle: quest.title,
                  kpiId: kpi.id,
                  kpiName: kpi.name,
                  unit: kpi.unit,
                });
              });
            }
          })
        );
        setAllKPIs(kpiList);
      }

      setLoadingQuests(false);
    } catch (error) {
      console.error("Error loading quests:", error);
      setLoadingQuests(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.trim().length > 200) {
      newErrors.title = "Title must be less than 200 characters";
    }

    if (!formData.content.trim()) {
      newErrors.content = "Content is required";
    }

    // Validate KPI updates
    for (const update of formData.kpiUpdates) {
      if (update.value <= 0 || isNaN(update.value)) {
        newErrors.kpiUpdates = "All KPI values must be positive numbers";
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleQuestChange = (questId: string) => {
    setFormData((prev) => ({ ...prev, questId }));
  };

  const addKPIUpdate = () => {
    if (allKPIs.length === 0) return;
    
    setFormData((prev) => ({
      ...prev,
      kpiUpdates: [
        ...prev.kpiUpdates,
        {
          kpiId: allKPIs[0].kpiId,
          questId: allKPIs[0].questId,
          value: 0,
        },
      ],
    }));
  };

  const removeKPIUpdate = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      kpiUpdates: prev.kpiUpdates.filter((_, i) => i !== index),
    }));
  };

  const updateKPIUpdate = (index: number, field: "kpiId" | "value", value: string | number) => {
    setFormData((prev) => {
      const newUpdates = [...prev.kpiUpdates];
      if (field === "kpiId") {
        const selectedKPI = allKPIs.find((k) => k.kpiId === value);
        if (selectedKPI) {
          newUpdates[index] = {
            ...newUpdates[index],
            kpiId: selectedKPI.kpiId,
            questId: selectedKPI.questId,
          };
        }
      } else {
        newUpdates[index] = {
          ...newUpdates[index],
          value: typeof value === "number" ? value : parseFloat(value) || 0,
        };
      }
      return { ...prev, kpiUpdates: newUpdates };
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setErrors({ general: "You must be logged in to create a post" });
        setLoading(false);
        router.replace("/auth/login");
        return;
      }

      // Prepare KPI updates array - filter out zero values
      const kpiUpdates = formData.kpiUpdates
        .filter((update) => update.value > 0)
        .map((update) => ({
          kpiId: update.kpiId,
          questId: update.questId,
          valueToAdd: update.value,
        }));

      // Submit to API
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          published: formData.published,
          questId: formData.questId || null,
          kpiUpdates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show detailed error information for debugging
        const errorMessage = data.error || "Failed to create post. Please try again.";
        const errorDetails = data.details ? ` ${data.details}` : "";
        const errorCode = data.code ? ` (Code: ${data.code})` : "";
        
        console.error("Post creation failed:", {
          error: data.error,
          details: data.details,
          code: data.code,
          hint: data.hint,
        });
        
        setErrors({
          general: errorMessage + errorDetails + errorCode,
        });
        setLoading(false);
        return;
      }

      // Redirect to user profile or post page
      if (data.username) {
        window.location.href = `/u/${data.username}`;
      } else {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Post creation error:", error);
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
      setLoading(false);
    }
  };

  // Get KPIs filtered by selected quest if a quest is selected
  const filteredKPIs = formData.questId
    ? allKPIs.filter((kpi) => kpi.questId === formData.questId)
    : allKPIs;

  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">New Post</h1>
          <p className="mt-2 text-text-secondary">
            Share your progress and optionally update your quest KPIs
          </p>
        </div>

        {errors.general && (
          <div
            className="mb-6 rounded-lg border border-red-500 bg-red-500/10 p-4 text-sm text-red-400"
            role="alert"
            aria-live="polite"
          >
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-text-primary"
            >
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              aria-required="true"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "title-error" : undefined}
              maxLength={200}
              className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                errors.title
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-border"
              }`}
              placeholder="Post title..."
            />
            {errors.title && (
              <p
                id="title-error"
                className="mt-1 text-sm text-red-400"
                role="alert"
              >
                {errors.title}
              </p>
            )}
            <p className="mt-1 text-xs text-text-muted">
              {formData.title.length}/200 characters
            </p>
          </div>

          {/* Content (Markdown) */}
          <div>
            <label
              htmlFor="content"
              className="mb-2 block text-sm font-medium text-text-primary"
            >
              Content (Markdown) <span className="text-red-400">*</span>
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              required
              rows={12}
              aria-required="true"
              aria-invalid={!!errors.content}
              aria-describedby={
                errors.content ? "content-error" : undefined
              }
              className={`w-full rounded-lg border bg-background px-4 py-2 font-mono text-sm text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                errors.content
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-border"
              }`}
              placeholder="Write your post content in Markdown...&#10;&#10;Example:&#10;# Heading&#10;&#10;**Bold text** and *italic text*&#10;&#10;- List item 1&#10;- List item 2"
            />
            {errors.content && (
              <p
                id="content-error"
                className="mt-1 text-sm text-red-400"
                role="alert"
              >
                {errors.content}
              </p>
            )}
          </div>

          {/* Link to Quest (Optional) */}
          <div className="rounded-card bg-background-card border border-border p-6">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              Link to Quest (Optional)
            </h2>
            {loadingQuests ? (
              <p className="text-sm text-text-muted">Loading your quests...</p>
            ) : quests.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-text-secondary">
                  You don't have any active quests yet.
                </p>
                <Link
                  href="/quests/new"
                  className="text-sm text-text-primary underline hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background rounded"
                >
                  Create your first quest
                </Link>
              </div>
            ) : (
              <select
                id="questId"
                name="questId"
                value={formData.questId}
                onChange={(e) => handleQuestChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary"
              >
                <option value="">No quest linked</option>
                {quests.map((quest) => (
                  <option key={quest.id} value={quest.id}>
                    {quest.title} ({quest.status})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* KPI Update Fields */}
          <div className="rounded-card bg-background-card border border-border p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Update KPIs (Optional)
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Select your KPIs and enter values to increment them.
                </p>
              </div>
              {allKPIs.length > 0 && (
                <button
                  type="button"
                  onClick={addKPIUpdate}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background-card focus:outline-none focus:ring-2 focus:ring-text-secondary"
                >
                  + Add KPI
                </button>
              )}
            </div>

            {allKPIs.length === 0 ? (
              <div className="rounded-lg border border-border bg-background p-4 text-center">
                <p className="text-sm text-text-secondary">
                  No KPIs available. Create quests with KPIs to track progress.
                </p>
                <Link
                  href="/quests/new"
                  className="mt-2 inline-block text-sm text-text-primary underline hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background rounded"
                >
                  Create a quest
                </Link>
              </div>
            ) : formData.kpiUpdates.length === 0 ? (
              <div className="rounded-lg border border-border bg-background p-4 text-center">
                <p className="text-sm text-text-secondary">
                  Click "Add KPI" to select KPIs and update their values.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.kpiUpdates.map((update, index) => {
                  const selectedKPI = allKPIs.find((k) => k.kpiId === update.kpiId);
                  const availableOptions = filteredKPIs.length > 0 ? filteredKPIs : allKPIs;

                  return (
                    <div
                      key={index}
                      className="grid gap-4 rounded-lg border border-border bg-background p-4 md:grid-cols-3"
                    >
                      <div className="md:col-span-2">
                        <label
                          htmlFor={`kpi-${index}`}
                          className="mb-2 block text-sm font-medium text-text-primary"
                        >
                          Select KPI
                        </label>
                        <select
                          id={`kpi-${index}`}
                          value={update.kpiId}
                          onChange={(e) => updateKPIUpdate(index, "kpiId", e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-4 py-2 text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary"
                        >
                          {availableOptions.map((kpi) => (
                            <option key={kpi.kpiId} value={kpi.kpiId}>
                              {kpi.kpiName} ({kpi.questTitle}){kpi.unit ? ` - ${kpi.unit}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor={`value-${index}`}
                          className="mb-2 block text-sm font-medium text-text-primary"
                        >
                          Value to Add
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            id={`value-${index}`}
                            value={update.value || ""}
                            onChange={(e) =>
                              updateKPIUpdate(index, "value", e.target.value)
                            }
                            step="0.01"
                            min="0"
                            placeholder="0"
                            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary"
                          />
                          <button
                            type="button"
                            onClick={() => removeKPIUpdate(index)}
                            className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-red-400 transition-colors hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500"
                            aria-label="Remove KPI update"
                          >
                            ×
                          </button>
                        </div>
                        {selectedKPI?.unit && (
                          <p className="mt-1 text-xs text-text-muted">
                            Unit: {selectedKPI.unit}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {errors.kpiUpdates && (
                  <p className="text-sm text-red-400" role="alert">
                    {errors.kpiUpdates}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Publish Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-background-card p-4">
            <div className="flex-1">
              <label
                htmlFor="published"
                className="block text-sm font-medium text-text-primary"
              >
                Publish Post
              </label>
              <p className="mt-1 text-xs text-text-muted">
                Published posts will be visible on your profile
              </p>
            </div>
            <input
              type="checkbox"
              id="published"
              name="published"
              checked={formData.published}
              onChange={handleInputChange}
              className="h-5 w-5 rounded border-border bg-background text-text-primary focus:ring-2 focus:ring-text-secondary"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className={`rounded-lg bg-text-primary px-6 py-2 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                loading ? "cursor-wait" : ""
              }`}
              aria-busy={loading}
            >
              {loading ? "Publishing..." : "Publish Post"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="rounded-lg border border-border bg-background-card px-6 py-2 font-medium text-text-primary transition-colors hover:bg-background-card/80 focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}