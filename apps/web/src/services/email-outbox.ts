import type { SupabaseClient } from "@supabase/supabase-js"

export type EmailOutboxRow = {
  id: string
  org_id: string
  to_email: string
  subject: string
  body: string
  notification_type: string
  attempts: number
}

export type EmailSender = (row: EmailOutboxRow) => Promise<void>

const BATCH_LIMIT = 20

export function createResendSender(apiKey: string, from: string): EmailSender {
  return async (row) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [row.to_email],
        subject: row.subject,
        text: row.body,
      }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      throw new Error(detail || `Resend HTTP ${response.status}`)
    }
  }
}

export function createConsoleSender(): EmailSender {
  return async (row) => {
    console.info(
      `[email-outbox] to=${row.to_email} type=${row.notification_type} subject=${row.subject}`,
    )
  }
}

export function resolveEmailSender(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim() ?? "CrewPulse <onboarding@resend.dev>"
  if (apiKey) {
    return createResendSender(apiKey, from)
  }
  return createConsoleSender()
}

export async function flushEmailOutbox(
  supabase: SupabaseClient,
  orgId?: string,
): Promise<{ processed: number; sent: number; failed: number }> {
  let query = supabase
    .from("email_outbox")
    .select("id, org_id, to_email, subject, body, notification_type, attempts")
    .eq("status", "pending")
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT)

  if (orgId) {
    query = query.eq("org_id", orgId)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as EmailOutboxRow[]
  const sender = resolveEmailSender()
  let sent = 0
  let failed = 0

  for (const row of rows) {
    const now = new Date().toISOString()
    try {
      await sender(row)
      const { error: updateError } = await supabase
        .from("email_outbox")
        .update({
          status: "sent",
          sent_at: now,
          attempts: row.attempts + 1,
          error: null,
        })
        .eq("id", row.id)
      if (updateError) {
        throw new Error(updateError.message)
      }
      sent += 1
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Send failed"
      failed += 1
      await supabase
        .from("email_outbox")
        .update({
          status: row.attempts + 1 >= 4 ? "failed" : "pending",
          attempts: row.attempts + 1,
          error: message.slice(0, 500),
        })
        .eq("id", row.id)
    }
  }

  return { processed: rows.length, sent, failed }
}
