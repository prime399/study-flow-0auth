/**
 * Table data processing and extraction utilities
 * Handles extraction of table data from AI responses
 */

export type TableData = {
  headers: string[]
  rows: string[][]
  caption?: string
}

export type ToolInvocation = {
  toolName: "displayTable"
  toolCallId: string
  state: "result"
  result: TableData
}

function toStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const result: string[] = []

  for (const item of value) {
    if (typeof item !== "string") {
      return null
    }
    result.push(item)
  }

  return result
}

function toRows(value: unknown): string[][] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const rows: string[][] = []

  for (const row of value) {
    const parsedRow = toStringArray(row)
    if (!parsedRow) {
      return null
    }
    rows.push(parsedRow)
  }

  return rows
}

function toTableData(raw: unknown): TableData | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const value = raw as {
    headers?: unknown
    rows?: unknown
    caption?: unknown
  }

  const headers = toStringArray(value.headers)
  const rows = toRows(value.rows)

  if (!headers || !rows) {
    return null
  }

  const caption =
    typeof value.caption === "string" && value.caption.trim().length > 0
      ? value.caption.trim()
      : undefined

  return { headers, rows, caption }
}

export function extractTablesFromContent(content: string): {
  content: string
  tables: TableData[]
} {
  const tables: TableData[] = []
  let sanitizedContent = content

  const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/gi

  sanitizedContent = sanitizedContent.replace(codeBlockRegex, (match, jsonPayload) => {
    try {
      const parsed = JSON.parse(jsonPayload) as {
        tables?: unknown
        table?: unknown
      }

      const candidateTables: unknown[] = Array.isArray(parsed.tables)
        ? parsed.tables
        : parsed.table !== undefined
        ? [parsed.table]
        : []

      const validTables = candidateTables
        .map((table) => toTableData(table))
        .filter((table): table is TableData => table !== null)

      if (validTables.length > 0) {
        tables.push(...validTables)
        return ""
      }
    } catch (error) {
      // Ignore parsing errors and keep the original match
    }

    return match
  })

  sanitizedContent = sanitizedContent.replace(/\n{3,}/g, "\n\n").trim()

  return { content: sanitizedContent, tables }
}