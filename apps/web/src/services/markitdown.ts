import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn } from "node:child_process"

const MARKITDOWN_TIMEOUT_MS = 120_000

export async function convertWithMarkItDown(
  buffer: Buffer,
  originalFilename: string,
): Promise<string | null> {
  const dir = await mkdtemp(join(tmpdir(), "crewpulse-md-"))
  const inputPath = join(dir, sanitizeFilename(originalFilename))
  const outputPath = join(dir, "output.md")

  try {
    await writeFile(inputPath, buffer)
    await runMarkItDown(inputPath, outputPath)
    return await readFile(outputPath, "utf8")
  } catch {
    return null
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").slice(0, 120) || "upload.bin"
}

function runMarkItDown(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "uvx",
      ["--from", "markitdown[xlsx,pdf]", "markitdown", inputPath, "-o", outputPath],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    )

    let stderr = ""
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    const timer = setTimeout(() => {
      child.kill()
      reject(new Error("MarkItDown timed out"))
    }, MARKITDOWN_TIMEOUT_MS)

    child.on("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })

    child.on("close", (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(stderr.trim() || `MarkItDown exited with code ${code}`))
    })
  })
}
