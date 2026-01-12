// Client-side Supabase client for use in client components
// Uses @supabase/ssr to handle cookies for server-side authentication
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables with helpful error message
if (!supabaseUrl || !supabaseAnonKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  throw new Error(
    `Missing Supabase environment variables: ${missing.join(", ")}. ` +
      `Please create a .env.local file in the project root with these variables. ` +
      `See README.md for setup instructions. ` +
      `Get your values from: Supabase Dashboard → Settings → API`
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);