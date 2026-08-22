import { getServerSupabaseEnv } from "@/lib/supabase/env";
import { pingSupabase } from "@/lib/supabase/ping";

export async function GET(): Promise<Response> {
  try {
    const env = getServerSupabaseEnv();
    const data = await pingSupabase(env.url, env.jwksUrl);
    return Response.json({ ok: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Supabase ping failed";
    return Response.json(
      { ok: false, code: "SUPABASE_UNREACHABLE", message },
      { status: 503 },
    );
  }
}
