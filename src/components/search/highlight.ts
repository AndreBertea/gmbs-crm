export interface HighlightSegment {
  text: string
  isMatch: boolean
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export const getHighlightSegments = (text: string | null | undefined, query: string): HighlightSegment[] => {
  if (!text) {
    return []
  }

  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return [{ text, isMatch: false }]
  }

  const escaped = escapeRegExp(trimmedQuery)
  if (!escaped) {
    return [{ text, isMatch: false }]
  }

  const matcher = new RegExp(escaped, "gi")
  const segments: HighlightSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = matcher.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isMatch: false })
    }
    segments.push({ text: match[0], isMatch: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isMatch: false })
  }

  return segments.length > 0 ? segments : [{ text, isMatch: false }]
}
