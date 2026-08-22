import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  const text = readFileSync(envPath, "utf8")
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    const value = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "")
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile()

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY

if (!url || !secret) {
  console.error("Missing SUPABASE_URL and SUPABASE_SECRET_KEY")
  process.exit(1)
}

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const email = "tech2@crewpulse.demo"
  
  console.log(`Checking user: ${email}`)
  
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 })
  const user = listed.users.find((u) => u.email === email)
  
  if (!user) {
    console.log("User NOT FOUND in auth.users")
    return
  }
  
  console.log(`User found in auth.users:`)
  console.log(`  id: ${user.id}`)
  console.log(`  email: ${user.email}`)
  console.log(`  email_confirmed_at: ${user.email_confirmed_at}`)
  console.log(`  app_metadata: ${JSON.stringify(user.app_metadata)}`)
  
  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
  
  if (error) {
    console.log(`Profile query error: ${error.message}`)
    console.log(`Profile NOT FOUND in public.profiles`)
  } else {
    console.log(`Profile found:`)
    console.log(JSON.stringify(profile, null, 2))
  }
}

main().catch(console.error)
