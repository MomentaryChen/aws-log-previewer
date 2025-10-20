"use client"

import { Box, Card, CardContent, Typography, Chip, Stack, Divider } from "@mui/material"
import {
  NewReleases as NewReleasesIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  Star as StarIcon,
  Circle as CircleIcon,
} from "@mui/icons-material"

interface VersionChange {
  type: "feature" | "fix" | "improvement" | "breaking"
  description: string
}

interface Version {
  version: string
  date: string
  changes: VersionChange[]
}

const versionHistory: Version[] = [
  {
    version: "1.6.0",
    date: "2025-10-20",
    changes: [
      { type: "feature", description: "新增 K8s Dashboard API 日誌查詢功能" },
      { type: "feature", description: "實現代理 API 支援 GET 請求" },
      { type: "feature", description: "添加詳細的日誌查詢參數配置 UI" },
      { type: "feature", description: "實現日誌級別檢測和過濾功能" },
      { type: "feature", description: "添加關鍵字過濾和時間範圍過濾" },
      { type: "feature", description: "實現懶加載和無限滾動功能" },
      { type: "feature", description: "添加相對時間預設選項（24h/6h/1h/30m/15m/5m）" },
      { type: "improvement", description: "優化日誌級別檢測邏輯，支援 [INFO] [WARN] [ERROR] 格式" },
      { type: "improvement", description: "實現多行異常日誌分組功能" },
      { type: "improvement", description: "添加認證 Cookie 本地儲存功能" },
      { type: "improvement", description: "實現關鍵字過濾防抖動機制（1秒延遲）" },
      { type: "fix", description: "修復 SSR 水合錯誤問題" },
      { type: "fix", description: "修復非 JSON 響應處理問題" },
      { type: "fix", description: "修復空過濾結果時版面消失問題" },
    ],
  },
  {
    version: "1.5.0",
    date: "2025-10-13",
    changes: [
      { type: "improvement", description: "調整統計卡片間距，提升視覺美觀度" },
      { type: "improvement", description: "優化Log Reviewer頁面統計卡片滿版布局" },
      { type: "improvement", description: "將導出和清除按鈕移至右上角，統計卡片獨占整行" },
    ],
  },
  {
    version: "1.4.0",
    date: "2025-10-13",
    changes: [
      { type: "feature", description: "遷移到Material UI設計系統" },
      { type: "improvement", description: "創建深色主題配置" },
      { type: "improvement", description: "重構Dashboard布局使用MUI組件" },
    ],
  },
  {
    version: "1.3.0",
    date: "2025-10-13",
    changes: [
      { type: "feature", description: "添加高級日志功能：正則表達式搜索" },
      { type: "feature", description: "添加日期時間範圍過濾" },
      { type: "feature", description: "添加按文件來源過濾" },
      { type: "feature", description: "添加多格式導出（JSON/CSV/TXT）" },
      { type: "feature", description: "添加日志書簽標記功能" },
      { type: "feature", description: "添加一鍵複製日志內容" },
    ],
  },
  {
    version: "1.2.0",
    date: "2025-10-13",
    changes: [
      { type: "feature", description: "創建Analytics分析頁面" },
      { type: "feature", description: "添加多種圖表分析：統計卡片、餅圖、柱狀圖、折線圖" },
      { type: "improvement", description: "改進分析圖表UI/UX和顏色方案" },
      { type: "improvement", description: "使用漸變背景和模糊效果的現代化卡片設計" },
    ],
  },
  {
    version: "1.1.0",
    date: "2025-10-13",
    changes: [
      { type: "feature", description: "添加文件夾批量導入功能" },
      { type: "feature", description: "支持文件名過濾關鍵字" },
      { type: "improvement", description: "顯示日志來源文件名" },
      { type: "improvement", description: "自動處理.log、.txt、.json格式文件" },
    ],
  },
  {
    version: "1.0.0",
    date: "2025-10-13",
    changes: [
      { type: "feature", description: "創建專業的Dashboard系統" },
      { type: "feature", description: "實現Log Reviewer核心功能" },
      { type: "feature", description: "支持JSON文件上傳和解析" },
      { type: "feature", description: "支持{events: [...]}格式解析" },
      { type: "feature", description: "解析AWS CloudWatch日志格式" },
      { type: "feature", description: "實現日志搜索和過濾功能" },
      { type: "feature", description: "實現消息折疊功能" },
      { type: "feature", description: "顯示日志統計信息" },
    ],
  },
]

const getTypeIcon = (type: string) => {
  switch (type) {
    case "feature":
      return <StarIcon fontSize="small" />
    case "fix":
      return <BugReportIcon fontSize="small" />
    case "improvement":
      return <BuildIcon fontSize="small" />
    case "breaking":
      return <NewReleasesIcon fontSize="small" />
    default:
      return <NewReleasesIcon fontSize="small" />
  }
}

const getTypeColor = (type: string): "primary" | "error" | "info" | "warning" | "default" => {
  switch (type) {
    case "feature":
      return "primary"
    case "fix":
      return "error"
    case "improvement":
      return "info"
    case "breaking":
      return "warning"
    default:
      return "default"
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case "feature":
      return "新功能"
    case "fix":
      return "修復"
    case "improvement":
      return "改進"
    case "breaking":
      return "重大變更"
    default:
      return type
  }
}

export default function VersionLog() {
  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          版本日誌
        </Typography>
        <Typography variant="body1" color="text.secondary">
          查看系統的所有版本更新和改動記錄
        </Typography>
      </Box>

      <Stack spacing={3}>
        {versionHistory.map((version, index) => (
          <Box key={version.version} sx={{ position: "relative", pl: { xs: 0, sm: 4 } }}>
            {/* Timeline dot */}
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                position: "absolute",
                left: 0,
                top: 24,
                width: 24,
                height: 24,
                alignItems: "center",
                justifyContent: "center",
                bgcolor: index === 0 ? "primary.main" : "grey.700",
                borderRadius: "50%",
                zIndex: 1,
              }}
            >
              <CircleIcon sx={{ fontSize: 12, color: "background.paper" }} />
            </Box>

            {/* Timeline connector */}
            {index < versionHistory.length - 1 && (
              <Box
                sx={{
                  display: { xs: "none", sm: "block" },
                  position: "absolute",
                  left: 11,
                  top: 48,
                  bottom: -24,
                  width: 2,
                  bgcolor: "grey.800",
                }}
              />
            )}

            <Card
              sx={{
                bgcolor: index === 0 ? "rgba(144, 202, 249, 0.08)" : "background.paper",
                border: 1,
                borderColor: index === 0 ? "primary.main" : "divider",
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="h6" fontWeight={600}>
                      v{version.version}
                    </Typography>
                    {index === 0 && (
                      <Chip label="最新" size="small" color="primary" sx={{ height: 20, fontSize: "0.75rem" }} />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {version.date}
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1.5}>
                  {version.changes.map((change, changeIndex) => (
                    <Box key={changeIndex} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                      <Chip
                        icon={getTypeIcon(change.type)}
                        label={getTypeLabel(change.type)}
                        size="small"
                        color={getTypeColor(change.type)}
                        sx={{ height: 24, fontSize: "0.75rem", minWidth: 80 }}
                      />
                      <Typography variant="body2" sx={{ flex: 1, pt: 0.5 }}>
                        {change.description}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Stack>
    </Box>
  )
}
