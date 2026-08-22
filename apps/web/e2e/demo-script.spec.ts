import { expect, test, type Page } from "@playwright/test"

const password = process.env.PLAYWRIGHT_DEMO_PASSWORD ?? "CrewPulseDemo1!"

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/login")
  await expect(page.getByTestId("login-heading")).toBeVisible()
  await expect(page.getByTestId("login-submit")).toBeEnabled()
  await page.getByTestId("login-email").fill(email)
  await page.getByTestId("login-password").fill(password)
  await page.getByTestId("login-submit").click()
}

test("health endpoint is reachable", async ({ request }) => {
  const response = await request.get("/api/health")
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as { ok: boolean }
  expect(body.ok).toBe(true)
})

test("unauthenticated visitors are sent to login", async ({ page }) => {
  await page.goto("/board")
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByTestId("login-heading")).toBeVisible()
  await expect(page.getByTestId("login-form")).toBeVisible()
})

test("dispatcher demo script: login lands on the live board", async ({
  page,
}) => {
  await signIn(page, "dispatch1@crewpulse.demo")
  await expect(page).toHaveURL(/\/board/)
  await expect(page.getByTestId("board-heading")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Technicians" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Work orders" })).toBeVisible()
})

test("technician demo script: login lands on my jobs", async ({ page }) => {
  await signIn(page, "tech3@crewpulse.demo")
  await expect(page).toHaveURL(/\/jobs/)
  await expect(page.getByTestId("jobs-heading")).toBeVisible()
  await expect(page.getByText("My jobs")).toBeVisible()
})
