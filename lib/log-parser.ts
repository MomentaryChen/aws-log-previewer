export interface LogEntry {
  timestamp: string
  level: string
  message: string
  source?: string
  metadata?: Record<string, any>
  logStreamName?: string
  eventId?: string
  ingestionTime?: string
}

export function parseLogFile(content: string): LogEntry[] {
  const lines = content.split("\n").filter((line) => line.trim())
  const logs: LogEntry[] = []

  try {
    const jsonData = JSON.parse(content)

    if (jsonData.events && Array.isArray(jsonData.events)) {
      return jsonData.events.map((item: any) => {
        // 将毫秒时间戳转换为ISO格式
        const timestamp = item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString()

        const ingestionTime = item.ingestionTime ? new Date(item.ingestionTime).toISOString() : undefined

        // 从message中提取日志级别
        let level = "INFO"
        const message = item.message || ""
        if (message.includes("ERROR") || message.includes("Error")) {
          level = "ERROR"
        } else if (message.includes("WARN") || message.includes("Warning")) {
          level = "WARN"
        } else if (message.includes("DEBUG")) {
          level = "DEBUG"
        }

        return {
          timestamp,
          level,
          message: message.trim(),
          logStreamName: item.logStreamName,
          eventId: item.eventId,
          ingestionTime,
          metadata: {
            logStreamName: item.logStreamName,
            eventId: item.eventId,
            ingestionTime,
          },
        }
      })
    }

    // 如果是直接的数组格式
    if (Array.isArray(jsonData)) {
      return jsonData.map((item) => ({
        timestamp: item.timestamp || item.time || item.date || new Date().toISOString(),
        level: (item.level || item.severity || item.type || "INFO").toUpperCase(),
        message: item.message || item.msg || item.text || JSON.stringify(item),
        source: item.source || item.component || item.service,
        metadata: item.metadata || item.data || item.context,
      }))
    }
  } catch {
    // 不是JSON格式，继续使用文本解析
  }

  // Common log patterns
  const patterns = [
    // ISO timestamp with level: 2024-01-15T10:30:45.123Z [ERROR] message
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\s*\[(\w+)\]\s*(.+)$/,
    // Standard timestamp: 2024-01-15 10:30:45 ERROR message
    /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+(\w+)\s+(.+)$/,
    // Syslog format: Jan 15 10:30:45 ERROR message
    /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\w+)\s+(.+)$/,
    // Simple format: [ERROR] message
    /^\[(\w+)\]\s*(.+)$/,
    // Level first: ERROR: message
    /^(\w+):\s*(.+)$/,
  ]

  for (const line of lines) {
    let parsed = false

    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) {
        let timestamp = ""
        let level = ""
        let message = ""
        let source = ""

        if (match.length === 4) {
          // Pattern with timestamp, level, message
          timestamp = match[1]
          level = match[2].toUpperCase()
          message = match[3]
        } else if (match.length === 3) {
          // Pattern without timestamp or with level first
          if (match[1].match(/^\w+$/)) {
            // Level first pattern
            timestamp = new Date().toISOString()
            level = match[1].toUpperCase()
            message = match[2]
          } else {
            // Timestamp without level
            timestamp = match[1]
            level = "INFO"
            message = match[2]
          }
        }

        // Normalize log levels
        if (!["ERROR", "WARN", "INFO", "DEBUG"].includes(level)) {
          if (level.includes("ERR")) level = "ERROR"
          else if (level.includes("WARN")) level = "WARN"
          else if (level.includes("DEBUG")) level = "DEBUG"
          else level = "INFO"
        }

        // Try to extract source/component
        const sourceMatch = message.match(/^\[([^\]]+)\]/)
        if (sourceMatch) {
          source = sourceMatch[1]
          message = message.replace(/^\[[^\]]+\]\s*/, "")
        }

        // Try to parse JSON metadata
        let metadata: Record<string, any> | undefined
        const jsonMatch = message.match(/\{[^}]+\}$/)
        if (jsonMatch) {
          try {
            metadata = JSON.parse(jsonMatch[0])
            message = message.replace(/\s*\{[^}]+\}$/, "")
          } catch {
            // Not valid JSON, keep as part of message
          }
        }

        logs.push({
          timestamp,
          level,
          message: message.trim(),
          source: source || undefined,
          metadata,
        })

        parsed = true
        break
      }
    }

    // If no pattern matched, treat as INFO log
    if (!parsed && line.trim()) {
      logs.push({
        timestamp: new Date().toISOString(),
        level: "INFO",
        message: line.trim(),
      })
    }
  }

  return logs
}
