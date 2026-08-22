import { describe, expect, it } from "vitest";
import { pingSupabase } from "./ping";

describe("pingSupabase", () => {
  it("returns the project ref and key count from JWKS JSON", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ keys: [{ kid: "test" }, { kid: "two" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const result = await pingSupabase(
      "https://mcxvayoxstpmsqxssdcz.supabase.co",
      "https://mcxvayoxstpmsqxssdcz.supabase.co/auth/v1/.well-known/jwks.json",
      fetchImpl,
    );

    expect(result).toEqual({
      projectRef: "mcxvayoxstpmsqxssdcz",
      jwksOk: true,
      keyCount: 2,
    });
  });

  it("throws when JWKS is not reachable", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("nope", { status: 503 });

    await expect(
      pingSupabase(
        "https://mcxvayoxstpmsqxssdcz.supabase.co",
        "https://mcxvayoxstpmsqxssdcz.supabase.co/auth/v1/.well-known/jwks.json",
        fetchImpl,
      ),
    ).rejects.toThrow(/JWKS request failed/);
  });
});
