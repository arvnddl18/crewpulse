"use client"

import { cn } from "@/lib/cn"

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
  description,
  size = "md",
  "aria-label": ariaLabel,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
  size?: "sm" | "md"
  "aria-label"?: string
}) {
  const trackW = size === "sm" ? "w-9" : "w-11"
  const trackH = size === "sm" ? "h-5" : "h-6"
  const thumbSize = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5"
  const thumbTranslate = size === "sm" ? "translate-x-4" : "translate-x-5"

  return (
    <label
      className={cn(
        "flex items-start gap-3 text-sm",
        disabled && "opacity-50",
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 shrink-0 rounded-full transition-colors duration-[120ms]",
          trackW,
          trackH,
          checked
            ? "bg-primary"
            : "bg-border",
          !disabled && "cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-[120ms]",
            thumbSize,
            checked && thumbTranslate,
          )}
        />
      </button>
      {(label || description) ? (
        <span className="flex flex-col gap-0.5">
          {label ? <span className="font-medium">{label}</span> : null}
          {description ? (
            <span className="text-xs text-text-muted">{description}</span>
          ) : null}
        </span>
      ) : null}
    </label>
  )
}
