"use client"

import { Card } from "@/components/ui/card"
import type { LogEntry } from "@/lib/log-parser"
import { FileText, AlertCircle, AlertTriangle, Info } from "lucide-react"

interface LogStatsProps {
  logs: LogEntry[]
  fileName: string
}

export default function LogStats({ logs, fileName }: LogStatsProps) {
  const errorCount = logs.filter((log) => log.level === "ERROR").length
  const warnCount = logs.filter((log) => log.level === "WARN").length
  const infoCount = logs.filter((log) => log.level === "INFO").length
  const debugCount = logs.filter((log) => log.level === "DEBUG").length

  const stats = [
    {
      label: "總計",
      value: logs.length,
      icon: FileText,
      color: "text-foreground",
      bgColor: "bg-primary/10",
    },
    {
      label: "ERROR",
      value: errorCount,
      icon: AlertCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "WARN",
      value: warnCount,
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "INFO",
      value: infoCount,
      icon: Info,
      color: "text-info",
      bgColor: "bg-info/10",
    },
  ]

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">{fileName}</h2>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{stat.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
