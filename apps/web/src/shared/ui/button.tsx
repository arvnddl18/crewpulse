import { cn } from "@/lib/cn"
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children: ReactNode
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-[var(--primary-fg)] border border-primary hover:brightness-110",
  secondary:
    "bg-transparent text-text border border-border hover:bg-[var(--surface-hover)]",
  ghost: "bg-transparent text-text border border-transparent hover:bg-[var(--surface-hover)]",
  danger: "bg-danger text-white border border-danger hover:brightness-110",
  success: "bg-success text-white border border-success hover:brightness-110",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", className, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-[6px] px-3 text-sm font-medium transition-[transform,background-color,border-color,box-shadow] duration-[120ms] ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50",
        VARIANT[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
})
