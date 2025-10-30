"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
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
import { CloudDownload, Info, Schedule, Storage, Refresh } from "@mui/icons-material"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import type { LogEntry } from "@/lib/log-parser"
import { buildListNamespacesUrl, buildListPodsUrl, buildPodContainersUrl } from "@/lib/k8s-admin"

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
  const [baseUrl, setBaseUrl] = useState(`/api/k8s/api/v1/log/<namespace>/<pod>/<container>`) 
  const DEFAULT_AUTH = process.env.NEXT_PUBLIC_K8S_LOG_AUTH || ""
  const [authToken, setAuthToken] = useState(DEFAULT_AUTH)
  const [logFilePosition, setLogFilePosition] = useState("end")
  const [referenceTimestamp, setReferenceTimestamp] = useState("newest")
  const [referenceLineNum, setReferenceLineNum] = useState("-1")
  const [offsetFrom, setOffsetFrom] = useState("0")
  const [offsetTo, setOffsetTo] = useState("5000")
  const [previous, setPrevious] = useState(false)
  const [stepSize, setStepSize] = useState("4096")
  const [tailMode, setTailMode] = useState(false)
  const [pollIntervalMs, setPollIntervalMs] = useState("3000")
  const [namespace, setNamespace] = useState("")
  const [pod, setPod] = useState("")
  const [container, setContainer] = useState("")
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [pods, setPods] = useState<Array<{ name: string; obj: any }>>([])
  const [containers, setContainers] = useState<string[]>([])
  const [nsLoading, setNsLoading] = useState(false)
  const [podLoading, setPodLoading] = useState(false)
  const [containerLoading, setContainerLoading] = useState(false)
  const [podLoadError, setPodLoadError] = useState<string | null>(null)
  const [containerLoadError, setContainerLoadError] = useState<string | null>(null)
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
  const logContainerRef = useRef<HTMLDivElement | null>(null)
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("")
  const [startTime, setStartTime] = useState<string>("")
  const [endTime, setEndTime] = useState<string>("")
  const [relativeRange, setRelativeRange] = useState<string>("30m")
  const searchParams = useSearchParams()
  const USE_K8S_PROXY = true
  const [showAllLogs, setShowAllLogs] = useState(false)
  const [showAllLogsWithoutFilter, setShowAllLogsWithoutFilter] = useState(false)

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
    if (range === "3d") from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    else if (range === "24h") from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    else if (range === "6h") from = new Date(now.getTime() - 6 * 60 * 60 * 1000)
    else if (range === "1h") from = new Date(now.getTime() - 1 * 60 * 60 * 1000)
    else if (range === "30m") from = new Date(now.getTime() - 30 * 60 * 1000)
    else if (range === "15m") from = new Date(now.getTime() - 15 * 60 * 1000)
    else if (range === "5m") from = new Date(now.getTime() - 5 * 60 * 1000)
    else if (range === "1m") from = new Date(now.getTime() - 1 * 60 * 1000)
    
    setStartTime(formatForInput(from))
    setEndTime(formatForInput(now))
  }

  // 处理SSR水合问题
  useEffect(() => {
    setMounted(true)
    // 初始套用相對時間 30m
    applyRelativeRange("30m")
  }, [])

  // 從 URL 讀取 ns/pod/container 並預填
  useEffect(() => {
    if (!searchParams) return
    const ns = searchParams.get("ns") || ""
    const p = searchParams.get("pod") || ""
    const c = searchParams.get("container") || ""
    if (ns) setNamespace(ns)
    if (p) setPod(p)
    if (c) setContainer(c)
    if (ns && p && c) {
      setBaseUrl(`/api/k8s/api/v1/log/${encodeURIComponent(ns)}/${encodeURIComponent(p)}/${encodeURIComponent(c)}`)
    }
  }, [searchParams])

  // 載入 Namespaces
  const loadNamespaces = async () => {
    setNsLoading(true)
    try {
      const res = await fetch(buildListNamespacesUrl(), { cache: "no-store" })
      if (res.ok) {
        const body: any = await res.json()
        const items: string[] = (body?.namespaces ?? body?.items ?? [])
          .map((n: any) => n?.objectMeta?.name || n?.metadata?.name)
          .filter(Boolean)
        setNamespaces(items)
        // 若目前 namespace 空或不在清單，預設第一個
        if (items.length > 0 && (!namespace || !items.includes(namespace))) {
          setNamespace(items[0])
        }
      }
    } catch {}
    finally {
      setNsLoading(false)
    }
  }

  useEffect(() => {
    loadNamespaces()
    // 僅在初始化時載入一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 載入 Pods（依 namespace）
  useEffect(() => {
    if (!namespace) {
      setPods([])
      setPod("")
      setContainers([])
      setContainer("")
      return
    }
    const loadPods = async () => {
      setPodLoading(true)
      setPodLoadError(null)
      try {
        const url = buildListPodsUrl({ 
          namespace, 
          page: 1, 
          itemsPerPage: 100, 
          sortBy: "d,creationTimestamp" 
        })
        const res = await fetch(url, { cache: "no-store" })
        if (res.ok) {
          const body: any = await res.json()
          // 支援多種可能的數據結構
          const podObjs: any[] = (body?.pods ?? body?.items ?? body?.data?.pods ?? body?.data?.items ?? [])
          const items: Array<{ name: string; obj: any }> = podObjs
            .map((p: any) => ({
              name: p?.objectMeta?.name || p?.metadata?.name || p?.name,
              obj: p,
            }))
            .filter((x) => Boolean(x.name))
          setPods(items)
          // 若目前 pod 空或不在清單，預設第一個
          if (items.length > 0 && (!pod || !items.some((x) => x.name === pod))) {
            const first = items[0]
            setPod(first.name)
            // 容器將通過專用 API 端點自動載入
          }
        } else {
          setPods([])
          setPodLoadError(`載入 pods 失敗：${res.status}`)
        }
      } catch (e) {
        setPods([])
        setPodLoadError(`載入 pods 發生錯誤：${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setPodLoading(false)
      }
    }
    loadPods()
  }, [namespace])

  // 載入 Containers（依 pod）- 從專用 API 端點獲取容器信息
  useEffect(() => {
    setContainerLoadError(null)
    if (!namespace || !pod) {
      setContainers([])
      setContainer("")
      return
    }
    
    const loadContainers = async () => {
      setContainerLoading(true)
      try {
        const url = buildPodContainersUrl(namespace, pod)
        const res = await fetch(url, { cache: "no-store" })
        if (res.ok) {
          const body: any = await res.json()
          // 支援多種可能的數據結構
          const cs: string[] = (
            body?.containers ||
            body?.containerNames ||
            body?.data?.containers ||
            body?.data?.containerNames ||
            body?.items ||
            []
          )
            .map((c: any) => {
              // 容器可能是字串或物件
              if (typeof c === 'string') return c
              return c?.name || c?.containerName || c?.container || null
            })
            .filter(Boolean)
          
          if (cs.length > 0) {
            setContainers(cs)
            if (!container || !cs.includes(container)) {
              setContainer(cs[0])
            }
          } else {
            setContainers([])
            setContainerLoadError(`API 返回的容器列表為空`)
          }
        } else {
          setContainers([])
          setContainerLoadError(`載入容器失敗：${res.status} ${res.statusText}`)
        }
      } catch (e) {
        setContainers([])
        setContainerLoadError(`載入容器發生錯誤：${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setContainerLoading(false)
      }
    }
    
    loadContainers()
  }, [namespace, pod])

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
      // 如果 showAllLogsWithoutFilter 为 true，显示所有原始日志（不应用过滤）
      if (showAllLogsWithoutFilter) {
        setDisplayedLogs([...logs]) // 显示所有原始日志，不应用过滤
        setHasMore(false)
        setShowAllLogsWithoutFilter(false) // 重置标志
        // 延迟滚动到底部，确保 DOM 已更新
        setTimeout(() => {
          scrollToBottom()
        }, 100)
      } else if (showAllLogs) {
        setDisplayedLogs(filtered) // 显示所有过滤后的日志
        setHasMore(false)
        setShowAllLogs(false) // 重置标志
        // 延迟滚动到底部，确保 DOM 已更新
        setTimeout(() => {
          scrollToBottom()
        }, 100)
      } else {
        // 重置懒加载状态
        setDisplayedLogs(filtered.slice(0, 100)) // 初始显示100条
        setHasMore(filtered.length > 100)
      }
      setLoadMore(false)
    }
  }, [logs, levelFilter, debouncedKeyword, startTime, endTime, showAllLogs, showAllLogsWithoutFilter])

  // 懒加载更多数据
  useEffect(() => {
    if (loadMore && hasMore) {
      const currentLength = displayedLogs.length
      const nextBatch = filteredLogs.slice(currentLength, currentLength + 100)
      setDisplayedLogs(prev => [...prev, ...nextBatch])
      setHasMore(currentLength + 100 < filteredLogs.length)
      setLoadMore(false)
    }
  }, [loadMore, hasMore, filteredLogs, displayedLogs.length])

  // 加载更多函数
  const handleLoadMore = () => {
    setLoadMore(true)
  }
  const scrollToBottom = () => {
    const el = logContainerRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }
  const jumpToNow = async () => {
    // 需要必填 namespace/pod/container
    if (!namespace || !pod || !container) {
      setError("請先選擇 Namespace、Pod、Container 後再查詢")
      return
    }

    // 直接設置參數以獲取最新日誌
    setLogFilePosition("end")
    setReferenceTimestamp("newest")
    setReferenceLineNum("-1")
    setPrevious(false)
    const step = Math.max(1, parseInt(stepSize || "4096", 10))
    setOffsetFrom("0")
    setOffsetTo(String(step))

    // 構建 URL 並直接獲取最新日誌（不等待狀態更新）
    const finalBaseUrl = `/api/k8s/api/v1/log/${encodeURIComponent(namespace)}/${encodeURIComponent(pod)}/${encodeURIComponent(container)}`
    setBaseUrl(finalBaseUrl)

    setLoading(true)
    setError(null)

    try {
      const baseOrigin = typeof window !== 'undefined' ? window.location.origin : ''
      const fullUrl = new URL(
        finalBaseUrl.startsWith("/") ? `${baseOrigin}${finalBaseUrl}` : finalBaseUrl
      )
      // 使用最新參數
      fullUrl.searchParams.set("logFilePosition", "end")
      fullUrl.searchParams.set("referenceTimestamp", "newest")
      fullUrl.searchParams.set("referenceLineNum", "-1")
      fullUrl.searchParams.set("offsetFrom", "0")
      fullUrl.searchParams.set("offsetTo", String(step))
      fullUrl.searchParams.set("previous", "false")

      const response = await fetch(fullUrl.toString(), { method: "GET" })
      if (!response.ok) {
        const errText = await response.text()
        let hint = ""
        if (response.status === 401 || response.status === 403) hint = "\n提示：請確認服務端 K8S_ADMIN_COOKIE 是否有效。"
        if (response.status === 416) hint = "\n提示：offset 範圍不合法，請調整 offsetFrom/offsetTo 或步進大小。"
        if (response.status === 429) hint = "\n提示：請求過於頻繁，請降低輪詢頻率。"
        throw new Error(`API請求失敗: ${response.status} ${response.statusText}\n${errText}${hint}`)
      }
      await handleResponseParsing(response)
      // 设置标志，直接显示所有原始日志（不应用过滤）
      setShowAllLogsWithoutFilter(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知錯誤")
      setApiResponse(null)
      setLogs([])
      setFilteredLogs([])
    } finally {
      setLoading(false)
    }
  }
  async function handleResponseParsing(response: Response) {
    // 按content-type解析
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const data: ApiLogResponse = await response.json()
      setApiResponse(data)

      // 轉換API日誌格式為系統LogEntry格式，將沒有級別標識的日誌歸類到最靠近的有級別日誌
      const convertedLogs: LogEntry[] = []
      let currentLevel = "INFO"

      for (let i = 0; i < data.logs.length; i++) {
        const log = data.logs[i]
        const content = log.content
        let level = currentLevel

        if (content.includes('[ERROR]') || content.includes('[error]') || content.includes('[ERROR ]') || content.includes('[error ]')) {
          level = "ERROR"
          currentLevel = "ERROR"
        } else if (content.includes('[WARN]') || content.includes('[warn]') || content.includes('[WARN ]') || content.includes('[warn ]')) {
          level = "WARN"
          currentLevel = "WARN"
        } else if (content.includes('[DEBUG]') || content.includes('[debug]') || content.includes('[DEBUG ]') || content.includes('[debug ]')) {
          level = "DEBUG"
          currentLevel = "DEBUG"
        } else if (content.includes('[INFO]') || content.includes('[info]') || content.includes('[INFO ]') || content.includes('[info ]')) {
          level = "INFO"
          currentLevel = "INFO"
        } else if (content.includes('[FATAL]') || content.includes('[fatal]') || content.includes('[FATAL ]') || content.includes('[fatal ]')) {
          level = "ERROR"
          currentLevel = "ERROR"
        } else if (content.includes('[TRACE]') || content.includes('[trace]') || content.includes('[TRACE ]') || content.includes('[trace ]')) {
          level = "DEBUG"
          currentLevel = "DEBUG"
        }

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
      setFilteredLogs(applyFilters(convertedLogs))
      if (tailMode) {
        try {
          const step = Math.max(1, parseInt(stepSize || "4096", 10))
          const nextFrom = Math.max(0, parseInt(offsetTo || "0", 10))
          const nextTo = nextFrom + step
          setOffsetFrom(String(nextFrom))
          setOffsetTo(String(nextTo))
        } catch {}
      }
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
      setFilteredLogs(applyFilters(rawLogs))
    }
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
    // 需要必填 namespace/pod/container，直接以此組裝 URL
    if (!namespace || !pod || !container) {
      setError("請先輸入 Namespace、Pod、Container 後再查詢")
      return
    }

    const finalBaseUrl = `/api/k8s/api/v1/log/${encodeURIComponent(namespace)}/${encodeURIComponent(pod)}/${encodeURIComponent(container)}`
    setBaseUrl(finalBaseUrl)

    setLoading(true)
    setError(null)

    try {
      const baseOrigin = typeof window !== 'undefined' ? window.location.origin : ''

      // 構建完整的API URL（一律走同源 K8S 代理）
        const fullUrl = new URL(
          finalBaseUrl.startsWith("/") ? `${baseOrigin}${finalBaseUrl}` : finalBaseUrl
        )
        fullUrl.searchParams.set("logFilePosition", logFilePosition)
        fullUrl.searchParams.set("referenceTimestamp", referenceTimestamp)
        fullUrl.searchParams.set("referenceLineNum", referenceLineNum)
        fullUrl.searchParams.set("offsetFrom", offsetFrom)
        fullUrl.searchParams.set("offsetTo", offsetTo)
        fullUrl.searchParams.set("previous", previous.toString())

        const response = await fetch(fullUrl.toString(), { method: "GET" })
        if (!response.ok) {
          const errText = await response.text()
          let hint = ""
          if (response.status === 401 || response.status === 403) hint = "\n提示：請確認服務端 K8S_ADMIN_COOKIE 是否有效。"
          if (response.status === 416) hint = "\n提示：offset 範圍不合法，請調整 offsetFrom/offsetTo 或步進大小。"
          if (response.status === 429) hint = "\n提示：請求過於頻繁，請降低輪詢頻率。"
          throw new Error(`API請求失敗: ${response.status} ${response.statusText}\n${errText}${hint}`)
        }
        await handleResponseParsing(response)
      
      

    } catch (err) {
      setError(err instanceof Error ? err.message : "未知錯誤")
      setApiResponse(null)
      setLogs([])
      setFilteredLogs([])
    } finally {
      setLoading(false)
    }
  }

  // 追尾輪詢
  useEffect(() => {
    if (!tailMode) return
    const ms = Math.max(1000, parseInt(pollIntervalMs || "3000", 10))
    const id = setInterval(() => {
      if (!loading) {
        handleFetchLogs()
      }
    }, ms)
    return () => clearInterval(id)
  }, [tailMode, pollIntervalMs, offsetFrom, offsetTo, stepSize, logFilePosition, referenceTimestamp, referenceLineNum, previous, authToken, baseUrl, namespace, pod, container, loading])

  // 環境變數已提供 Token，移除 localStorage 回填

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
            自動帶入 K8s Dashboard 的日誌 API URL 與認證 Cookie 後查詢日誌
          </Typography>

          <Grid container spacing={2}>
            {/* Namespace / Pod / Container 快速拼接（下拉選單） */}
            <Grid item xs={12} md={4}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <TextField
                  fullWidth
                  select
                  label="Namespace"
                  value={namespace}
                  onChange={(e) => {
                    setNamespace(e.target.value)
                    // 切換 namespace 時清空下游
                    setPod("")
                    setContainer("")
                  }}
                  disabled={loading || nsLoading}
                  SelectProps={{ native: true }}
                  helperText={nsLoading ? "載入 namespaces..." : undefined}
                >
                  <option value="" disabled>
                    選擇 Namespace
                  </option>
                  {(namespaces.length > 0 ? namespaces : (namespace ? [namespace] : [])).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </TextField>
                <Button
                  variant="outlined"
                  onClick={loadNamespaces}
                  disabled={loading || nsLoading}
                  sx={{ minWidth: 48, height: 56 }}
                  title="刷新 Namespace"
                >
                  <Refresh />
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Pod"
                value={pod}
                onChange={(e) => {
                  setPod(e.target.value)
                  setContainer("")
                }}
                disabled={loading || podLoading || !namespace}
                SelectProps={{ native: true }}
                helperText={podLoading ? `載入 ${namespace} pods...` : (podLoadError || undefined)}
              >
                <option value="" disabled>
                  {namespace ? `選擇 ${namespace} 的 Pod` : "請先選擇 Namespace"}
                </option>
                {(pods.length > 0 ? pods.map((x) => x.name) : (pod ? [pod] : [])).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                select
                label="Container"
                value={container}
                onChange={(e) => setContainer(e.target.value)}
                disabled={loading || containerLoading || !pod}
                SelectProps={{ native: true }}
                helperText={containerLoading ? `載入 ${pod} containers...` : (containerLoadError || undefined)}
              >
                <option value="" disabled>
                  {pod ? `選擇 ${pod} 的 Container` : "請先選擇 Pod"}
                </option>
                {(containers.length > 0 ? containers : (container ? [container] : [])).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </TextField>
            </Grid>
            {/* 隱藏：基礎URL 與 認證Token 由環境變數提供，不顯示於 UI */}
            
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

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="步進大小 (bytes)"
                value={stepSize}
                onChange={(e) => setStepSize(e.target.value)}
                disabled={loading}
                type="number"
                helperText="上一段/下一段時使用；預設 4096"
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <input
                    type="checkbox"
                    id="tailMode"
                    checked={tailMode}
                    onChange={(e) => {
                      const enabled = e.target.checked
                      setTailMode(enabled)
                      if (enabled) {
                        setLogFilePosition("end")
                        setReferenceTimestamp("newest")
                        setPrevious(false)
                      }
                    }}
                    disabled={loading}
                  />
                  <label htmlFor="tailMode">追尾模式</label>
                </Box>
                {tailMode && (
                  <TextField
                    size="small"
                    label="輪詢(ms)"
                    type="number"
                    value={pollIntervalMs}
                    onChange={(e) => setPollIntervalMs(e.target.value)}
                    disabled={loading}
                    sx={{ width: 140 }}
                  />
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleFetchLogs}
                disabled={loading || !(namespace && pod && container)}
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
                      const origin = typeof window !== 'undefined' ? window.location.origin : ''
                      if (!(namespace && pod && container)) {
                        return "請先輸入 Namespace / Pod / Container"
                      }
                      const preview = `${origin}/api/k8s/api/v1/log/${encodeURIComponent(namespace)}/${encodeURIComponent(pod)}/${encodeURIComponent(container)}`
                      const url = new URL(preview)
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
                  <Chip label={`offsetFrom: ${apiResponse.selection.offsetFrom}`} size="small" />
                  <Chip label={`offsetTo: ${apiResponse.selection.offsetTo}`} size="small" />
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
              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  alignItems: "center",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                    md: "110px 180px 180px minmax(220px, 1fr) 140px auto",
                  },
                }}
              >
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
                >
                  <option value="3d">3d</option>
                  <option value="24h">24h</option>
                  <option value="6h">6h</option>
                  <option value="1h">1h</option>
                  <option value="30m">30m</option>
                  <option value="15m">15m</option>
                  <option value="5m">5m</option>
                  <option value="1m">1m</option>
                </TextField>
                <TextField
                  size="small"
                  label="開始時間"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={loading}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  size="small"
                  label="結束時間"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={loading}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  size="small"
                  label="關鍵字過濾"
                  placeholder="輸入關鍵字"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  disabled={loading}
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
                >
                  <option value="ALL">ALL</option>
                  <option value="ERROR">ERROR</option>
                  <option value="WARN">WARN</option>
                  <option value="INFO">INFO</option>
                  <option value="DEBUG">DEBUG</option>
                </TextField>
                <Box>
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
                    >
                      清除時間
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box 
              sx={{ maxHeight: "calc(100vh - 400px)", overflow: "auto" }}
              onScroll={handleScroll}
              ref={logContainerRef}
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
