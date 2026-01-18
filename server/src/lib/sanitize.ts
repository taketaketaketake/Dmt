// =============================================================================
// INPUT SANITIZATION
// Basic XSS prevention for user-generated content
// =============================================================================

/**
 * Escapes HTML special characters to prevent XSS
 * Use for any user-generated text that will be rendered
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };

  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

/**
 * Strips HTML tags from text
 * Use as an alternative to escaping when you want plain text only
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

/**
 * Sanitizes user input text:
 * - Trims whitespace
 * - Strips HTML tags
 * - Normalizes whitespace (collapses multiple spaces/newlines)
 * - Returns null if empty after sanitization
 */
export function sanitizeText(text: string | null | undefined): string | null {
  if (!text) return null;

  const sanitized = stripHtml(text)
    .trim()
    .replace(/\s+/g, " "); // Collapse multiple whitespace

  return sanitized.length > 0 ? sanitized : null;
}

/**
 * Sanitizes multiline text (preserves newlines):
 * - Trims whitespace
 * - Strips HTML tags
 * - Normalizes horizontal whitespace only
 * - Returns null if empty after sanitization
 */
export function sanitizeMultilineText(text: string | null | undefined): string | null {
  if (!text) return null;

  const sanitized = stripHtml(text)
    .trim()
    .replace(/[^\S\n]+/g, " ") // Collapse horizontal whitespace, preserve newlines
    .replace(/\n{3,}/g, "\n\n"); // Max 2 consecutive newlines

  return sanitized.length > 0 ? sanitized : null;
}

/**
 * Validates and sanitizes a URL
 * Returns null if invalid
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.href;
  } catch {
    // If it doesn't start with protocol, try adding https
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      try {
        const parsed = new URL(`https://${trimmed}`);
        return parsed.href;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Sanitizes a handle/username:
 * - Lowercase
 * - Only alphanumeric, underscore, hyphen
 * - 3-30 characters
 * Returns null if invalid
 */
export function sanitizeHandle(handle: string | null | undefined): string | null {
  if (!handle) return null;

  const sanitized = handle.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");

  if (sanitized.length < 3 || sanitized.length > 30) {
    return null;
  }

  return sanitized;
}
