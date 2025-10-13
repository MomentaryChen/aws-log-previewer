"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { LogEntry } from "@/lib/log-parser"
import { AlertCircle, AlertTriangle, Info, Bug, ChevronDown, ChevronRight, Bookmark, Copy, Check } from "lucide-react"

interface LogViewerProps {
  logs: LogEntry[]
  bookmarkedLogs?: Set<number>
  onToggleBookmark?: (index: number) => void
}

export default function LogViewer({ logs, bookmarkedLogs = new Set(), onToggleBookmark }: LogViewerProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const toggleLog = (index: number) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedLogs(newExpanded)
  }

  const copyLog = (log: LogEntry, index: number) => {
    const text = `[${log.timestamp}] [${log.level}] ${log.message}${log.source ? `\nSource: ${log.source}` : ""}`
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const isMessageLong = (message: string) => message.length > 150

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "ERROR":
        return <AlertCircle className="h-4 w-4" />
      case "WARN":
        return <AlertTriangle className="h-4 w-4" />
      case "INFO":
        return <Info className="h-4 w-4" />
      case "DEBUG":
        return <Bug className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "ERROR":
        return "text-destructive"
      case "WARN":
        return "text-warning"
      case "INFO":
        return "text-info"
      case "DEBUG":
        return "text-muted-foreground"
      default:
        return "text-foreground"
    }
  }

  const getLevelBgColor = (level: string) => {
    switch (level) {
      case "ERROR":
        return "bg-destructive/10"
      case "WARN":
        return "bg-warning/10"
      case "INFO":
        return "bg-info/10"
      case "DEBUG":
        return "bg-muted"
      default:
        return "bg-muted"
    }
  }

  if (logs.length === 0) {
    return (
      <Card className="bg-card p-12 text-center">
        <p className="text-muted-foreground">沒有找到匹配的日誌條目</p>
      </Card>
    )
  }

  return (
    <Card className="bg-card">
      <div className="divide-y divide-border">
        {logs.map((log, index) => {
          const isExpanded = expandedLogs.has(index)
          const messageTooLong = isMessageLong(log.message)
          const displayMessage = messageTooLong && !isExpanded ? log.message.slice(0, 150) + "..." : log.message
          const isBookmarked = bookmarkedLogs.has(index)

          return (
            <div
              key={index}
              className={`group relative p-4 transition-colors hover:bg-accent/50 ${isBookmarked ? "bg-primary/5" : ""}`}
            >
              <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {onToggleBookmark && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleBookmark(index)}
                    className="h-7 w-7 p-0"
                    title={isBookmarked ? "取消書籤" : "添加書籤"}
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-primary text-primary" : ""}`} />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyLog(log, index)}
                  className="h-7 w-7 p-0"
                  title="複製日誌"
                >
                  {copiedIndex === index ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded ${getLevelBgColor(
                    log.level,
                  )} ${getLevelColor(log.level)}`}
                >
                  {getLevelIcon(log.level)}
                </div>
                <div className="min-w-0 flex-1 pr-16">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-semibold ${getLevelColor(log.level)}`}>{log.level}</span>
                    <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                    {log.source && (
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                        {log.source}
                      </span>
                    )}
                    {log.logStreamName && (
                      <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs text-secondary-foreground">
                        {log.logStreamName}
                      </span>
                    )}
                    {log.eventId && (
                      <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                        ID: {log.eventId}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                      {displayMessage}
                    </p>
                    {messageTooLong && (
                      <button
                        onClick={() => toggleLog(index)}
                        className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="h-3 w-3" />
                            收起
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-3 w-3" />
                            展開完整內容
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {log.ingestionTime && (
                    <div className="mt-1 text-xs text-muted-foreground">攝入時間: {log.ingestionTime}</div>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 rounded bg-secondary p-2">
                      <pre className="font-mono text-xs text-secondary-foreground overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
