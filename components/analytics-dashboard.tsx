"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"
import { TrendingUp, AlertTriangle, FileText, Activity, XCircle } from "lucide-react"
import type { LogEntry } from "@/lib/log-parser"

interface AnalyticsDashboardProps {
  logs: LogEntry[]
}

const COLORS = {
  ERROR: "#ef4444",
  WARN: "#f59e0b",
  INFO: "#3b82f6",
  DEBUG: "#6b7280",
}

const GRADIENT_COLORS = {
  ERROR: ["#ef4444", "#dc2626"],
  WARN: ["#f59e0b", "#d97706"],
  INFO: ["#3b82f6", "#2563eb"],
  DEBUG: ["#6b7280", "#4b5563"],
}

export default function AnalyticsDashboard({ logs }: AnalyticsDashboardProps) {
  // 計算日誌級別分布
  const levelDistribution = useMemo(() => {
    const distribution = logs.reduce(
      (acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(distribution).map(([level, count]) => ({
      level,
      count,
      percentage: ((count / logs.length) * 100).toFixed(1),
    }))
  }, [logs])

  // 計算時間線趨勢（按小時分組）
  const timelineTrend = useMemo(() => {
    const hourlyData = logs.reduce(
      (acc, log) => {
        try {
          const date = new Date(log.timestamp)
          const hour = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`
          if (!acc[hour]) {
            acc[hour] = { time: hour, ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0, total: 0 }
          }
          acc[hour][log.level] = (acc[hour][log.level] || 0) + 1
          acc[hour].total += 1
        } catch (e) {
          // 忽略無效時間戳
        }
        return acc
      },
      {} as Record<string, any>,
    )

    return Object.values(hourlyData).slice(-24) // 最近24小時
  }, [logs])

  // 計算文件來源分布
  const sourceDistribution = useMemo(() => {
    const sources = logs.reduce(
      (acc, log) => {
        const source = log.source || "未知來源"
        acc[source] = (acc[source] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(sources)
      .map(([source, count]) => ({
        source: source.length > 30 ? source.substring(0, 27) + "..." : source,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [logs])

  // 計算錯誤率
  const errorRate = useMemo(() => {
    const errorCount = logs.filter((log) => log.level === "ERROR").length
    return logs.length > 0 ? ((errorCount / logs.length) * 100).toFixed(2) : "0"
  }, [logs])

  if (logs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted/50">
            <Activity className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">暫無分析數據</h3>
          <p className="text-sm text-muted-foreground">請先在 Log Reviewer 頁面上傳日誌文件</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="space-y-8 py-8">
        <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 p-6 shadow-lg backdrop-blur">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">總日誌數</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{logs.length.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 p-6 shadow-lg backdrop-blur">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-red-500/10 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">錯誤數</p>
                <p className="mt-2 text-3xl font-bold text-red-500">
                  {logs.filter((l) => l.level === "ERROR").length.toLocaleString()}
                </p>
              </div>
              <div className="rounded-full bg-red-500/10 p-3">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 p-6 shadow-lg backdrop-blur">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-amber-500/10 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">警告數</p>
                <p className="mt-2 text-3xl font-bold text-amber-500">
                  {logs.filter((l) => l.level === "WARN").length.toLocaleString()}
                </p>
              </div>
              <div className="rounded-full bg-amber-500/10 p-3">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 p-6 shadow-lg backdrop-blur">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">錯誤率</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{errorRate}%</p>
              </div>
              <div className="rounded-full bg-emerald-500/10 p-3">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </Card>
        </div>

        <div className="px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 p-6 shadow-lg backdrop-blur">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">日誌級別分布</h3>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {levelDistribution.length} 級別
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <defs>
                    {Object.entries(GRADIENT_COLORS).map(([key, [start, end]]) => (
                      <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={start} />
                        <stop offset="100%" stopColor={end} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={levelDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ level, percentage }) => `${level} ${percentage}%`}
                    outerRadius={110}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="count"
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {levelDistribution.map((entry) => (
                      <Cell
                        key={entry.level}
                        fill={`url(#gradient-${entry.level})`}
                        className="transition-opacity hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 p-6 shadow-lg backdrop-blur">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">級別統計</h3>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  總計 {logs.length}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={levelDistribution}>
                  <defs>
                    {levelDistribution.map((entry) => (
                      <linearGradient key={entry.level} id={`bar-${entry.level}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS[entry.level as keyof typeof COLORS]} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={COLORS[entry.level as keyof typeof COLORS]} stopOpacity={0.4} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="level" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                  />
                  {levelDistribution.map((entry) => (
                    <Bar
                      key={entry.level}
                      dataKey="count"
                      fill={`url(#bar-${entry.level})`}
                      radius={[8, 8, 0, 0]}
                      maxBarSize={80}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {timelineTrend.length > 0 && (
            <Card className="mt-6 border-border/50 bg-gradient-to-br from-card to-card/50 p-6 shadow-lg backdrop-blur">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">時間線趨勢</h3>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  最近 {timelineTrend.length} 小時
                </div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={timelineTrend}>
                  <defs>
                    <linearGradient id="colorERROR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.ERROR} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.ERROR} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorWARN" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.WARN} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.WARN} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorINFO" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.INFO} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.INFO} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Area
                    type="monotone"
                    dataKey="ERROR"
                    stroke={COLORS.ERROR}
                    fillOpacity={1}
                    fill="url(#colorERROR)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="WARN"
                    stroke={COLORS.WARN}
                    fillOpacity={1}
                    fill="url(#colorWARN)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="INFO"
                    stroke={COLORS.INFO}
                    fillOpacity={1}
                    fill="url(#colorINFO)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}

          {sourceDistribution.length > 1 && (
            <Card className="mt-6 border-border/50 bg-gradient-to-br from-card to-card/50 p-6 shadow-lg backdrop-blur">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">文件來源分布</h3>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Top {sourceDistribution.length}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(300, sourceDistribution.length * 40)}>
                <BarChart data={sourceDistribution} layout="vertical">
                  <defs>
                    <linearGradient id="sourceGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    dataKey="source"
                    type="category"
                    stroke="hsl(var(--muted-foreground))"
                    width={180}
                    fontSize={11}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                  />
                  <Bar dataKey="count" fill="url(#sourceGradient)" radius={[0, 8, 8, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
