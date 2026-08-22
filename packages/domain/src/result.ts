export type ActionResult<T, C extends string = string> =
  | { ok: true; data: T }
  | { ok: false; code: C; message: string }
