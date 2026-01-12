import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables with helpful error message
if (!supabaseUrl || !supabaseServiceKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  throw new Error(
    `Missing Supabase environment variables: ${missing.join(", ")}. ` +
      `Please create a .env.local file in the project root with these variables. ` +
      `See .env.local.example for reference. ` +
      `Get your values from: Supabase Dashboard → Settings → API`
  );
}

// Server-side Supabase client with service role key (bypasses RLS)
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
