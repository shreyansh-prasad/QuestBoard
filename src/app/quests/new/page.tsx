"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface KPI {
  id: string;
  name: string;
  value: string;
  target: string;
  unit: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  kpis?: Record<string, { name?: string; value?: string; target?: string; unit?: string }>;
  general?: string;
}

export default function NewQuestPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "active" as "active" | "completed" | "paused" | "cancelled",
    kpis: [] as KPI[],
  });

  // Step 1 validation
  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.trim().length > 200) {
      newErrors.title = "Title must be less than 200 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 validation
  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = { kpis: {} };

    let hasErrors = false;

    formData.kpis.forEach((kpi, index) => {
      const kpiErrors: { name?: string; value?: string; target?: string; unit?: string } = {};

      if (!kpi.name.trim()) {
        kpiErrors.name = "KPI name is required";
        hasErrors = true;
      }

      if (kpi.value && isNaN(parseFloat(kpi.value))) {
        kpiErrors.value = "Value must be a number";
        hasErrors = true;
      }

      if (kpi.target && isNaN(parseFloat(kpi.target))) {
        kpiErrors.target = "Target must be a number";
        hasErrors = true;
      }

      if (Object.keys(kpiErrors).length > 0) {
        newErrors.kpis![kpi.id] = kpiErrors;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleKPIChange = (kpiId: string, field: keyof KPI, value: string) => {
    setFormData((prev) => ({
      ...prev,
      kpis: prev.kpis.map((kpi) =>
        kpi.id === kpiId ? { ...kpi, [field]: value } : kpi
      ),
    }));

    // Clear error for this KPI field
    if (errors.kpis?.[kpiId]?.[field as keyof typeof errors.kpis[string]]) {
      setErrors((prev) => ({
        ...prev,
        kpis: {
          ...prev.kpis,
          [kpiId]: {
            ...prev.kpis?.[kpiId],
            [field]: undefined,
          },
        },
      }));
    }
  };

  const addKPI = () => {
    const newKPI: KPI = {
      id: `kpi-${Date.now()}-${Math.random()}`,
      name: "",
      value: "0",
      target: "",
      unit: "",
    };
    setFormData((prev) => ({
      ...prev,
      kpis: [...prev.kpis, newKPI],
    }));
  };

  const removeKPI = (kpiId: string) => {
    setFormData((prev) => ({
      ...prev,
      kpis: prev.kpis.filter((kpi) => kpi.id !== kpiId),
    }));

    // Clear errors for this KPI
    if (errors.kpis?.[kpiId]) {
      setErrors((prev) => {
        const newKpiErrors = { ...prev.kpis };
        delete newKpiErrors[kpiId];
        return { ...prev, kpis: newKpiErrors };
      });
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!validateStep1() || !validateStep2()) {
      setCurrentStep(1);
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
        setErrors({ general: "You must be logged in to create a quest" });
        setLoading(false);
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
        setLoading(false);
        return;
      }

      if (!profile) {
        setErrors({ 
          general: "Profile not found. Please complete your profile setup first. Redirecting to signup...",
        });
        // Redirect to signup since profile doesn't exist
        setTimeout(() => {
          router.push("/auth/signup");
        }, 3000);
        setLoading(false);
        return;
      }

      // Prepare quest data (profileId will be fetched on server from authenticated user)
      // Note: Quest visibility is controlled by profile's is_public setting
      const questData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
      };

      // Prepare KPI data
      const kpisData = formData.kpis
        .filter((kpi) => kpi.name.trim()) // Only include KPIs with names
        .map((kpi) => ({
          name: kpi.name.trim(),
          value: kpi.value ? parseFloat(kpi.value) : 0,
          target: kpi.target ? parseFloat(kpi.target) : null,
          unit: kpi.unit.trim() || null,
        }));

      // Submit to API
      const response = await fetch("/api/quests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify({
          quest: questData,
          kpis: kpisData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({
          general: data.error || "Failed to create quest. Please try again.",
        });
        setLoading(false);
        return;
      }

      // Redirect to quest page or profile
      window.location.href = `/u/${data.username}`;
    } catch (error) {
      console.error("Quest creation error:", error);
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold text-text-primary">
          Create New Quest
        </h1>

        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Quest creation steps">
            <ol className="flex items-center justify-between">
              {[1, 2, 3].map((step) => (
                <li key={step} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (step < currentStep || (step === 1 && currentStep > 1)) {
                        setCurrentStep(step);
                      }
                    }}
                    disabled={step > currentStep}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background ${
                      step === currentStep
                        ? "border-text-primary bg-text-primary text-background"
                        : step < currentStep
                        ? "border-text-secondary bg-text-secondary text-background cursor-pointer hover:bg-text-primary"
                        : "border-border bg-background-card text-text-muted cursor-not-allowed"
                    }`}
                    aria-current={step === currentStep ? "step" : undefined}
                    aria-label={`Step ${step}`}
                  >
                    {step < currentStep ? "✓" : step}
                  </button>
                  {step < 3 && (
                    <div
                      className={`mx-2 h-1 w-16 ${
                        step < currentStep ? "bg-text-secondary" : "bg-border"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <div className="mt-4 text-center text-sm text-text-secondary">
            {currentStep === 1 && "Basic Information"}
            {currentStep === 2 && "Key Performance Indicators"}
            {currentStep === 3 && "Privacy & Submit"}
          </div>
        </div>

        {/* Error Message */}
        {errors.general && (
          <div
            className="mb-6 rounded-lg border border-red-500 bg-red-500/10 p-4 text-sm text-red-400"
            role="alert"
            aria-live="polite"
          >
            {errors.general}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="rounded-card bg-background-card border border-border p-6 space-y-4">
              <h2 className="text-xl font-semibold text-text-primary">
                Quest Information
              </h2>

              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Quest Title <span className="text-red-400">*</span>
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
                  placeholder="e.g., Master React Development"
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

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={5}
                  aria-invalid={!!errors.description}
                  aria-describedby={
                    errors.description ? "description-error" : undefined
                  }
                  className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                    errors.description
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-border"
                  }`}
                  placeholder="Describe your quest, goals, and what you hope to achieve..."
                />
                {errors.description && (
                  <p
                    id="description-error"
                    className="mt-1 text-sm text-red-400"
                    role="alert"
                  >
                    {errors.description}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Initial Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: KPIs */}
          {currentStep === 2 && (
            <div className="rounded-card bg-background-card border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-text-primary">
                  Key Performance Indicators (KPIs)
                </h2>
                <button
                  type="button"
                  onClick={addKPI}
                  className="rounded-lg border border-border bg-background-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background-card/80 focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
                >
                  + Add KPI
                </button>
              </div>

              <p className="text-sm text-text-secondary">
                Track metrics that matter for your quest. At least one KPI is
                recommended.
              </p>

              {formData.kpis.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <p className="text-text-muted mb-4">
                    No KPIs added yet. Click "Add KPI" to get started.
                  </p>
                  <button
                    type="button"
                    onClick={addKPI}
                    className="rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
                  >
                    Add First KPI
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.kpis.map((kpi, index) => (
                    <div
                      key={kpi.id}
                      className="rounded-lg border border-border bg-background p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-text-primary">
                          KPI #{index + 1}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeKPI(kpi.id)}
                          className="text-sm text-red-400 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background rounded"
                          aria-label={`Remove KPI ${index + 1}`}
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`kpi-name-${kpi.id}`}
                            className="mb-1 block text-xs font-medium text-text-secondary"
                          >
                            Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            id={`kpi-name-${kpi.id}`}
                            value={kpi.name}
                            onChange={(e) =>
                              handleKPIChange(kpi.id, "name", e.target.value)
                            }
                            required
                            aria-required="true"
                            aria-invalid={!!errors.kpis?.[kpi.id]?.name}
                            aria-describedby={
                              errors.kpis?.[kpi.id]?.name
                                ? `kpi-name-error-${kpi.id}`
                                : undefined
                            }
                            className={`w-full rounded-lg border bg-background-card px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                              errors.kpis?.[kpi.id]?.name
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "border-border"
                            }`}
                            placeholder="e.g., Hours Studied"
                          />
                          {errors.kpis?.[kpi.id]?.name && (
                            <p
                              id={`kpi-name-error-${kpi.id}`}
                              className="mt-1 text-xs text-red-400"
                              role="alert"
                            >
                              {errors.kpis[kpi.id].name}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor={`kpi-unit-${kpi.id}`}
                            className="mb-1 block text-xs font-medium text-text-secondary"
                          >
                            Unit
                          </label>
                          <input
                            type="text"
                            id={`kpi-unit-${kpi.id}`}
                            value={kpi.unit}
                            onChange={(e) =>
                              handleKPIChange(kpi.id, "unit", e.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-background-card px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary"
                            placeholder="e.g., hours, points, %"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`kpi-value-${kpi.id}`}
                            className="mb-1 block text-xs font-medium text-text-secondary"
                          >
                            Current Value
                          </label>
                          <input
                            type="number"
                            id={`kpi-value-${kpi.id}`}
                            value={kpi.value}
                            onChange={(e) =>
                              handleKPIChange(kpi.id, "value", e.target.value)
                            }
                            step="0.01"
                            min="0"
                            aria-invalid={!!errors.kpis?.[kpi.id]?.value}
                            aria-describedby={
                              errors.kpis?.[kpi.id]?.value
                                ? `kpi-value-error-${kpi.id}`
                                : undefined
                            }
                            className={`w-full rounded-lg border bg-background-card px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                              errors.kpis?.[kpi.id]?.value
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "border-border"
                            }`}
                            placeholder="0"
                          />
                          {errors.kpis?.[kpi.id]?.value && (
                            <p
                              id={`kpi-value-error-${kpi.id}`}
                              className="mt-1 text-xs text-red-400"
                              role="alert"
                            >
                              {errors.kpis[kpi.id].value}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor={`kpi-target-${kpi.id}`}
                            className="mb-1 block text-xs font-medium text-text-secondary"
                          >
                            Target
                          </label>
                          <input
                            type="number"
                            id={`kpi-target-${kpi.id}`}
                            value={kpi.target}
                            onChange={(e) =>
                              handleKPIChange(kpi.id, "target", e.target.value)
                            }
                            step="0.01"
                            min="0"
                            aria-invalid={!!errors.kpis?.[kpi.id]?.target}
                            aria-describedby={
                              errors.kpis?.[kpi.id]?.target
                                ? `kpi-target-error-${kpi.id}`
                                : undefined
                            }
                            className={`w-full rounded-lg border bg-background-card px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                              errors.kpis?.[kpi.id]?.target
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "border-border"
                            }`}
                            placeholder="Optional target value"
                          />
                          {errors.kpis?.[kpi.id]?.target && (
                            <p
                              id={`kpi-target-error-${kpi.id}`}
                              className="mt-1 text-xs text-red-400"
                              role="alert"
                            >
                              {errors.kpis[kpi.id].target}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Privacy & Submit */}
          {currentStep === 3 && (
            <div className="rounded-card bg-background-card border border-border p-6 space-y-4">
              <h2 className="text-xl font-semibold text-text-primary">
                Privacy & Review
              </h2>

              <div className="rounded-lg border border-border bg-background p-4">
                <h3 className="mb-2 text-sm font-medium text-text-primary">
                  Quest Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-text-muted">Title: </span>
                    <span className="text-text-primary">{formData.title}</span>
                  </div>
                  {formData.description && (
                    <div>
                      <span className="text-text-muted">Description: </span>
                      <span className="text-text-secondary">
                        {formData.description.length > 100
                          ? `${formData.description.substring(0, 100)}...`
                          : formData.description}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-text-muted">Status: </span>
                    <span className="text-text-primary capitalize">
                      {formData.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">KPIs: </span>
                    <span className="text-text-primary">
                      {formData.kpis.filter((k) => k.name.trim()).length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm text-text-secondary">
                  Quest visibility is controlled by your profile's privacy settings.
                  Your quest will be visible to others only if your profile is set to public.
                </p>
                <p className="mt-2 text-xs text-text-muted">
                  You can manage your profile privacy settings from your profile edit page.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              className="rounded-lg border border-border bg-background-card px-6 py-2 font-medium text-text-primary transition-colors hover:bg-background-card/80 focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="rounded-lg bg-text-primary px-6 py-2 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className={`rounded-lg bg-text-primary px-6 py-2 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                  loading ? "cursor-wait" : ""
                }`}
                aria-busy={loading}
              >
                {loading ? "Creating Quest..." : "Create Quest"}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
