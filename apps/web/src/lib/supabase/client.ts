import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseEnv } from "./env";

export function createBrowserSupabaseClient() {
  const env = getPublicSupabaseEnv();
  return createBrowserClient(env.url, env.publishableKey);
}
