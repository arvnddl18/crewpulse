import { describe, expect, it } from "vitest"
import { JOB_PHOTO_MAX_BYTES, validateJobPhoto } from "./job-photo"

describe("validateJobPhoto", () => {
  it("accepts a jpeg under the size cap", () => {
    expect(validateJobPhoto({ size: 1200, mime: "image/jpeg" })).toEqual({
      ok: true,
      mime: "image/jpeg",
    })
  })

  it("rejects an empty file", () => {
    const result = validateJobPhoto({ size: 0, mime: "image/png" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe("EMPTY")
    }
  })

  it("rejects files over 5 MB", () => {
    const result = validateJobPhoto({
      size: JOB_PHOTO_MAX_BYTES + 1,
      mime: "image/webp",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe("TOO_LARGE")
    }
  })

  it("rejects gif and pdf", () => {
    expect(validateJobPhoto({ size: 10, mime: "image/gif" }).ok).toBe(false)
    expect(validateJobPhoto({ size: 10, mime: "application/pdf" }).ok).toBe(false)
  })
})
