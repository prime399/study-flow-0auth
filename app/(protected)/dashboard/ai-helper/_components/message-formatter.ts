/**
 * Message content formatting utilities
 * Handles JSON extraction, markdown normalization, and content structuring
 */

export const formatMessageContent = (content: string): string => {
  const extractJsonBlock = (text: string, startIndex: number) => {
    let depth = 0
    let inString = false
    let previous = ''

    for (let i = startIndex; i < text.length; i++) {
      const char = text[i]

      if (char === "\"" && previous !== "\\") {
        inString = !inString
      }

      if (!inString) {
        if (char === '{') {
          depth++
        } else if (char === '}') {
          depth--
          if (depth === 0) {
            return { json: text.slice(startIndex, i + 1), endIndex: i + 1 }
          }
        }
      }

      previous = char
    }

    return null
  }

  const normaliseJsonValue = (value: string) => {
    const lower = value.toLowerCase()
    const keywordIndex = lower.indexOf('json')
    if (keywordIndex === -1) return value

    const braceIndex = value.indexOf('{', keywordIndex)
    if (braceIndex === -1) return value

    const extracted = extractJsonBlock(value, braceIndex)
    if (!extracted) return value

    const before = value.slice(0, keywordIndex).trim()
    const after = value.slice(extracted.endIndex).trim()

    let pretty = extracted.json
    try {
      pretty = JSON.stringify(JSON.parse(extracted.json), null, 2)
    } catch (_error) {
      pretty = extracted.json
    }

    const segments: string[] = []
    if (before) segments.push(before)

    segments.push(['```json', pretty, '```'].join('\n'))

    if (after) segments.push(after)

    return segments.join('\n\n')
  }

  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>(?=\s*\n?)/gi, '\n')
    .replace(/[\u2022\u2023\u25CF]/g, '-')
    .replace(/:\s+-/g, ':\n-')
    .trim()

  const lines = normalized.split(/\n/)
  const formattedLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      formattedLines.push('')
      continue
    }

    if (/^[-*>`]|^\d+\./.test(trimmed) || trimmed.startsWith('```')) {
      formattedLines.push(line)
      continue
    }

    const headingMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9\s&/%()-]{0,60}):$/)
    if (headingMatch) {
      formattedLines.push(`**${headingMatch[1]}:**`)
      continue
    }

    const segmentsByTab = line
      .split(/\t+/)
      .map((segment) => segment.trim())
      .filter(Boolean)

    let label: string | null = null
    let value: string | null = null

    if (segmentsByTab.length >= 2) {
      label = segmentsByTab.shift() ?? null
      value = segmentsByTab.join(' ').trim()
    } else {
      const segmentsBySpace = line
        .split(/\s{3,}/)
        .map((segment) => segment.trim())
        .filter(Boolean)

      if (segmentsBySpace.length >= 2) {
        label = segmentsBySpace.shift() ?? null
        value = segmentsBySpace.join(' ').trim()
      }
    }

    if (
      label &&
      value &&
      /^[A-Za-z][A-Za-z0-9\s&/%()-]{0,60}$/.test(label) &&
      !label.includes(':')
    ) {
      const formattedValue = normaliseJsonValue(value)
      if (formattedValue.includes('\n')) {
        formattedLines.push(`- **${label}:**\n\n${formattedValue}`)
      } else {
        formattedLines.push(`- **${label}:** ${formattedValue}`)
      }
      continue
    }

    formattedLines.push(line)
  }

  return formattedLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}