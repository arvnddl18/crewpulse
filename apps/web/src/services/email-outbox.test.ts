import { describe, expect, it, vi } from "vitest"
import {
  createConsoleSender,
  createResendSender,
  resolveEmailSender,
} from "./email-outbox"

describe("resolveEmailSender", () => {
  it("uses console sender when RESEND_API_KEY is unset", () => {
    const prev = process.env.RESEND_API_KEY
    delete process.env.RESEND_API_KEY
    const sender = resolveEmailSender()
    expect(sender).toBeTypeOf("function")
    process.env.RESEND_API_KEY = prev
  })
})

describe("createConsoleSender", () => {
  it("logs without throwing", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {})
    await createConsoleSender()({
      id: "1",
      org_id: "org",
      to_email: "tech@example.com",
      subject: "Job assigned",
      body: "WO-1",
      notification_type: "job_assigned",
      attempts: 0,
    })
    expect(info).toHaveBeenCalled()
    info.mockRestore()
  })
})

describe("createResendSender", () => {
  it("posts to Resend API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    await createResendSender("re_test", "CrewPulse <test@resend.dev>")({
      id: "1",
      org_id: "org",
      to_email: "tech@example.com",
      subject: "Job assigned",
      body: "WO-1",
      notification_type: "job_assigned",
      attempts: 0,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    )

    vi.unstubAllGlobals()
  })
})
