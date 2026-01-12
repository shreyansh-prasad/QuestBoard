import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabaseServerAuth";

export default async function ProfileIndexPage() {
  // Try to get authenticated user and their profile
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // Not authenticated, redirect to explore
      redirect("/explore");
    }

    // User is authenticated, fetch their profile using server client (bypasses RLS for own profile lookup)
    const { data: profile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("username, user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // If profile lookup failed due to table not existing, check error
    if (profileError) {
      // If it's a table not found error, redirect to explore (user needs to run migrations)
      if (profileError.code === 'PGRST205' || profileError.message?.includes('schema cache')) {
        console.error("Profiles table not found - migrations may not have been run");
        redirect("/explore");
      }
      // For other errors, also redirect (could be RLS or other issues)
      console.error("Error fetching profile:", profileError);
      redirect("/explore");
    }

    if (profile?.username) {
      // Redirect to user's profile page
      redirect(`/u/${profile.username}`);
    } else {
      // Profile doesn't exist yet - this shouldn't happen if signup worked
      // But if it does, redirect to explore (could add a profile creation flow later)
      console.warn(`Profile not found for user ${user.id} - profile may not have been created during signup`);
      redirect("/explore");
    }
  } catch (error) {
    // If any error occurs (e.g., database connection issues), redirect to explore
    console.error("Error in profile index page:", error);
    redirect("/explore");
  }
}
