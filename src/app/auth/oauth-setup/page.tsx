"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { BRANCHES, SECTIONS } from "@/lib/constants";

export default function OAuthSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    branch: "",
    section: "",
    year: "",
  });

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser(user);
      // Pre-fill display name from OAuth data if available
      if (user.user_metadata?.full_name || user.user_metadata?.name) {
        setFormData((prev) => ({
          ...prev,
          displayName: user.user_metadata?.full_name || user.user_metadata?.name || "",
        }));
      }
    });
  }, [router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (!/^[a-zA-Z0-9_-]{3,30}$/.test(formData.username)) {
      newErrors.username =
        "Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens";
    }

    if (!formData.displayName.trim()) {
      newErrors.displayName = "Display name is required";
    }

    if (!formData.branch.trim()) {
      newErrors.branch = "Branch is required";
    }

    if (!formData.year.trim()) {
      newErrors.year = "Year is required";
    } else if (parseInt(formData.year) < 1 || parseInt(formData.year) > 4) {
      newErrors.year = "Year must be between 1 and 4";
    }

    if (!formData.section.trim()) {
      newErrors.section = "Section is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    if (!user) {
      setErrors({ general: "User not authenticated" });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          username: formData.username.trim(),
          displayName: formData.displayName.trim(),
          branch: formData.branch,
          section: formData.section,
          year: parseInt(formData.year, 10),
          avatarUrl: user.user_metadata?.avatar_url || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrors({
          general: result.error || "Failed to create profile. Please try again.",
        });
        setLoading(false);
        return;
      }

      // Redirect to profile
      router.push(`/u/${formData.username.trim()}`);
    } catch (error: any) {
      setErrors({
        general: error?.message || "An unexpected error occurred. Please try again.",
      });
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="rounded-card border border-border bg-background-card p-8 text-center">
            <div className="mb-4 text-6xl animate-pulse">⏳</div>
            <h1 className="mb-4 text-2xl font-bold text-text-primary">Loading...</h1>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="rounded-card border border-border bg-background-card p-8">
          <h1 className="mb-2 text-2xl font-bold text-text-primary">Complete Your Profile</h1>
          <p className="mb-6 text-text-secondary">
            Please provide some additional information to complete your account setup.
          </p>

          {errors.general && (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
              <p className="text-sm text-red-400" role="alert">
                {errors.general}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                Username <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                aria-required="true"
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? "username-error" : undefined}
                className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                  errors.username
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border"
                }`}
                placeholder="Choose a username"
              />
              {errors.username && (
                <p
                  id="username-error"
                  className="mt-1 text-sm text-red-400"
                  role="alert"
                >
                  {errors.username}
                </p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label
                htmlFor="displayName"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                Display Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                required
                aria-required="true"
                aria-invalid={!!errors.displayName}
                aria-describedby={errors.displayName ? "displayName-error" : undefined}
                className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                  errors.displayName
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border"
                }`}
                placeholder="Your name"
              />
              {errors.displayName && (
                <p
                  id="displayName-error"
                  className="mt-1 text-sm text-red-400"
                  role="alert"
                >
                  {errors.displayName}
                </p>
              )}
            </div>

            {/* Branch */}
            <div>
              <label
                htmlFor="branch"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                Branch <span className="text-red-400">*</span>
              </label>
              <select
                id="branch"
                name="branch"
                value={formData.branch}
                onChange={handleInputChange}
                required
                aria-required="true"
                aria-invalid={!!errors.branch}
                aria-describedby={errors.branch ? "branch-error" : undefined}
                className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                  errors.branch
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border"
                }`}
              >
                <option value="">Select branch</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
              {errors.branch && (
                <p id="branch-error" className="mt-1 text-sm text-red-400" role="alert">
                  {errors.branch}
                </p>
              )}
            </div>

            {/* Year and Section */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="year"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Year <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  id="year"
                  name="year"
                  min="1"
                  max="4"
                  value={formData.year}
                  onChange={handleInputChange}
                  required
                  aria-required="true"
                  aria-invalid={!!errors.year}
                  aria-describedby={errors.year ? "year-error" : undefined}
                  className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                    errors.year
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-border"
                  }`}
                  placeholder="1-4"
                />
                {errors.year && (
                  <p id="year-error" className="mt-1 text-sm text-red-400" role="alert">
                    {errors.year}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="section"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Section <span className="text-red-400">*</span>
                </label>
                <select
                  id="section"
                  name="section"
                  value={formData.section}
                  onChange={handleInputChange}
                  required
                  aria-required="true"
                  aria-invalid={!!errors.section}
                  aria-describedby={errors.section ? "section-error" : undefined}
                  className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                    errors.section
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-border"
                  }`}
                >
                  <option value="">Select</option>
                  {SECTIONS.map((s) => (
                    <option key={s} value={s === "none" ? "" : s}>
                      {s === "none" ? "No Section" : `Section ${s}`}
                    </option>
                  ))}
                </select>
                {errors.section && (
                  <p
                    id="section-error"
                    className="mt-1 text-sm text-red-400"
                    role="alert"
                  >
                    {errors.section}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-text-primary px-4 py-2 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating Profile..." : "Complete Setup"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
