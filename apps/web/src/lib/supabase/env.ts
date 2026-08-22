import { z } from "zod";

const urlSchema = z.string().url();
const publishableKeySchema = z.string().startsWith("sb_publishable_");
const secretKeySchema = z.string().startsWith("sb_secret_");

export function getProjectRef(supabaseUrl: string): string {
  const parsed = urlSchema.parse(supabaseUrl);
  const host = new URL(parsed).hostname;
  const ref = host.split(".")[0];
  if (!ref) {
    throw new Error("Supabase URL is missing a project ref");
  }
  return ref;
}

export type PublicSupabaseEnv = {
  url: string;
  publishableKey: string;
};

export type EnvSource = Record<string, string | undefined>;

export function getPublicSupabaseEnv(
  source: EnvSource = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
): PublicSupabaseEnv {
  const parsed = z
    .object({
      NEXT_PUBLIC_SUPABASE_URL: urlSchema,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKeySchema,
    })
    .parse({
      NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });

  return {
    url: parsed.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export type ServerSupabaseEnv = PublicSupabaseEnv & {
  secretKey: string;
  jwksUrl: string;
};

export function getServerSupabaseEnv(
  source: EnvSource = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL,
  },
): ServerSupabaseEnv {
  const publicEnv = getPublicSupabaseEnv(source);
  const parsed = z
    .object({
      SUPABASE_SECRET_KEY: secretKeySchema,
      SUPABASE_JWKS_URL: urlSchema,
    })
    .parse({
      SUPABASE_SECRET_KEY: source.SUPABASE_SECRET_KEY,
      SUPABASE_JWKS_URL: source.SUPABASE_JWKS_URL,
    });

  return {
    ...publicEnv,
    secretKey: parsed.SUPABASE_SECRET_KEY,
    jwksUrl: parsed.SUPABASE_JWKS_URL,
  };
}
