export const JOB_PHOTO_MAX_BYTES = 5 * 1024 * 1024

export const JOB_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const

export type JobPhotoMime = (typeof JOB_PHOTO_MIME)[number]

const EXT_BY_MIME: Record<JobPhotoMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export type JobPhotoErrorCode = "EMPTY" | "TOO_LARGE" | "UNSUPPORTED_TYPE"

export function isJobPhotoMime(value: string): value is JobPhotoMime {
  return (JOB_PHOTO_MIME as readonly string[]).includes(value)
}

export function jobPhotoExtension(mime: JobPhotoMime): string {
  return EXT_BY_MIME[mime]
}

export function validateJobPhoto(input: {
  size: number
  mime: string
}): { ok: true; mime: JobPhotoMime } | { ok: false; code: JobPhotoErrorCode; message: string } {
  if (!input.mime) {
    return { ok: false, code: "EMPTY", message: "Choose a photo to upload." }
  }
  if (!isJobPhotoMime(input.mime)) {
    return {
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message: "Photo must be JPEG, PNG, or WebP.",
    }
  }
  if (input.size <= 0) {
    return { ok: false, code: "EMPTY", message: "Choose a photo to upload." }
  }
  if (input.size > JOB_PHOTO_MAX_BYTES) {
    return {
      ok: false,
      code: "TOO_LARGE",
      message: "Photo must be 5 MB or smaller.",
    }
  }
  return { ok: true, mime: input.mime }
}
