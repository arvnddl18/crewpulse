import { cn } from "@/lib/cn"
import type { InputHTMLAttributes } from "react"

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-")
  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={inputId}>
      <span className="font-medium text-text">{label}</span>
      <input
        id={inputId}
        className={cn(
          "h-9 rounded-[4px] border border-border bg-bg px-3 text-sm text-text outline-none transition-[border-color,box-shadow] duration-[120ms] focus:border-primary focus:ring-2 focus:ring-primary/30",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
