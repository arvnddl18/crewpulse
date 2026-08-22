"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { MessageSquare, Send, Search, Plus, ArrowLeft } from "lucide-react"
import { useMe } from "@/features/auth/use-me"
import { apiFetch, ApiError } from "@/lib/api-client"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { cn } from "@/lib/cn"
import { Button } from "@/shared/ui/button"
import { EmptyState } from "@/shared/ui/feedback"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ChatThread = {
  id: string
  otherUserId: string
  otherName: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

type ChatMessage = {
  id: string
  threadId: string
  authorId: string
  authorName: string
  body: string
  createdAt: string
}

type TechnicianListItem = {
  id: string
  fullName: string
  role?: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

function timestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/* ------------------------------------------------------------------ */
/*  New conversation dialog                                            */
/* ------------------------------------------------------------------ */

function NewConversationDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (t: TechnicianListItem) => void
}) {
  const [query, setQuery] = useState("")
  const [people, setPeople] = useState<TechnicianListItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    apiFetch<TechnicianListItem[]>("/api/v1/contacts")
      .then(setPeople)
      .catch(() => setPeople([]))
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  const filtered = people.filter((p) =>
    p.fullName.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]">
      <div className="w-full max-w-sm rounded-[6px] border border-border bg-bg shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium text-text">New conversation</p>
          <button
            type="button"
            className="text-xs text-text-muted hover:text-text"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
        <div className="border-b border-border px-4 py-2">
          <div className="flex items-center gap-2 rounded-[4px] border border-border px-2">
            <Search className="h-3.5 w-3.5 text-text-muted" />
            <input
              className="h-8 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
              placeholder="Search people…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {loading ? (
            <p className="px-2 py-4 text-center text-xs text-text-muted">
              Loading…
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-text-muted">
              No people found.
            </p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-[4px] px-2 py-2 text-left text-sm text-text hover:bg-[var(--surface-hover)]"
                onClick={() => {
                  onSelect(p)
                  onClose()
                }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                  {initials(p.fullName)}
                </span>
                <span>
                  {p.fullName}
                  <span className="ml-2 text-xs capitalize text-text-muted">
                    {p.role?.replace("_", " ") ?? "technician"}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Thread list                                                        */
/* ------------------------------------------------------------------ */

function ThreadList({
  threads,
  activeId,
  onSelect,
  onNew,
  loading,
}: {
  threads: ChatThread[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  loading: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-text">Messages</p>
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={onNew}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-4 py-10 text-center text-xs text-text-muted">
            Loading conversations…
          </p>
        ) : threads.length === 0 ? (
          <div className="px-4 py-10">
            <EmptyState
              message="No conversations yet. Start a new message."
              action={
                <Button variant="primary" onClick={onNew}>
                  <Plus className="h-4 w-4" />
                  New message
                </Button>
              }
            />
          </div>
        ) : (
          threads
            .sort(
              (a, b) =>
                new Date(b.lastMessageAt).getTime() -
                new Date(a.lastMessageAt).getTime(),
            )
            .map((t) => (
              <button
                key={t.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors",
                  activeId === t.id
                    ? "bg-[var(--surface-hover)]"
                    : "hover:bg-[var(--surface-hover)]",
                )}
                onClick={() => onSelect(t.id)}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                  {initials(t.otherName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-text">
                      {t.otherName}
                    </p>
                    <span className="ml-2 shrink-0 text-xs text-text-muted">
                      {relativeTime(t.lastMessageAt)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-text-muted">
                    {t.lastMessage || "No messages yet"}
                  </p>
                </div>
                {t.unreadCount > 0 ? (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white">
                    {t.unreadCount}
                  </span>
                ) : null}
              </button>
            ))
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Message pane                                                       */
/* ------------------------------------------------------------------ */

function MessagePane({
  thread,
  meId,
  onBack,
}: {
  thread: ChatThread
  meId: string
  onBack: () => void
}) {
  const [draft, setDraft] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", thread.id],
    queryFn: () =>
      apiFetch<ChatMessage[]>(
        `/api/v1/chat/threads/${thread.id}/messages`,
      ),
  })

  // Realtime: listen for new messages in this thread
  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel(`chat-${thread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${thread.id}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["chat-messages", thread.id],
          })
          void queryClient.invalidateQueries({ queryKey: ["chat-threads"] })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, thread.id])

  const messages = messagesQuery.data ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      apiFetch<ChatMessage>(
        `/api/v1/chat/threads/${thread.id}/messages`,
        { method: "POST", body: JSON.stringify({ body }) },
      ),
    onSuccess: () => {
      setDraft("")
      void queryClient.invalidateQueries({
        queryKey: ["chat-messages", thread.id],
      })
      void queryClient.invalidateQueries({ queryKey: ["chat-threads"] })
    },
    onError: (e: Error) =>
      toast.error(e instanceof ApiError ? e.message : "Send failed"),
  })

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    sendMutation.mutate(text)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          className="md:hidden text-text-muted hover:text-text"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
          {initials(thread.otherName)}
        </span>
        <p className="text-sm font-medium text-text">{thread.otherName}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messagesQuery.isLoading ? (
          <p className="py-10 text-center text-xs text-text-muted">
            Loading messages…
          </p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-xs text-text-muted">
            Start the conversation. Say hello!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const isSelf = m.authorId === meId
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col",
                    isSelf ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-[6px] border border-border px-3 py-2 text-sm text-text",
                      isSelf ? "bg-primary/20" : "bg-bg-muted",
                    )}
                  >
                    {m.body}
                  </div>
                  <span className="mt-0.5 text-[12px] text-text-muted">
                    {timestamp(m.createdAt)}
                  </span>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
        >
          <input
            className="h-9 flex-1 rounded-[4px] border border-border bg-transparent px-3 text-sm text-text outline-none placeholder:text-text-muted focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg"
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={4000}
          />
          <Button
            type="submit"
            variant="primary"
            className="h-9 w-9 p-0"
            disabled={!draft.trim() || sendMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main shell                                                         */
/* ------------------------------------------------------------------ */

export function MessagesPageShell() {
  const { data: me } = useMe()
  const queryClient = useQueryClient()
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [newDialogOpen, setNewDialogOpen] = useState(false)

  const threadsQuery = useQuery({
    queryKey: ["chat-threads"],
    queryFn: () => apiFetch<ChatThread[]>("/api/v1/chat/threads"),
    enabled: !!me,
  })

  // Realtime: refresh thread list when any thread is updated
  useEffect(() => {
    if (!me) return
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel("chat-threads-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_threads",
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["chat-threads"] })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [me, queryClient])

  const threads = threadsQuery.data ?? []
  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null

  const handleNewConversation = useCallback(
    async (person: TechnicianListItem) => {
      if (!me) return
      try {
        const res = await apiFetch<{ threadId: string }>(
          "/api/v1/chat/threads",
          {
            method: "POST",
            body: JSON.stringify({ otherUserId: person.id }),
          },
        )
        await queryClient.invalidateQueries({ queryKey: ["chat-threads"] })
        setActiveThreadId(res.threadId)
      } catch (e) {
        toast.error(
          e instanceof ApiError ? e.message : "Could not start conversation",
        )
      }
    },
    [me, queryClient],
  )

  if (!me) return null

  return (
    <>
      <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-[6px] border border-border bg-bg">
        {/* Left panel */}
        <div
          className={cn(
            "w-full shrink-0 border-r border-border md:w-[280px]",
            activeThread ? "hidden md:flex md:flex-col" : "flex flex-col",
          )}
        >
          <ThreadList
            threads={threads}
            activeId={activeThreadId}
            onSelect={setActiveThreadId}
            onNew={() => setNewDialogOpen(true)}
            loading={threadsQuery.isLoading}
          />
        </div>

        {/* Right panel */}
        <div
          className={cn(
            "min-w-0 flex-1",
            activeThread ? "flex flex-col" : "hidden md:flex md:flex-col",
          )}
        >
          {activeThread ? (
            <MessagePane
              thread={activeThread}
              meId={me.id}
              onBack={() => setActiveThreadId(null)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-text-muted" />
                <p className="mt-2 text-sm text-text-muted">
                  Select a conversation or start a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewConversationDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        onSelect={handleNewConversation}
      />
    </>
  )
}
