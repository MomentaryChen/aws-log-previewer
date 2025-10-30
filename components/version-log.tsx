"use client"

import { Box, Card, CardContent, Typography, Chip, Stack, Divider } from "@mui/material"
import {
  NewReleases as NewReleasesIcon,
  BugReport as BugReportIcon,
  Build as BuildIcon,
  Star as StarIcon,
  Circle as CircleIcon,
} from "@mui/icons-material"
import { versionData, type VersionChange, type Version } from "@/lib/version-data"

const versionHistory: Version[] = versionData.versionHistory

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
