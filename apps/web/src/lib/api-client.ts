import type { ActionResult } from "@crewpulse/domain"

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    credentials: "same-origin",
  })

  const body = (await response.json()) as ActionResult<T>
  if (!body.ok) {
    throw new ApiError(body.code, body.message)
  }
  return body.data
}

export async function apiUploadForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  })

  const body = (await response.json()) as ActionResult<T>
  if (!body.ok) {
    throw new ApiError(body.code, body.message)
  }
  return body.data
}
