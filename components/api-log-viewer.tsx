"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Grid,
  Paper,
} from "@mui/material"
import { CloudDownload, Info, Schedule, Storage } from "@mui/icons-material"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import type { LogEntry } from "@/lib/log-parser"

interface ApiLogResponse {
  info: {
    podName: string
    containerName: string
    initContainerName: string
    fromDate: string
    toDate: string
    truncated: boolean
  }
  selection: {
    referencePoint: {
      timestamp: string
      lineNum: number
    }
    offsetFrom: number
    offsetTo: number
    logFilePosition: string
  }
  logs: Array<{
    timestamp: string
    content: string
  }>
}

export default function ApiLogViewer() {
  const [baseUrl, setBaseUrl] = useState("https://k8s-dashboard.example.com/api/v1/log/<namespace>/<pod>/<container>")
  const [authToken, setAuthToken] = useState("")
  const [logFilePosition, setLogFilePosition] = useState("end")
  const [referenceTimestamp, setReferenceTimestamp] = useState("2025-10-20T06:26:23.103435625Z")
  const [referenceLineNum, setReferenceLineNum] = useState("-1")
  const [offsetFrom, setOffsetFrom] = useState("0")
  const [offsetTo, setOffsetTo] = useState("5000")
  const [previous, setPrevious] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiResponse, setApiResponse] = useState<ApiLogResponse | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [levelFilter, setLevelFilter] = useState<string>("ALL")
  const [keyword, setKeyword] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  const [displayedLogs, setDisplayedLogs] = useState<LogEntry[]>([])
  const [loadMore, setLoadMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("")
  const [startTime, setStartTime] = useState<string>("")
  const [endTime, setEndTime] = useState<string>("")
  const [relativeRange, setRelativeRange] = useState<string>("30m")

  // 將Date格式化為 datetime-local 可用字串 (yyyy-MM-ddTHH:mm)
  const formatForInput = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0")
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const hh = pad(date.getHours())
    const mm = pad(date.getMinutes())
    return `${y}-${m}-${d}T${hh}:${mm}`
  }

  // 根據相對時間預設 start/end
  const applyRelativeRange = (range: string) => {
    const now = new Date()
    let from = new Date(now)
    if (range === "24h") from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    else if (range === "6h") from = new Date(now.getTime() - 6 * 60 * 60 * 1000)
    else if (range === "1h") from = new Date(now.getTime() - 1 * 60 * 60 * 1000)
    else if (range === "30m") from = new Date(now.getTime() - 30 * 60 * 1000)
    else if (range === "15m") from = new Date(now.getTime() - 15 * 60 * 1000)
    else if (range === "5m") from = new Date(now.getTime() - 5 * 60 * 1000)
    
    setStartTime(formatForInput(from))
    setEndTime(formatForInput(now))
  }

  // 处理SSR水合问题
  useEffect(() => {
    setMounted(true)
    // 初始套用相對時間 30m
    applyRelativeRange("30m")
  }, [])

  // 过滤日志函数
  const applyFilters = (logsToFilter: LogEntry[]) => {
    return logsToFilter.filter(log => {
      const levelMatch = levelFilter === "ALL" || log.level === levelFilter
      const keywordMatch = debouncedKeyword.trim() === "" || 
        (log.message?.toLowerCase().includes(debouncedKeyword.toLowerCase()) || 
         log.source?.toLowerCase().includes(debouncedKeyword.toLowerCase()))
      
      // 时间范围过滤
      let timeMatch = true
      if (startTime || endTime) {
        const logTime = new Date(log.timestamp)
        if (startTime) {
          const start = new Date(startTime)
          timeMatch = timeMatch && logTime >= start
        }
        if (endTime) {
          const end = new Date(endTime)
          timeMatch = timeMatch && logTime <= end
        }
      }
      
      return levelMatch && keywordMatch && timeMatch
    })
  }

  // 关键字防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword)
    }, 1000) // 1秒缓冲

    return () => clearTimeout(timer)
  }, [keyword])

  // 当过滤条件改变时重新过滤
  useEffect(() => {
    if (logs.length > 0) {
      const filtered = applyFilters(logs)
      setFilteredLogs(filtered)
      // 重置懒加载状态
      setDisplayedLogs(filtered.slice(0, 50)) // 初始显示50条
      setHasMore(filtered.length > 50)
      setLoadMore(false)
    }
  }, [logs, levelFilter, debouncedKeyword, startTime, endTime])

  // 懒加载更多数据
  useEffect(() => {
    if (loadMore && hasMore) {
      const currentLength = displayedLogs.length
      const nextBatch = filteredLogs.slice(currentLength, currentLength + 50)
      setDisplayedLogs(prev => [...prev, ...nextBatch])
      setHasMore(currentLength + 50 < filteredLogs.length)
      setLoadMore(false)
    }
  }, [loadMore, hasMore, filteredLogs, displayedLogs.length])

  // 加载更多函数
  const handleLoadMore = () => {
    setLoadMore(true)
  }

  // 滚动到底部自动加载更多
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100 // 距离底部100px时触发
    
    if (isNearBottom && hasMore && !loadMore) {
      setLoadMore(true)
    }
  }

  const handleFetchLogs = async () => {
    if (!baseUrl.trim()) {
      setError("請輸入基礎URL")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 構建完整的API URL
      const apiUrl = new URL(baseUrl)
      apiUrl.searchParams.set("logFilePosition", logFilePosition)
      apiUrl.searchParams.set("referenceTimestamp", referenceTimestamp)
      apiUrl.searchParams.set("referenceLineNum", referenceLineNum)
      apiUrl.searchParams.set("offsetFrom", offsetFrom)
      apiUrl.searchParams.set("offsetTo", offsetTo)
      apiUrl.searchParams.set("previous", previous.toString())

      // 使用代理API進行GET請求
      const baseOrigin = typeof window !== 'undefined' ? window.location.origin : ''
      const proxyUrl = new URL("/api/logs", baseOrigin)
      proxyUrl.searchParams.set("apiUrl", apiUrl.toString())
      if (authToken.trim()) {
        try {
          localStorage.setItem('apiLogAuthCookie', authToken)
        } catch {}
        proxyUrl.searchParams.set("authToken", authToken)
      }

      const response = await fetch(proxyUrl.toString(), {
        method: "GET",
      })

      if (!response.ok) {
        // 非200也尝试读文本以便显示错误页面内容
        const errText = await response.text()
        throw new Error(`API請求失敗: ${response.status} ${response.statusText}\n${errText}`)
      }

      // 按content-type解析
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        const data: ApiLogResponse = await response.json()
        setApiResponse(data)

        // 轉換API日誌格式為系統LogEntry格式，將沒有級別標識的日誌歸類到最靠近的有級別日誌
        const convertedLogs: LogEntry[] = []
        let currentLevel = "INFO" // 當前級別，默認為INFO
        
        for (let i = 0; i < data.logs.length; i++) {
          const log = data.logs[i]
          const content = log.content
          let level = currentLevel // 使用當前級別
          
          // 檢查是否有明確的級別標識
          if (content.includes('[ERROR]') || content.includes('[error]') || content.includes('[ERROR ]') || content.includes('[error ]')) {
            level = "ERROR"
            currentLevel = "ERROR" // 更新當前級別
          } else if (content.includes('[WARN]') || content.includes('[warn]') || content.includes('[WARN ]') || content.includes('[warn ]')) {
            level = "WARN"
            currentLevel = "WARN" // 更新當前級別
          } else if (content.includes('[DEBUG]') || content.includes('[debug]') || content.includes('[DEBUG ]') || content.includes('[debug ]')) {
            level = "DEBUG"
            currentLevel = "DEBUG" // 更新當前級別
          } else if (content.includes('[INFO]') || content.includes('[info]') || content.includes('[INFO ]') || content.includes('[info ]')) {
            level = "INFO"
            currentLevel = "INFO" // 更新當前級別
          } else if (content.includes('[FATAL]') || content.includes('[fatal]') || content.includes('[FATAL ]') || content.includes('[fatal ]')) {
            level = "ERROR"
            currentLevel = "ERROR" // 更新當前級別
          } else if (content.includes('[TRACE]') || content.includes('[trace]') || content.includes('[TRACE ]') || content.includes('[trace ]')) {
            level = "DEBUG"
            currentLevel = "DEBUG" // 更新當前級別
          }
          // 如果沒有明確級別標識，使用當前級別（歸類到最靠近的有級別日誌）

          convertedLogs.push({
            timestamp: log.timestamp,
            level,
            message: log.content,
            source: data.info.containerName,
            metadata: {
              podName: data.info.podName,
              containerName: data.info.containerName,
            },
          })
        }

        setLogs(convertedLogs)
        // 立即应用过滤
        setFilteredLogs(applyFilters(convertedLogs))
      } else {
        // 不是JSON时，直接展示原始文本
        const raw = await response.text()
        setApiResponse(null)
        const rawLogs = [
          {
            timestamp: new Date().toISOString(),
            level: "INFO",
            message: raw,
            source: "raw",
            metadata: {},
          } as unknown as LogEntry,
        ]
        setLogs(rawLogs)
        // 立即应用过滤
        setFilteredLogs(applyFilters(rawLogs))
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "未知錯誤")
      setApiResponse(null)
      setLogs([])
      setFilteredLogs([])
    } finally {
      setLoading(false)
    }
  }

  // 初始化時從localStorage恢復Cookie
  useEffect(() => {
    try {
      const saved = localStorage.getItem('apiLogAuthCookie')
      if (saved) setAuthToken(saved)
    } catch {}
  }, [])

  const handleExport = () => {
    if (!apiResponse) return

    const dataStr = JSON.stringify(apiResponse, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `api-logs-${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 避免SSR水合问题
  if (!mounted) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 120px)" }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, height: "calc(100vh - 120px)" }}>
      {/* API配置區域 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CloudDownload />
            K8s Dashboard API 日誌查詢
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            輸入 K8s Dashboard 的日誌 API URL 與認證 Cookie 後查詢日誌，例如：
            https://k8s-dashboard.example.com/api/v1/log/namespace/pod/container
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="基礎URL"
                placeholder="https://k8s-admin-beta.optimportal.com/api/v1/log/..."
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={loading}
                helperText="Kubernetes日誌API的基礎URL"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="認證Token (Cookie)"
                placeholder="alpha-globalAccessToken=...; beta-globalAccessToken=..."
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                disabled={loading}
                multiline
                rows={2}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                日誌查詢參數
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="日誌文件位置"
                value={logFilePosition}
                onChange={(e) => setLogFilePosition(e.target.value)}
                disabled={loading}
                select
                SelectProps={{ native: true }}
              >
                <option value="beginning">beginning</option>
                <option value="end">end</option>
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="參考時間戳"
                value={referenceTimestamp}
                onChange={(e) => setReferenceTimestamp(e.target.value)}
                disabled={loading}
                helperText="ISO 8601格式時間戳"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="參考行號"
                value={referenceLineNum}
                onChange={(e) => setReferenceLineNum(e.target.value)}
                disabled={loading}
                type="number"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="偏移起始"
                value={offsetFrom}
                onChange={(e) => setOffsetFrom(e.target.value)}
                disabled={loading}
                type="number"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="偏移結束"
                value={offsetTo}
                onChange={(e) => setOffsetTo(e.target.value)}
                disabled={loading}
                type="number"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <input
                  type="checkbox"
                  id="previous"
                  checked={previous}
                  onChange={(e) => setPrevious(e.target.checked)}
                  disabled={loading}
                />
                <label htmlFor="previous">向前查詢 (previous)</label>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleFetchLogs}
                disabled={loading || !baseUrl.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <CloudDownload />}
                size="large"
                fullWidth
              >
                {loading ? "獲取中..." : "獲取日誌"}
              </Button>
            </Grid>
            
            {/* 顯示構建的URL */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: "action.hover", mt: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  構建的完整URL:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    bgcolor: "background.paper",
                    p: 1,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {mounted ? (() => {
                    try {
                      const url = new URL(baseUrl)
                      url.searchParams.set("logFilePosition", logFilePosition)
                      url.searchParams.set("referenceTimestamp", referenceTimestamp)
                      url.searchParams.set("referenceLineNum", referenceLineNum)
                      url.searchParams.set("offsetFrom", offsetFrom)
                      url.searchParams.set("offsetTo", offsetTo)
                      url.searchParams.set("previous", previous.toString())
                      return url.toString()
                    } catch {
                      return "無效的URL格式"
                    }
                  })() : "載入中..."}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 日誌詳情信息 */}
      {apiResponse && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Info />
                日誌詳情
              </Typography>
              <Button variant="outlined" size="small" onClick={handleExport}>
                導出JSON
              </Button>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: "action.hover" }}>
                  <Typography variant="caption" color="text.secondary">
                    Pod名稱
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {apiResponse.info.podName}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: "action.hover" }}>
                  <Typography variant="caption" color="text.secondary">
                    容器名稱
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {apiResponse.info.containerName}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: "action.hover" }}>
                  <Typography variant="caption" color="text.secondary">
                    開始時間
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(apiResponse.info.fromDate).toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: "action.hover" }}>
                  <Typography variant="caption" color="text.secondary">
                    結束時間
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(apiResponse.info.toDate).toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    icon={<Storage />}
                    label={`日誌數量: ${apiResponse.logs.length}`}
                    color="primary"
                    size="small"
                  />
                  <Chip icon={<Schedule />} label={`位置: ${apiResponse.selection.logFilePosition}`} size="small" />
                  {apiResponse.info.truncated && <Chip label="已截斷" color="warning" size="small" />}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 日誌內容 - 滿版顯示 */}
      {logs.length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">
              日誌內容 ({displayedLogs.length} / {filteredLogs.length} 條)
            </Typography>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                <TextField
                  size="small"
                  select
                  label="相對時間"
                  value={relativeRange}
                  onChange={(e) => {
                    const val = e.target.value
                    setRelativeRange(val)
                    applyRelativeRange(val)
                  }}
                  SelectProps={{ native: true }}
                  sx={{ minWidth: 110 }}
                >
                  <option value="24h">24h</option>
                  <option value="6h">6h</option>
                  <option value="1h">1h</option>
                  <option value="30m">30m</option>
                  <option value="15m">15m</option>
                  <option value="5m">5m</option>
                </TextField>
                <TextField
                  size="small"
                  label="開始時間"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={loading}
                  sx={{ minWidth: 180 }}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  size="small"
                  label="結束時間"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={loading}
                  sx={{ minWidth: 180 }}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  size="small"
                  label="關鍵字過濾"
                  placeholder="輸入關鍵字"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  disabled={loading}
                  sx={{ minWidth: 200 }}
                  helperText={keyword !== debouncedKeyword ? "正在處理..." : ""}
                />
                <TextField
                  size="small"
                  select
                  label="級別過濾"
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  SelectProps={{ native: true }}
                  disabled={loading}
                  sx={{ minWidth: 120 }}
                >
                  <option value="ALL">ALL</option>
                  <option value="ERROR">ERROR</option>
                  <option value="WARN">WARN</option>
                  <option value="INFO">INFO</option>
                  <option value="DEBUG">DEBUG</option>
                </TextField>
                {(startTime || endTime) && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setStartTime("")
                      setEndTime("")
                      setRelativeRange("30m")
                      applyRelativeRange("30m")
                    }}
                    sx={{ minWidth: 80 }}
                  >
                    清除時間
                  </Button>
                )}
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box 
              sx={{ maxHeight: "calc(100vh - 400px)", overflow: "auto" }}
              onScroll={handleScroll}
            >
              {displayedLogs.length > 0 ? (
                displayedLogs.map((log, index) => (
                <Paper
                  key={index}
                  sx={{
                    p: 2,
                    mb: 1,
                    bgcolor: "action.hover",
                    borderLeft: 4,
                    borderColor:
                      log.level === "ERROR"
                        ? "error.main"
                        : log.level === "WARN"
                          ? "warning.main"
                          : log.level === "DEBUG"
                            ? "info.main"
                            : "success.main",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {/* 只有明确包含级别标识的日志才显示级别标签 */}
                      {log.message.includes('[INFO]') ||
                       log.message.includes('[WARN]') ||
                       log.message.includes('[ERROR]') ||
                       log.message.includes('[DEBUG]') ||
                       log.message.includes('[FATAL]') ||
                       log.message.includes('[TRACE]') ||
                       log.message.includes('[info]') ||
                       log.message.includes('[warn]') ||
                       log.message.includes('[error]') ||
                       log.message.includes('[debug]') ||
                       log.message.includes('[fatal]') ||
                       log.message.includes('[trace]') ||
                       log.message.includes('[INFO ]') ||
                       log.message.includes('[WARN ]') ||
                       log.message.includes('[ERROR ]') ||
                       log.message.includes('[DEBUG ]') ||
                       log.message.includes('[FATAL ]') ||
                       log.message.includes('[TRACE ]') ||
                       log.message.includes('[info ]') ||
                       log.message.includes('[warn ]') ||
                       log.message.includes('[error ]') ||
                       log.message.includes('[debug ]') ||
                       log.message.includes('[fatal ]') ||
                       log.message.includes('[trace ]') ? (
                        <Chip
                          label={log.level}
                          size="small"
                          color={
                            log.level === "ERROR"
                              ? "error"
                              : log.level === "WARN"
                                ? "warning"
                                : log.level === "DEBUG"
                                  ? "info"
                                  : "success"
                          }
                        />
                      ) : null}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(log.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {log.message}
                  </Typography>
                </Paper>
                ))
              ) : (
                <Box sx={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  py: 4,
                  textAlign: "center"
                }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    沒有符合條件的日誌
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    請調整過濾條件或級別選擇
                  </Typography>
                </Box>
              )}
              
              {/* 加载更多按钮 - 只在没有自动加载时显示 */}
              {displayedLogs.length > 0 && hasMore && !loadMore && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 2 }}>
                  <Button 
                    variant="outlined" 
                    onClick={handleLoadMore}
                    startIcon={loadMore ? <CircularProgress size={16} /> : null}
                  >
                    載入更多
                  </Button>
                </Box>
              )}
              
              {/* 自动加载状态指示器 */}
              {loadMore && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      自動載入中...
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
