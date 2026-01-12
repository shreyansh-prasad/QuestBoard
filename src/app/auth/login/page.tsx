"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    // Check for success message from signup or email verification
    const message = searchParams.get("message");
    if (message) {
      setSuccessMessage(message);
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (error) {
        // Check for specific error types
        if (error.message?.includes("Email not confirmed") || 
            error.message?.includes("email_not_confirmed") ||
            error.message?.includes("signup_disabled")) {
          setErrors({ 
            general: "Please verify your email address before signing in. Check your inbox for the verification link.",
          });
        } else if (error.message?.includes("Invalid login credentials") || 
                   error.message?.includes("invalid_credentials")) {
          setErrors({ 
            general: "Invalid email or password. Please try again.",
          });
        } else {
          setErrors({ general: error.message });
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Check if email is confirmed (for additional safety check)
        if (!data.user.email_confirmed_at) {
          setErrors({
            general: `Please verify your email address (${data.user.email}) before signing in. Check your inbox for the verification link.`,
          });
          // Store email for potential resend functionality
          setFormData(prev => ({ ...prev, email: data.user.email || prev.email }));
          setLoading(false);
          return;
        }

        // Fetch profile to get username for redirect
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          // Database error - show error
          setErrors({
            general: "Failed to check profile. Please try again.",
          });
          setLoading(false);
          return;
        }

        if (profile) {
          router.push(`/u/${profile.username}`);
        } else {
          // Profile doesn't exist - try to create it from metadata or redirect to setup
          const metadata = data.user.user_metadata || {};
          const username = metadata.username;
          const displayName = metadata.display_name;

          if (username && displayName) {
            // Try to create profile automatically
            try {
              const response = await fetch("/api/auth/create-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: data.user.id,
                  email: data.user.email,
                  username: username,
                  displayName: displayName,
                  branch: metadata.branch || null,
                  section: metadata.section || null,
                  year: metadata.year ? parseInt(String(metadata.year), 10) : null,
                  avatarUrl: metadata.avatar_url || null,
                }),
              });

              const result = await response.json();

              if (response.ok && result.profile) {
                router.push(`/u/${result.profile.username}`);
              } else {
                // Profile creation failed - redirect to setup
                router.push("/auth/oauth-setup");
              }
            } catch (error) {
              console.error("Error creating profile:", error);
              router.push("/auth/oauth-setup");
            }
          } else {
            // Missing metadata - redirect to profile setup
            router.push("/auth/oauth-setup");
          }
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="rounded-card border border-border bg-background-card p-8">
          <h1 className="mb-6 text-3xl font-bold text-text-primary">Log In</h1>

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
                autoComplete="email"
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
                placeholder="Enter your password"
                autoComplete="current-password"
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

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background rounded"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-text-primary px-4 py-2 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              aria-busy={loading}
            >
              {loading ? "Logging in..." : "Log In"}
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
                  setErrors({ general: error?.message || "Failed to sign in with Google" });
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
                  setErrors({ general: error?.message || "Failed to sign in with GitHub" });
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

          {errors.general?.includes("verify your email") && formData.email && (
            <div className="mt-4">
              <button
                onClick={async () => {
                  try {
                    const { error: resendError } = await supabase.auth.resend({
                      type: "signup",
                      email: formData.email.trim(),
                      options: {
                        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/verify`,
                      },
                    });
                    
                    if (resendError) {
                      setErrors({ general: `Failed to resend: ${resendError.message}` });
                    } else {
                      setSuccessMessage(`Verification email sent to ${formData.email}. Please check your inbox.`);
                      setErrors({});
                    }
                  } catch (e: any) {
                    setErrors({ general: `Error: ${e?.message || "Failed to resend email"}` });
                  }
                }}
                className="w-full rounded-lg border border-border bg-background-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
              >
                Resend Verification Email
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-text-secondary">
            Don't have an account?{" "}
            <Link
              href="/auth/signup"
              className="font-medium text-text-primary hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background rounded"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="rounded-card border border-border bg-background-card p-8">
            <h1 className="mb-6 text-3xl font-bold text-text-primary">Log In</h1>
            <p className="text-text-secondary">Loading...</p>
          </div>
        </div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
