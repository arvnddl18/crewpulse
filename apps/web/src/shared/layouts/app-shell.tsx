"use client"

import { homePathForRole, isStaffRole, type Role } from "@crewpulse/domain"
import { Briefcase, CircleDot, ClipboardList, CalendarDays, BarChart3, LayoutGrid, LogOut, MapPin, MessageSquare, ScrollText, Settings, ShieldCheck, User, Users, Wrench } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"
import { useMe } from "@/features/auth/use-me"
import { useHeartbeat } from "@/features/presence/use-heartbeat"
import { NotificationBell } from "@/features/notifications/notification-bell"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { cn } from "@/lib/cn"
import { Button } from "@/shared/ui/button"

function useThemeSync() {
  const { data: me } = useMe()
  useEffect(() => {
    if (me?.theme) {
      document.documentElement.dataset.theme = me.theme
      try { localStorage.setItem("crewpulse-theme", me.theme) } catch {}
    }
  }, [me?.theme])
}

export function StaffShell({ children }: { children: ReactNode }) {
  useHeartbeat(true)
  useThemeSync()
  const pathname = usePathname()
  const { data: me } = useMe()

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-bg-muted md:flex">
        <div className="border-b border-border px-5 py-4">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">
            CrewPulse
          </p>
          <p className="mt-1 text-xs text-text-muted">Operations console</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLink
            href="/board"
            active={pathname.startsWith("/board")}
            label="Board"
            icon={<LayoutGrid className="h-4 w-4" />}
          />
          <NavLink
            href="/map"
            active={pathname.startsWith("/map")}
            label="Map"
            icon={<MapPin className="h-4 w-4" />}
          />
          <NavLink
            href="/work-orders"
            active={pathname.startsWith("/work-orders")}
            label="Work orders"
            icon={<ClipboardList className="h-4 w-4" />}
          />
          <NavLink
            href="/messages"
            active={pathname.startsWith("/messages")}
            label="Messages"
            icon={<MessageSquare className="h-4 w-4" />}
          />
          <NavLink
            href="/reports/slot-adherence"
            active={pathname.startsWith("/reports")}
            label="Reports"
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <NavLink
            href="/schedule"
            active={pathname.startsWith("/schedule")}
            label="Schedule"
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <NavLink
            href="/teams"
            active={pathname.startsWith("/teams")}
            label="Teams"
            icon={<Users className="h-4 w-4" />}
          />
          <NavLink
            href="/technicians"
            active={pathname.startsWith("/technicians")}
            label="Technicians"
            icon={<Wrench className="h-4 w-4" />}
          />
          <NavLink
            href="/settings"
            active={pathname.startsWith("/settings") && !pathname.startsWith("/settings/audit") && !pathname.startsWith("/settings/checklists")}
            label="Settings"
            icon={<Settings className="h-4 w-4" />}
          />
          {me?.role === "admin" ? (
            <NavLink
              href="/settings/checklists"
              active={pathname.startsWith("/settings/checklists")}
              label="Checklists"
              icon={<ShieldCheck className="h-4 w-4" />}
            />
          ) : null}
          {me?.role === "admin" ? (
            <NavLink
              href="/settings/audit"
              active={pathname.startsWith("/settings/audit")}
              label="Audit log"
              icon={<ScrollText className="h-4 w-4" />}
            />
          ) : null}
        </nav>
        <div className="border-t border-border p-4 text-xs text-text-muted">
          {me?.fullName}
          <span className="block capitalize">{me?.role.replace("_", " ")}</span>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <StaffTopbar />
        <main id="main" className="flex-1 px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function StaffTopbar() {
  const router = useRouter()

  async function signOut(): Promise<void> {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-bg-muted px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <LayoutGrid className="h-4 w-4 text-primary" aria-hidden />
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-primary">
          CrewPulse
        </span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        <NotificationBell />
        <Button variant="ghost" className="h-9 px-2" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  )
}

function NavLink({
  href,
  active,
  label,
  icon,
}: {
  href: string
  active: boolean
  label: string
  icon: ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-surface text-text"
          : "text-text-muted hover:bg-[var(--surface-hover)] hover:text-text",
      )}
    >
      {icon}
      {label}
    </Link>
  )
}

export function TechnicianShell({ children }: { children: ReactNode }) {
  useThemeSync()
  const pathname = usePathname()
  const router = useRouter()

  async function signOut(): Promise<void> {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-14 items-center justify-between border-b border-border px-4">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">
          CrewPulse
        </p>
        <button
          type="button"
          className="text-xs text-text-muted hover:text-text"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </header>
      <main id="main" className="flex-1 px-4 py-4">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-bg-muted">
        <MobileNavLink href="/jobs" label="Jobs" active={pathname.startsWith("/jobs")} icon={<Briefcase className="h-5 w-5" />} />
        <MobileNavLink href="/status" label="Status" active={pathname.startsWith("/status")} icon={<CircleDot className="h-5 w-5" />} />
        <MobileNavLink href="/messages" label="Chat" active={pathname.startsWith("/messages")} icon={<MessageSquare className="h-5 w-5" />} />
        <MobileNavLink href="/account" label="Account" active={pathname.startsWith("/account")} icon={<User className="h-5 w-5" />} />
      </nav>
    </div>
  )
}

function MobileNavLink({
  href,
  label,
  active,
  icon,
}: {
  href: string
  label: string
  active: boolean
  icon: ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors",
        active ? "text-primary" : "text-text-muted",
      )}
    >
      {icon}
      {label}
    </Link>
  )
}

export function RequireAuth({
  children,
  allowed,
}: {
  children: ReactNode
  allowed: "staff" | "technician" | "any"
}) {
  const router = useRouter()
  const { data: me, isLoading, isError } = useMe()

  const shouldRedirect =
    isError ||
    !me ||
    (allowed === "staff" && me && !isStaffRole(me.role)) ||
    (allowed === "technician" && me && me.role !== "technician")

  const redirectPath =
    isError || !me
      ? "/login"
      : me
        ? homePathForRole(me.role)
        : "/login"

  useEffect(() => {
    if (!isLoading && shouldRedirect) {
      router.replace(redirectPath)
    }
  }, [isLoading, shouldRedirect, redirectPath, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    )
  }

  if (shouldRedirect) {
    return null
  }

  return <>{children}</>
}

export function homeForRole(role: Role): string {
  return homePathForRole(role)
}
