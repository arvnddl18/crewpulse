import {
  isRole,
  type Role,
} from "@crewpulse/domain"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { jsonErr } from "@/lib/http"

export type SessionProfile = {
  id: string
  orgId: string
  fullName: string
  email: string
  phone: string | null
  role: Role
  isActive: boolean
  theme: "dark" | "light"
  emailNotifications: boolean
  locationSharingOptIn: boolean
}

type ProfileRow = {
  id: string
  org_id: string
  full_name: string
  email: string
  phone: string | null
  role: string
  is_active: boolean
  theme: string
  email_notifications: boolean
  location_sharing_opt_in: boolean
}

export function mapProfile(row: ProfileRow): SessionProfile {
  if (!isRole(row.role)) {
    throw new Error("Profile has an invalid role")
  }
  return {
    id: row.id,
    orgId: row.org_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isActive: row.is_active,
    theme: row.theme === "dark" ? "dark" : "light",
    emailNotifications: row.email_notifications,
    locationSharingOptIn: row.location_sharing_opt_in,
  }
}

export type Authed =
  | {
      ok: true
      supabase: SupabaseClient
      user: User
      profile: SessionProfile
    }
  | { ok: false; response: Response }

export async function requireUser(): Promise<Authed> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return {
      ok: false,
      response: jsonErr("UNAUTHENTICATED", "Sign in required", 401),
    }
  }

  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("id, org_id, full_name, email, phone, role, is_active, theme, email_notifications, location_sharing_opt_in")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !data) {
    return {
      ok: false,
      response: jsonErr("FORBIDDEN", "No profile for this account", 403),
    }
  }

  const row = data as ProfileRow
  if (!row.is_active) {
    return {
      ok: false,
      response: jsonErr("FORBIDDEN", "Account is deactivated", 403),
    }
  }

  return {
    ok: true,
    supabase,
    user,
    profile: mapProfile(row),
  }
}

export function requireStaff(auth: Extract<Authed, { ok: true }>): Response | null {
  if (auth.profile.role === "technician") {
    return jsonErr("FORBIDDEN", "Staff only", 403)
  }
  return null
}

export function requireTechnician(
  auth: Extract<Authed, { ok: true }>,
): Response | null {
  if (auth.profile.role !== "technician") {
    return jsonErr("FORBIDDEN", "Technician only", 403)
  }
  return null
}

export function requireAdmin(
  auth: Extract<Authed, { ok: true }>,
): Response | null {
  if (auth.profile.role !== "admin") {
    return jsonErr("FORBIDDEN", "Admin only", 403)
  }
  return null
}
