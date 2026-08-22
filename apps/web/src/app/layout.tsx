import type { Metadata } from "next"
import type { ReactNode } from "react"
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"
import { Toaster } from "sonner"
import { QueryProvider } from "@/shared/providers/query-provider"
import { ThemeScript } from "@/shared/providers/theme-script"
import "./globals.css"

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  title: "CrewPulse",
  description: "Technician team management and monitoring",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[6px] focus:bg-primary focus:px-3 focus:py-2 focus:text-[var(--primary-fg)]"
        >
          Skip to content
        </a>
        <QueryProvider>{children}</QueryProvider>
        <Toaster
          theme="system"
          position="top-center"
          toastOptions={{
            classNames: {
              toast:
                "!rounded-[6px] !border !border-border !bg-surface !text-text !shadow-[var(--shadow-2)]",
            },
          }}
        />
      </body>
    </html>
  )
}
