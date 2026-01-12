"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState<string>("Verifying your email...");
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const createProfileFromMetadata = async (user: any) => {
    try {
      const metadata = user.user_metadata || {};
      const username = metadata.username;
      const displayName = metadata.display_name;
      const branch = metadata.branch;
      const section = metadata.section;
      const year = metadata.year;
      const avatarUrl = metadata.avatar_url;

      // Check if we have required data
      if (!username || !displayName) {
        // Missing required data - redirect to profile completion
        setMessage("Please complete your profile setup...");
        setTimeout(() => {
          router.push("/auth/oauth-setup");
        }, 2000);
        return;
      }

      // Create profile via API
      const response = await fetch("/api/auth/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          username: username,
          displayName: displayName,
          branch: branch || null,
          section: section || null,
          year: year ? parseInt(String(year), 10) : null,
          avatarUrl: avatarUrl || null,
        }),
      });

      const result = await response.json();

      if (response.ok && result.profile) {
        setMessage("Profile created! Redirecting...");
        setTimeout(() => {
          router.push(`/u/${result.profile.username}`);
        }, 2000);
      } else {
        // Profile creation failed - redirect to profile completion
        console.error("Profile creation error:", result);
        setMessage("Please complete your profile setup...");
        setTimeout(() => {
          router.push("/auth/oauth-setup");
        }, 2000);
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      setMessage("Please complete your profile setup...");
      setTimeout(() => {
        router.push("/auth/oauth-setup");
      }, 2000);
    }
  };

  useEffect(() => {
    // Listen for auth state changes (Supabase processes URL hash automatically)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user?.email_confirmed_at) {
          setStatus("success");
          setMessage("Email verified successfully! Redirecting...");
          setEmail(session.user.email || null);
          
          // Check if profile exists, if not create it
          supabase
            .from("profiles")
            .select("username")
            .eq("user_id", session.user.id)
            .maybeSingle()
            .then(async ({ data: profile, error: profileError }) => {
              if (profile?.username) {
                setTimeout(() => {
                  router.push(`/u/${profile.username}`);
                }, 2000);
              } else {
                // Profile doesn't exist - create it using stored metadata
                await createProfileFromMetadata(session.user);
              }
            });
        }
      }
    });

    // Initial check
    verifyEmail();

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const verifyEmail = async () => {
    try {
      // Check for hash fragments or query parameters in URL
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const searchParamsStr = typeof window !== 'undefined' ? window.location.search : '';
      
      // Check if we have verification tokens in the URL
      const hasHashToken = hash.includes('access_token') || hash.includes('type=');
      const hasQueryToken = searchParamsStr.includes('token') || searchParamsStr.includes('type');

      // If we have tokens, wait a bit for Supabase to process them automatically
      if (hasHashToken || hasQueryToken) {
        setMessage("Processing verification link...");
        // Give Supabase more time to process the tokens
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // No tokens, wait a shorter time
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Check if we have a session now
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session && !sessionError) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.email_confirmed_at) {
          setStatus("success");
          setMessage("Email verified successfully! Redirecting...");
          setEmail(user.email || null);
          
          // Check if profile exists, if not create it
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", user.id)
            .maybeSingle();
          
          if (profile?.username) {
            setTimeout(() => {
              router.push(`/u/${profile.username}`);
            }, 2000);
          } else {
            // Profile doesn't exist - create it using stored metadata
            await createProfileFromMetadata(user);
          }
          return;
        }
      }

      // If we had tokens but no session/confirmation, try one more time after longer wait
      if (hasHashToken || hasQueryToken) {
        setMessage("Still processing verification link...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        const { data: { user: retryUser } } = await supabase.auth.getUser();
        
        if (retrySession && retryUser?.email_confirmed_at) {
          setStatus("success");
          setMessage("Email verified successfully! Redirecting...");
          setEmail(retryUser.email || null);
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", retryUser.id)
            .maybeSingle();
          
          if (profile?.username) {
            setTimeout(() => {
              router.push(`/u/${profile.username}`);
            }, 2000);
          } else {
            // Profile doesn't exist - create it using stored metadata
            await createProfileFromMetadata(retryUser);
          }
          return;
        }
      }

      // Check if user is already verified (user might just be visiting this page)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email_confirmed_at) {
        setStatus("success");
        setMessage("Your email is already verified! Redirecting...");
        setEmail(user.email || null);
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (profile?.username) {
          setTimeout(() => {
            router.push(`/u/${profile.username}`);
          }, 2000);
        } else {
          // Profile doesn't exist - create it using stored metadata
          await createProfileFromMetadata(user);
        }
        return;
      }

      // No session and no confirmation - show error with resend option
      setStatus("error");
      setEmail(user?.email || searchParams.get("email") || null);
      setMessage("Verification link is invalid or expired. Please request a new verification email.");
    } catch (error: any) {
      console.error("Verification error:", error);
      setStatus("error");
      setMessage(error?.message || "An error occurred during verification.");
    }
  };

  const resendVerificationEmail = async () => {
    if (!email) {
      setMessage("Email address not found. Please try signing up again.");
      return;
    }

    setResending(true);
    setMessage("Sending verification email...");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/verify`,
        },
      });

      if (error) {
        setMessage(`Failed to resend email: ${error.message}`);
      } else {
        setMessage(`Verification email sent to ${email}. Please check your inbox.`);
        setStatus("verifying");
        // Auto-refresh after a delay to check if user verified
        setTimeout(() => {
          verifyEmail();
        }, 3000);
      }
    } catch (error: any) {
      setMessage(`Error: ${error?.message || "Failed to resend verification email"}`);
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="rounded-card border border-border bg-background-card p-8 text-center">
          <div className="mb-6">
            {status === "verifying" && (
              <div className="mb-4 text-6xl animate-pulse">⏳</div>
            )}
            {status === "success" && (
              <div className="mb-4 text-6xl">✅</div>
            )}
            {status === "error" && (
              <div className="mb-4 text-6xl">❌</div>
            )}
          </div>

          <h1 className="mb-4 text-2xl font-bold text-text-primary">
            {status === "verifying" && "Verifying Email"}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
          </h1>

          <p className="mb-6 text-text-secondary">{message}</p>

          {status === "error" && (
            <div className="space-y-4">
              {email && (
                <button
                  onClick={resendVerificationEmail}
                  disabled={resending}
                  className="w-full rounded-lg bg-text-primary px-4 py-2 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend Verification Email"}
                </button>
              )}
              <Link
                href="/auth/login"
                className="block w-full rounded-lg border border-border bg-background-card px-4 py-2 font-medium text-text-primary transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
              >
                Back to Login
              </Link>
            </div>
          )}

          {status === "success" && (
            <Link
              href="/explore"
              className="inline-block rounded-lg bg-text-primary px-6 py-2 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
            >
              Continue to QuestBoard
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="rounded-card border border-border bg-background-card p-8 text-center">
            <div className="mb-4 text-6xl animate-pulse">⏳</div>
            <h1 className="mb-4 text-2xl font-bold text-text-primary">Verifying Email</h1>
            <p className="text-text-secondary">Loading...</p>
          </div>
        </div>
      </main>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
