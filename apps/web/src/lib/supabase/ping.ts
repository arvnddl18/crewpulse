import { getProjectRef } from "./env";

export type SupabasePingResult = {
  projectRef: string;
  jwksOk: boolean;
  keyCount: number;
};

export async function pingSupabase(
  supabaseUrl: string,
  jwksUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SupabasePingResult> {
  const projectRef = getProjectRef(supabaseUrl);
  const response = await fetchImpl(jwksUrl, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`JWKS request failed with HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  const keys =
    typeof body === "object" &&
    body !== null &&
    "keys" in body &&
    Array.isArray(body.keys)
      ? body.keys
      : [];

  return {
    projectRef,
    jwksOk: keys.length > 0,
    keyCount: keys.length,
  };
}
