"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useMe } from "@/features/auth/use-me"
import { apiFetch, ApiError } from "@/lib/api-client"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Toggle } from "@/shared/ui/toggle"

export function SettingsPageShell() {
  const { data: me } = useMe()
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [theme, setTheme] = useState<"dark" | "light">("light")
  const [emailNotifications, setEmailNotifications] = useState(true)

  useEffect(() => {
    if (me) {
      setFullName(me.fullName)
      setPhone(me.phone ?? "")
      setTheme(me.theme)
      setEmailNotifications(me.emailNotifications)
      document.documentElement.dataset.theme = me.theme
      try { localStorage.setItem("crewpulse-theme", me.theme) } catch {}
    }
  }, [me])

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName,
          phone: phone || null,
          theme,
          email_notifications: emailNotifications,
        }),
      }),
    onSuccess: () => {
      document.documentElement.dataset.theme = theme
      try { localStorage.setItem("crewpulse-theme", theme) } catch {}
      toast.success("Settings saved")
      void queryClient.invalidateQueries({ queryKey: ["me"] })
    },
    onError: (e: Error) =>
      toast.error(e instanceof ApiError ? e.message : "Save failed"),
  })

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">Profile and display preferences.</p>
      </header>

      <form
        className="flex flex-col gap-4 rounded-[6px] border border-border bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate()
        }}
      >
        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Email" value={me?.email ?? ""} disabled />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Theme</span>
          <select
            className="h-9 rounded-[4px] border border-border bg-bg px-3"
            value={theme}
            onChange={(e) => {
              const next = e.target.value as "dark" | "light"
              setTheme(next)
              document.documentElement.dataset.theme = next
            }}
          >
            <option value="light">Light (paper)</option>
            <option value="dark">Dark (control room)</option>
          </select>
        </label>
        <Toggle
          checked={emailNotifications}
          onChange={setEmailNotifications}
          label="Email notifications"
          description="Get an email when you receive job notifications"
        />
        <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
          Save changes
        </Button>
      </form>

      {me ? (
        <dl className="rounded-[6px] border border-border bg-surface p-4 text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-text-muted">Role</dt>
            <dd className="capitalize">{me.role.replace("_", " ")}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}
