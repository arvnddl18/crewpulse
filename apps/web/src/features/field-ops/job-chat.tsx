"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useMe } from "@/features/auth/use-me"
import { apiFetch, ApiError } from "@/lib/api-client"
import type { WorkOrderMessageView } from "@/lib/types"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/shared/ui/button"
import { cn } from "@/lib/cn"

export function JobChatPanel({ workOrderId }: { workOrderId: string }) {
  const { data: me } = useMe()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const messagesQuery = useQuery({
    queryKey: ["messages", workOrderId],
    queryFn: () => apiFetch<WorkOrderMessageView[]>(`/api/v1/work-orders/${workOrderId}/messages`),
  })

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel(`wo-messages-${workOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "work_order_messages",
          filter: `work_order_id=eq.${workOrderId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["messages", workOrderId] })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, workOrderId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messagesQuery.data?.length])

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      apiFetch(`/api/v1/work-orders/${workOrderId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setDraft("")
      void queryClient.invalidateQueries({ queryKey: ["messages", workOrderId] })
    },
    onError: (e: Error) =>
      toast.error(e instanceof ApiError ? e.message : "Send failed"),
  })

  const messages = messagesQuery.data ?? []

  return (
    <section className="flex flex-col gap-3 rounded-[6px] border border-border bg-surface">
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.04em] text-text-muted">
          Job chat
        </h2>
        <p className="mt-0.5 text-xs text-text-muted">
          Dispatcher, assignee, and team lead only.
        </p>
      </header>

      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto px-4 py-2">
        {messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">No messages yet.</p>
        ) : (
          messages.map((msg) => {
            const mine = msg.authorId === me?.id
            return (
              <div
                key={msg.id}
                className={cn("flex flex-col gap-0.5", mine ? "items-end" : "items-start")}
              >
                <span className="text-xs text-text-muted">
                  {mine ? "You" : msg.authorName} ·{" "}
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
                {msg.body ? (
                  <p
                    className={cn(
                      "max-w-[85%] rounded-[6px] px-3 py-2 text-sm",
                      mine ? "bg-primary/20 text-text" : "bg-bg-muted text-text",
                    )}
                  >
                    {msg.body}
                  </p>
                ) : null}
                {msg.attachmentId ? (
                  <ChatPhoto attachmentId={msg.attachmentId} />
                ) : null}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault()
          const text = draft.trim()
          if (!text) return
          sendMutation.mutate(text)
        }}
      >
        <input
          type="text"
          className="h-9 min-w-0 flex-1 rounded-[4px] border border-border bg-bg px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
        />
        <Button type="submit" variant="primary" disabled={sendMutation.isPending || !draft.trim()}>
          Send
        </Button>
      </form>
    </section>
  )
}

function ChatPhoto({ attachmentId }: { attachmentId: string }) {
  const urlQuery = useQuery({
    queryKey: ["attachment-url", attachmentId],
    queryFn: async () => {
      const res = await apiFetch<{ url: string }>(`/api/v1/attachments/${attachmentId}`)
      return res.url
    },
  })

  if (urlQuery.isLoading) {
    return <span className="text-xs text-text-muted">Loading photo…</span>
  }
  if (!urlQuery.data) {
    return null
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={urlQuery.data}
      alt="Chat attachment"
      className="max-h-40 max-w-[200px] rounded-[4px] border border-border object-cover"
    />
  )
}
