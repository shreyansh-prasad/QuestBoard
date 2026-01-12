"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AvatarUploader from "@/components/AvatarUploader";
import AvatarEditor from "@/components/AvatarEditor";
import { BRANCHES, SECTIONS } from "@/lib/constants";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarEditorImage, setAvatarEditorImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    displayName: "",
    branch: "",
    section: "",
    year: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

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
    } else if (formData.section !== "1" && formData.section !== "2") {
      newErrors.section = "Section must be 1 or 2";
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

    setLoading(true);

    try {
      // Step 1: Sign up with Supabase Auth
      // Include emailRedirectTo for email verification callback
      const siteUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/verify`,
          data: {
            username: formData.username.trim(),
            display_name: formData.displayName.trim(),
          },
        },
      });

      if (signUpError) {
        setErrors({ general: signUpError.message });
        setLoading(false);
        return;
      }

      if (!authData.user || !authData.user.id) {
        setErrors({ general: "Failed to create account. Please try again." });
        setLoading(false);
        return;
      }

      // Check if email confirmation is required
      // If email_confirmed_at is null, Supabase is requiring email verification
      const emailConfirmed = authData.user.email_confirmed_at !== null;
      const confirmationSent = authData.user.confirmation_sent_at !== null;

      // Always show email verification modal after signup
      // This ensures users see the "check your email" message
      const email = formData.email.trim();
      setVerificationEmail(email);
      setShowEmailModal(true);
      setLoading(false);
      
      // Don't create profile yet - user needs to verify email first
      // Profile will be created after email verification via login
      return;

      // NOTE: The following code is unreachable (dead code after return above)
      // It's kept for reference but will never execute.
      // Profile creation happens after email verification via the login flow.
      /*
      // Step 4: Create profile via API (only if email is confirmed)
      const profileResponse = await fetch("/api/auth/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authData.user.id,
          email: formData.email.trim(),
          username: formData.username.trim(),
          displayName: formData.displayName.trim(),
          branch: formData.branch,
          section: formData.section,
          year: parseInt(formData.year, 10),
          avatarUrl: finalAvatarUrl,
        }),
      });

      const profileResult = await profileResponse.json();

      if (!profileResponse.ok) {
        // Show detailed error message
        const errorMessage = profileResult.details 
          ? `${profileResult.error}: ${profileResult.details}`
          : profileResult.error || "Failed to create profile. Please try again.";
        
        setErrors({
          general: errorMessage + (profileResult.hint ? ` (${profileResult.hint})` : ""),
        });
        setLoading(false);
        return;
      }

      // Step 5: Redirect to profile edit after successful profile creation
      setLoading(false);
      router.push(`/u/${profileResult.profile.username}/edit`);
      */
    } catch (error) {
      console.error("Signup error:", error);
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
      setLoading(false);
    }
  };

  return (
    <>
      {/* Email Verification Modal */}
      {showEmailModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
          />
          
          {/* Modal */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-modal-title"
            aria-describedby="email-modal-description"
          >
            <div
              className="w-full max-w-md rounded-lg border border-border bg-background-card p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon */}
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-green-500/20 p-4">
                  <svg
                    className="h-12 w-12 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h2
                id="email-modal-title"
                className="mb-3 text-center text-2xl font-bold text-text-primary"
              >
                Check Your Email!
              </h2>
              
              {/* Message */}
              <p
                id="email-modal-description"
                className="mb-6 text-center text-text-secondary"
              >
                We've sent a verification email to{" "}
                <span className="font-semibold text-text-primary">
                  {verificationEmail}
                </span>
                . Please check your inbox and click the verification link to verify your account.
              </p>

              <p className="mb-6 text-center text-sm text-text-muted">
                After verifying your email, you can sign in to complete your profile setup.
              </p>

              {/* Button */}
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  router.push("/auth/login?message=Please check your email to verify your account. After verification, you can sign in to complete your profile setup.");
                }}
                className="w-full rounded-lg bg-text-primary px-4 py-3 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
              >
                Go to Login
              </button>
            </div>
          </div>
        </>
      )}

      <main className="flex min-h-screen items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="rounded-card border border-border bg-background-card p-8">
            <h1 className="mb-6 text-3xl font-bold text-text-primary">Sign Up</h1>

            {successMessage && (
              <div
                className="mb-4 rounded-lg border border-green-500 bg-green-500/10 p-3 text-sm text-green-400"
                role="alert"
              >
                {successMessage}
              </div>
            )}

          {errors.general && (
            <div
              className="mb-4 rounded-lg border border-red-500 bg-red-500/10 p-3 text-sm text-red-400"
              role="alert"
            >
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex justify-center">
              <AvatarUploader
                size={80}
                currentAvatarUrl={avatarUrl}
                onFileSelect={(file) => {
                  if (file) {
                    // When file is selected, show editor instead of storing directly
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setAvatarEditorImage(reader.result as string);
                      setShowAvatarEditor(true);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setAvatarFile(null);
                    setAvatarUrl(null);
                  }
                }}
                storeFileOnly={true}
                disabled={loading}
              />
            </div>

            {/* Avatar Editor Modal */}
            {avatarEditorImage && (
              <AvatarEditor
                imageSrc={avatarEditorImage}
                isOpen={showAvatarEditor}
                onClose={() => {
                  setShowAvatarEditor(false);
                  setAvatarEditorImage(null);
                }}
                onSave={(editedImageBlob) => {
                  // Convert blob to File
                  const fileName = `avatar-${Date.now()}.png`;
                  const editedFile = new File([editedImageBlob], fileName, { type: "image/png" });
                  
                  setAvatarFile(editedFile);
                  
                  // Create preview from edited image
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setAvatarUrl(reader.result as string);
                  };
                  reader.readAsDataURL(editedFile);
                  
                  setShowAvatarEditor(false);
                  setAvatarEditorImage(null);
                  setErrors((prev) => {
                    const { avatar, ...rest } = prev;
                    return rest;
                  });
                }}
              />
            )}
            {errors.avatar && (
              <div className="mb-4 rounded-lg border border-orange-500 bg-orange-500/10 p-3 text-sm text-orange-400 text-center" role="alert">
                Avatar: {errors.avatar} (You can skip this and upload later)
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                  errors.email
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border"
                }`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-400" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                aria-required="true"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                  errors.password
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border"
                }`}
                placeholder="Minimum 6 characters"
              />
              {errors.password && (
                <p
                  id="password-error"
                  className="mt-1 text-sm text-red-400"
                  role="alert"
                >
                  {errors.password}
                </p>
              )}
            </div>

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
                pattern="[a-zA-Z0-9_-]{3,30}"
                className={`w-full rounded-lg border bg-background px-4 py-2 text-text-primary placeholder-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary ${
                  errors.username
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-border"
                }`}
                placeholder="username"
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
                aria-describedby={
                  errors.displayName ? "displayName-error" : undefined
                }
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-text-primary px-4 py-2 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              aria-busy={loading}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          {/* OAuth Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-4 text-sm text-text-muted">or</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  const siteUrl = typeof window !== "undefined"
                    ? window.location.origin
                    : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                      redirectTo: `${siteUrl}/auth/callback`,
                    },
                  });

                  if (error) {
                    setErrors({ general: error.message });
                  }
                } catch (error: any) {
                  setErrors({ general: error?.message || "Failed to sign up with Google" });
                }
              }}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-background-card px-4 py-2 font-medium text-text-primary transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const siteUrl = typeof window !== "undefined"
                    ? window.location.origin
                    : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "github",
                    options: {
                      redirectTo: `${siteUrl}/auth/callback`,
                    },
                  });

                  if (error) {
                    setErrors({ general: error.message });
                  }
                } catch (error: any) {
                  setErrors({ general: error?.message || "Failed to sign up with GitHub" });
                }
              }}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-background-card px-4 py-2 font-medium text-text-primary transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
              <span>Continue with GitHub</span>
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-text-primary hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background rounded"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
    </>
  );
}
