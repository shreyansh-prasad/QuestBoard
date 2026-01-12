import { createSupabaseServerClient } from "@/lib/supabaseServerAuth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Check if profile exists, if not, redirect to profile creation
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        // Profile doesn't exist - redirect to profile setup
        return NextResponse.redirect(new URL("/auth/oauth-setup", requestUrl.origin));
      }

      // Profile exists - redirect to user profile
      return NextResponse.redirect(new URL(`/u/${profile.username}`, requestUrl.origin));
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL("/auth/login?error=oauth_error", requestUrl.origin));
}
