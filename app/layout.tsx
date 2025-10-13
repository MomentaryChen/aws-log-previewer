import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter"
import { ThemeProvider } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import { theme } from "@/lib/mui-theme"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Log Review System",
  description: "Professional log analysis and monitoring dashboard",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Suspense fallback={null}>{children}</Suspense>
            <Analytics />
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
