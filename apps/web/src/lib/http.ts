import type { ActionResult } from "@crewpulse/domain"

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "ILLEGAL_TRANSITION"
  | "NOT_ASSIGNEE"
  | "TECH_OFFLINE"
  | "UNKNOWN"

const STATUS_BY_CODE: Record<string, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_ASSIGNEE: 403,
  NOT_FOUND: 404,
  ILLEGAL_TRANSITION: 409,
  TECH_OFFLINE: 409,
  VALIDATION: 422,
}

export function jsonOk<T>(data: T, status = 200): Response {
  const body: ActionResult<T> = { ok: true, data }
  return Response.json(body, { status })
}

export function jsonErr(
  code: string,
  message: string,
  status?: number,
): Response {
  const body: ActionResult<never> = { ok: false, code, message }
  return Response.json(body, {
    status: status ?? STATUS_BY_CODE[code] ?? 400,
  })
}

export function fail<C extends string>(
  code: C,
  message: string,
): ActionResult<never, C> {
  return { ok: false, code, message }
}
