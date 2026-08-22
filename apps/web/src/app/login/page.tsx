"use client"

import { homePathForRole } from "@crewpulse/domain"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(signInError.message)
        return
      }

      const meRes = await fetch("/api/v1/me", { credentials: "same-origin" })
      const meBody = (await meRes.json()) as {
        ok: boolean
        data?: { role: string }
        message?: string
      }
      if (!meBody.ok || !meBody.data) {
        setError(meBody.message ?? "Could not load profile")
        return
      }

      const role = meBody.data.role
      if (
        role !== "admin" &&
        role !== "dispatcher" &&
        role !== "team_lead" &&
        role !== "technician"
      ) {
        setError("Unknown role on profile")
        return
      }

      toast.success("Signed in")
      router.push(homePathForRole(role))
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign in failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16"
    >
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">
        CrewPulse
      </p>
      <h1 className="mt-2 text-2xl font-semibold" data-testid="login-heading">Sign in</h1>
      <p className="mt-2 text-sm text-text-muted">
        Dispatcher console or technician job view.
      </p>

      <form
        className="mt-8 flex flex-col gap-4"
        data-testid="login-form"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          data-testid="login-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          data-testid="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          className="mt-2 h-11 w-full"
          data-testid="login-submit"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  )
}
