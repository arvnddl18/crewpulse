import { loadBoard } from "@/db/board"
import { jsonErr, jsonOk } from "@/lib/http"
import { requireStaff, requireUser } from "@/lib/session"

export async function GET(): Promise<Response> {
  const auth = await requireUser()
  if (!auth.ok) {
    return auth.response
  }
  const forbidden = requireStaff(auth)
  if (forbidden) {
    return forbidden
  }
  try {
    const board = await loadBoard(auth.supabase, auth.profile)
    return jsonOk({
      technicians: board.technicians,
      work_orders: board.workOrders,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Board failed"
    return jsonErr("UNKNOWN", message)
  }
}
