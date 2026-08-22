import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[6px] border border-border bg-surface",
        className,
      )}
      aria-hidden
    />
  )
}

export function EmptyState({
  message,
  action,
}: {
  message: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-[6px] border border-dashed border-border px-4 py-10 text-center">
      <p className="text-sm text-text-muted">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="rounded-[6px] border border-danger/40 bg-surface p-6" role="alert">
      <p className="text-sm text-danger">{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-4 h-9 rounded-[6px] border border-primary bg-primary px-3 text-sm font-medium text-[var(--primary-fg)]"
          onClick={onRetry}
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}
