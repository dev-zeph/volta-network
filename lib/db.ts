import "server-only";
import { createClient } from "@supabase/supabase-js";

export const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-vn-secret": process.env.VN_DB_SECRET! } },
});
