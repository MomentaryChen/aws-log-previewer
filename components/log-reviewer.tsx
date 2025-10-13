"use client"

import type React from "react"

import { useState } from "react"
import {
  Upload,
  FileText,
  Search,
  Filter,
  Download,
  X,
  FolderOpen,
  Calendar,
  Bookmark,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import LogViewer from "@/components/log-viewer"
import LogStats from "@/components/log-stats"
import { parseLogFile, type LogEntry } from "@/lib/log-parser"

interface LogReviewerProps {
  logs: LogEntry[]
  setLogs: (logs: LogEntry[]) => void
}

export default function LogReviewer({ logs, setLogs }: LogReviewerProps) {
  const [fileName, setFileName] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [levelFilter, setLevelFilter] = useState<string>("all")
  const [isDragging, setIsDragging] = useState(false)
  const [fileNamePattern, setFileNamePattern] = useState<string>("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [bookmarkedLogs, setBookmarkedLogs] = useState<Set<number>>(new Set())

  const handleFileUpload = async (file: File) => {
    const text = await file.text()
    const parsedLogs = parseLogFile(text)

    console.log("[v0] Parsed logs count:", parsedLogs.length)
    console.log("[v0] First log entry:", parsedLogs[0])

    setLogs(parsedLogs)
    setFileName(file.name)
  }

  const handleFolderUpload = async (files: FileList) => {
    const allLogs: LogEntry[] = []
    const fileNames: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (fileNamePattern && !file.name.includes(fileNamePattern)) {
        continue
      }

      if (file.name.match(/\.(log|txt|text|json)$/i)) {
        try {
          const text = await file.text()
          const parsedLogs = parseLogFile(text)

          const logsWithSource = parsedLogs.map((log) => ({
            ...log,
            source: file.name,
          }))

          allLogs.push(...logsWithSource)
          fileNames.push(file.name)
        } catch (error) {
          console.error(`[v0] Error parsing file ${file.name}:`, error)
        }
      }
    }

    console.log("[v0] Total logs from folder:", allLogs.length)
    console.log("[v0] Files processed:", fileNames.length)

    setLogs(allLogs)
    setFileName(`${fileNames.length} 個文件 (${allLogs.length} 條日誌)`)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFolderUpload(files)
    }
  }

  const filteredLogs = logs.filter((log, index) => {
    let matchesSearch = true
    if (searchQuery) {
      if (useRegex) {
        try {
          const regex = new RegExp(searchQuery, "i")
          matchesSearch = regex.test(log.message) || regex.test(log.timestamp)
        } catch {
          matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase())
        }
      } else {
        matchesSearch =
          log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.timestamp.toLowerCase().includes(searchQuery.toLowerCase())
      }
    }

    const matchesLevel = levelFilter === "all" || log.level === levelFilter

    const matchesSource = sourceFilter === "all" || log.source === sourceFilter

    let matchesDateRange = true
    if (dateRange.start || dateRange.end) {
      const logDate = new Date(log.timestamp)
      if (dateRange.start && logDate < new Date(dateRange.start)) {
        matchesDateRange = false
      }
      if (dateRange.end && logDate > new Date(dateRange.end)) {
        matchesDateRange = false
      }
    }

    return matchesSearch && matchesLevel && matchesSource && matchesDateRange
  })

  const uniqueSources = Array.from(new Set(logs.map((log) => log.source).filter(Boolean)))

  const clearLogs = () => {
    setLogs([])
    setFileName("")
    setSearchQuery("")
    setLevelFilter("all")
    setFileNamePattern("")
    setDateRange({ start: "", end: "" })
    setSourceFilter("all")
    setBookmarkedLogs(new Set())
    setUseRegex(false)
  }

  const exportLogs = (format: "json" | "csv" | "txt" = "json") => {
    let dataStr = ""
    let mimeType = ""
    let extension = ""

    switch (format) {
      case "json":
        dataStr = JSON.stringify(filteredLogs, null, 2)
        mimeType = "application/json"
        extension = "json"
        break
      case "csv":
        const headers = ["Timestamp", "Level", "Message", "Source", "EventId"]
        const csvRows = [
          headers.join(","),
          ...filteredLogs.map((log) =>
            [
              `"${log.timestamp}"`,
              log.level,
              `"${log.message.replace(/"/g, '""')}"`,
              `"${log.source || ""}"`,
              log.eventId || "",
            ].join(","),
          ),
        ]
        dataStr = csvRows.join("\n")
        mimeType = "text/csv"
        extension = "csv"
        break
      case "txt":
        dataStr = filteredLogs
          .map((log) => `[${log.timestamp}] [${log.level}] ${log.message}${log.source ? ` (${log.source})` : ""}`)
          .join("\n\n")
        mimeType = "text/plain"
        extension = "txt"
        break
    }

    const dataBlob = new Blob([dataStr], { type: mimeType })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `logs-export-${Date.now()}.${extension}`
    link.click()
    URL.revokeObjectURL(url)
  }

  const toggleBookmark = (index: number) => {
    const newBookmarks = new Set(bookmarkedLogs)
    if (newBookmarks.has(index)) {
      newBookmarks.delete(index)
    } else {
      newBookmarks.add(index)
    }
    setBookmarkedLogs(newBookmarks)
  }

  return (
    <div className="h-full w-full">
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        {logs.length === 0 ? (
          <Card
            className={`relative border-2 border-dashed transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="flex min-h-[400px] flex-col items-center justify-center p-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">上傳日誌文件</h2>
              <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                拖放文件到此處，或點擊下方按鈕選擇文件。支持 .log, .txt, .text, .json 等文本格式。
              </p>

              <div className="mb-4 w-full max-w-sm">
                <Input
                  placeholder="文件名過濾（選填，例如：error, 2025-01）"
                  value={fileNamePattern}
                  onChange={(e) => setFileNamePattern(e.target.value)}
                  className="text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">設置後，只會載入包含此關鍵字的文件</p>
              </div>

              <div className="flex gap-3">
                <label htmlFor="file-upload">
                  <Button className="cursor-pointer gap-2" variant="default" asChild>
                    <span>
                      <FileText className="h-4 w-4" />
                      選擇文件
                    </span>
                  </Button>
                </label>
                <label htmlFor="folder-upload">
                  <Button className="cursor-pointer gap-2 bg-transparent" variant="outline" asChild>
                    <span>
                      <FolderOpen className="h-4 w-4" />
                      選擇文件夾
                    </span>
                  </Button>
                </label>
              </div>

              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".log,.txt,.text,.json"
                onChange={handleFileInput}
              />
              <input
                id="folder-upload"
                type="file"
                className="hidden"
                // @ts-ignore
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFolderInput}
              />
            </div>
          </Card>
        ) : (
          <div className="w-full space-y-6">
            <div className="relative">
              <LogStats logs={logs} fileName={fileName} />
              <div className="absolute right-0 top-0 flex items-center gap-2">
                <div className="relative group">
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Download className="h-4 w-4" />
                    導出
                  </Button>
                  <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10">
                    <Card className="p-2 space-y-1 min-w-[120px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => exportLogs("json")}
                      >
                        JSON 格式
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => exportLogs("csv")}
                      >
                        CSV 格式
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => exportLogs("txt")}
                      >
                        TXT 格式
                      </Button>
                    </Card>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={clearLogs} className="gap-2 bg-transparent">
                  <X className="h-4 w-4" />
                  清除
                </Button>
              </div>
            </div>

            <Card className="bg-card p-4">
              <div className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={useRegex ? "正則表達式搜索..." : "搜索日誌內容或時間戳..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={levelFilter}
                      onChange={(e) => setLevelFilter(e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
                    >
                      <option value="all">所有級別</option>
                      <option value="ERROR">ERROR</option>
                      <option value="WARN">WARN</option>
                      <option value="INFO">INFO</option>
                      <option value="DEBUG">DEBUG</option>
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className="gap-2"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      高級
                    </Button>
                  </div>
                </div>

                {showAdvancedFilters && (
                  <div className="space-y-3 border-t border-border pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={useRegex}
                          onChange={(e) => setUseRegex(e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span className="text-foreground">使用正則表達式</span>
                      </label>

                      {uniqueSources.length > 0 && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <select
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
                          >
                            <option value="all">所有來源</option>
                            {uniqueSources.map((source) => (
                              <option key={source} value={source}>
                                {source}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">日期範圍：</span>
                      <Input
                        type="datetime-local"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="text-sm"
                        placeholder="開始時間"
                      />
                      <span className="text-sm text-muted-foreground">至</span>
                      <Input
                        type="datetime-local"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="text-sm"
                        placeholder="結束時間"
                      />
                      {(dateRange.start || dateRange.end) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDateRange({ start: "", end: "" })}
                          className="text-xs"
                        >
                          清除
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    顯示 <span className="font-semibold text-foreground">{filteredLogs.length}</span> / {logs.length}{" "}
                    條日誌
                  </span>
                  {bookmarkedLogs.size > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Bookmark className="h-3 w-3" />
                      {bookmarkedLogs.size} 個書籤
                    </span>
                  )}
                </div>
              </div>
            </Card>

            <LogViewer logs={filteredLogs} bookmarkedLogs={bookmarkedLogs} onToggleBookmark={toggleBookmark} />
          </div>
        )}
      </div>
    </div>
  )
}
