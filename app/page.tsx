"use client"

import { useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import Overview from "@/components/overview"
import LogReviewer from "@/components/log-reviewer"
import AnalyticsDashboard from "@/components/analytics-dashboard"
import VersionLog from "@/components/version-log"
import type { LogEntry } from "@/lib/log-parser"

export default function Home() {
  const [currentPage, setCurrentPage] = useState("Overview")
  const [logs, setLogs] = useState<LogEntry[]>([])

  const renderPage = () => {
    switch (currentPage) {
      case "Overview":
        return <Overview logs={logs} />
      case "Log Reviewer":
        return <LogReviewer logs={logs} setLogs={setLogs} />
      case "Analytics":
        return <AnalyticsDashboard logs={logs} />
      case "Version Log":
        return <VersionLog />
      case "Settings":
        return (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold text-foreground">設置</h2>
              <p className="text-muted-foreground">設置功能即將推出</p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <DashboardLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </DashboardLayout>
  )
}
