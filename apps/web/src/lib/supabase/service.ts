import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getServerSupabaseEnv } from "./env"

let serviceClient: SupabaseClient | null = null

export function createServiceSupabaseClient(): SupabaseClient {
  if (serviceClient) {
    return serviceClient
  }
  const env = getServerSupabaseEnv()
  serviceClient = createClient(env.url, env.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return serviceClient
}
