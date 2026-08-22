import { createServiceSupabaseClient } from "@/lib/supabase/service"
import { flushEmailOutbox } from "@/services/email-outbox"

export function scheduleEmailFlush(orgId: string): void {
  void (async () => {
    try {
      const supabase = createServiceSupabaseClient()
      await flushEmailOutbox(supabase, orgId)
    } catch (error) {
      console.error("[email-outbox] flush failed", error)
    }
  })()
}
