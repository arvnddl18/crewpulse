import { describe, expect, it } from "vitest";
import { getProjectRef, getPublicSupabaseEnv, getServerSupabaseEnv } from "./env";

describe("getProjectRef", () => {
  it("reads the project ref from a supabase.co URL", () => {
    expect(
      getProjectRef("https://mcxvayoxstpmsqxssdcz.supabase.co"),
    ).toBe("mcxvayoxstpmsqxssdcz");
  });

  it("rejects a non-URL", () => {
    expect(() => getProjectRef("not-a-url")).toThrow();
  });
});

describe("getPublicSupabaseEnv", () => {
  it("accepts publishable keys and a project URL", () => {
    const env = getPublicSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://mcxvayoxstpmsqxssdcz.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_testkey_xxxxxxxx",
    });
    expect(env.url).toBe("https://mcxvayoxstpmsqxssdcz.supabase.co");
  });

  it("reads NEXT_PUBLIC_* from process.env when no source is passed", () => {
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://mcxvayoxstpmsqxssdcz.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_testkey_xxxxxxxx"
    try {
      expect(getPublicSupabaseEnv().url).toBe(
        "https://mcxvayoxstpmsqxssdcz.supabase.co",
      )
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey
    }
  })

  it("rejects a secret key in the public slot", () => {
    expect(() =>
      getPublicSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://mcxvayoxstpmsqxssdcz.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_should_not_be_public",
      }),
    ).toThrow();
  });
});

describe("getServerSupabaseEnv", () => {
  it("requires a secret key and JWKS URL", () => {
    expect(() =>
      getServerSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://mcxvayoxstpmsqxssdcz.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_testkey_xxxxxxxx",
      }),
    ).toThrow();
  });
});
