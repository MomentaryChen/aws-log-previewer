"use client"

import { useState, useEffect } from "react"
import { Box, Card, CardContent, Typography, Grid, Chip, Stack, Divider } from "@mui/material"
import {
  Description as DescriptionIcon,
  BarChart as BarChartIcon,
  History as HistoryIcon,
  AccessTime as AccessTimeIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from "@mui/icons-material"
import type { LogEntry } from "@/lib/log-parser"

interface OverviewProps {
  logs: LogEntry[]
}

export default function Overview({ logs }: OverviewProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    })
  }

  const errorCount = logs.filter((log) => log.level === "ERROR").length
  const warnCount = logs.filter((log) => log.level === "WARN").length
  const infoCount = logs.filter((log) => log.level === "INFO").length

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", p: 0 }}>
      <Box
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          p: 4,
          mb: 0,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h3" fontWeight={700} gutterBottom>
              Review Log System
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.95, mb: 2 }}>
              專業的日誌審查與分析平台
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip label="JSON 支持" sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white" }} />
              <Chip label="實時分析" sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white" }} />
              <Chip label="高級過濾" sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white" }} />
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                textAlign: "center",
                p: 3,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
              }}
            >
              <AccessTimeIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
                {formatTime(currentTime)}
              </Typography>
              <Typography variant="body2">{formatDate(currentTime)}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Log Reviewer 区块 */}
        <Box
          sx={{
            flex: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #3b82f620 0%, #3b82f610 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #3b82f630",
                }}
              >
                <DescriptionIcon sx={{ fontSize: 28, color: "#3b82f6" }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight={700}>
                  Log Reviewer
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  日誌審查與管理
                </Typography>
              </Box>
              <Chip label={`${logs.length} 條日誌`} color="primary" />
            </Box>

            <Grid container spacing={2} sx={{ flex: 1 }}>
              <Grid item xs={12} sm={3}>
                <Card sx={{ height: "100%", bgcolor: "#f8fafc" }}>
                  <CardContent>
                    <Typography variant="h4" fontWeight={700} color="primary">
                      {logs.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      總日誌數
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card sx={{ height: "100%", bgcolor: "#fef2f2" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <ErrorIcon sx={{ color: "#ef4444" }} />
                      <Typography variant="h4" fontWeight={700} color="#ef4444">
                        {errorCount}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      錯誤
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card sx={{ height: "100%", bgcolor: "#fffbeb" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <WarningIcon sx={{ color: "#f59e0b" }} />
                      <Typography variant="h4" fontWeight={700} color="#f59e0b">
                        {warnCount}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      警告
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Card sx={{ height: "100%", bgcolor: "#eff6ff" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <InfoIcon sx={{ color: "#3b82f6" }} />
                      <Typography variant="h4" fontWeight={700} color="#3b82f6">
                        {infoCount}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      信息
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Box>

        {/* Analytics 区块 */}
        <Box
          sx={{
            flex: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.default",
          }}
        >
          <Box sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #8b5cf620 0%, #8b5cf610 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #8b5cf630",
                }}
              >
                <BarChartIcon sx={{ fontSize: 28, color: "#8b5cf6" }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight={700}>
                  Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  數據分析與視覺化
                </Typography>
              </Box>
              <Chip label="多種圖表" sx={{ bgcolor: "#8b5cf620", color: "#8b5cf6" }} />
            </Box>

            <Grid container spacing={2} sx={{ flex: 1 }}>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: "100%", p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    日誌級別分布
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                    <Box sx={{ flex: 1, textAlign: "center" }}>
                      <Box
                        sx={{
                          height: 100,
                          bgcolor: "#ef444420",
                          borderRadius: 1,
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          p: 1,
                        }}
                      >
                        <Box
                          sx={{
                            width: "100%",
                            height: `${errorCount > 0 ? (errorCount / logs.length) * 100 : 5}%`,
                            bgcolor: "#ef4444",
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                        ERROR
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: "center" }}>
                      <Box
                        sx={{
                          height: 100,
                          bgcolor: "#f59e0b20",
                          borderRadius: 1,
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          p: 1,
                        }}
                      >
                        <Box
                          sx={{
                            width: "100%",
                            height: `${warnCount > 0 ? (warnCount / logs.length) * 100 : 5}%`,
                            bgcolor: "#f59e0b",
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                        WARN
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: "center" }}>
                      <Box
                        sx={{
                          height: 100,
                          bgcolor: "#3b82f620",
                          borderRadius: 1,
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          p: 1,
                        }}
                      >
                        <Box
                          sx={{
                            width: "100%",
                            height: `${infoCount > 0 ? (infoCount / logs.length) * 100 : 5}%`,
                            bgcolor: "#3b82f6",
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                        INFO
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ height: "100%", p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    統計摘要
                  </Typography>
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2">錯誤率</Typography>
                      <Typography variant="h6" fontWeight={700} color="error">
                        {logs.length > 0 ? ((errorCount / logs.length) * 100).toFixed(1) : 0}%
                      </Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2">警告率</Typography>
                      <Typography variant="h6" fontWeight={700} color="warning.main">
                        {logs.length > 0 ? ((warnCount / logs.length) * 100).toFixed(1) : 0}%
                      </Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2">信息率</Typography>
                      <Typography variant="h6" fontWeight={700} color="info.main">
                        {logs.length > 0 ? ((infoCount / logs.length) * 100).toFixed(1) : 0}%
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Box>

        {/* Version Log 区块 */}
        <Box sx={{ flex: 1, bgcolor: "background.paper" }}>
          <Box sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #10b98120 0%, #10b98110 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #10b98130",
                }}
              >
                <HistoryIcon sx={{ fontSize: 28, color: "#10b981" }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" fontWeight={700}>
                  Version Log
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  版本更新記錄
                </Typography>
              </Box>
              <Chip label="v1.5.0" sx={{ bgcolor: "#10b98120", color: "#10b981", fontWeight: 700 }} />
            </Box>

            <Card sx={{ flex: 1, overflow: "auto" }}>
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Chip label="最新" size="small" color="success" />
                      <Typography variant="subtitle1" fontWeight={700}>
                        v1.5.0
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        2025-01-15
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      • 添加版本日誌功能
                      <br />• 優化Overview頁面布局
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        v1.4.0
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        2025-01-14
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      • 添加高級日誌功能
                      <br />• 支持正則表達式搜索
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        v1.3.0
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        2025-01-13
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      • 改進分析圖表UI/UX
                      <br />• 添加渐变背景效果
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
