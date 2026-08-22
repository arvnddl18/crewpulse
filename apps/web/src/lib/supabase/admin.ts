import { createClient } from "@supabase/supabase-js"
import { getServerSupabaseEnv } from "./env"

export function createAdminSupabaseClient() {
  const env = getServerSupabaseEnv()
  return createClient(env.url, env.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
