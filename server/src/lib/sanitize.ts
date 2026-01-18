// =============================================================================
// INPUT SANITIZATION
// Centralized sanitization per resource type
// RULE: All user input goes through resource-specific sanitizers
// =============================================================================

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
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

// =============================================================================
// RESOURCE-SPECIFIC SANITIZERS
// All user input for a resource goes through these functions
// =============================================================================

/**
 * Profile input - sanitizes all profile fields
 */
export interface ProfileInput {
  name?: string;
  handle?: string;
  bio?: string;
  location?: string;
  portraitUrl?: string;
  websiteUrl?: string;
  twitterHandle?: string;
  linkedinUrl?: string;
  githubHandle?: string;
}

export interface SanitizedProfileInput {
  name?: string | null;
  handle?: string | null;
  bio?: string | null;
  location?: string | null;
  portraitUrl?: string | null;
  websiteUrl?: string | null;
  twitterHandle?: string | null;
  linkedinUrl?: string | null;
  githubHandle?: string | null;
}

export function sanitizeProfileInput(input: ProfileInput): SanitizedProfileInput {
  return {
    name: input.name !== undefined ? sanitizeText(input.name) : undefined,
    handle: input.handle !== undefined ? sanitizeHandle(input.handle) : undefined,
    bio: input.bio !== undefined ? sanitizeMultilineText(input.bio) : undefined,
    location: input.location !== undefined ? sanitizeText(input.location) : undefined,
    portraitUrl: input.portraitUrl !== undefined ? sanitizeUrl(input.portraitUrl) : undefined,
    websiteUrl: input.websiteUrl !== undefined ? sanitizeUrl(input.websiteUrl) : undefined,
    twitterHandle: input.twitterHandle !== undefined ? sanitizeHandle(input.twitterHandle) : undefined,
    linkedinUrl: input.linkedinUrl !== undefined ? sanitizeUrl(input.linkedinUrl) : undefined,
    githubHandle: input.githubHandle !== undefined ? sanitizeHandle(input.githubHandle) : undefined,
  };
}

/**
 * Project input - sanitizes all project fields
 */
export interface ProjectInput {
  title?: string;
  description?: string;
  websiteUrl?: string;
  repoUrl?: string;
}

export interface SanitizedProjectInput {
  title?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  repoUrl?: string | null;
}

export function sanitizeProjectInput(input: ProjectInput): SanitizedProjectInput {
  return {
    title: input.title !== undefined ? sanitizeText(input.title) : undefined,
    description: input.description !== undefined ? sanitizeMultilineText(input.description) : undefined,
    websiteUrl: input.websiteUrl !== undefined ? sanitizeUrl(input.websiteUrl) : undefined,
    repoUrl: input.repoUrl !== undefined ? sanitizeUrl(input.repoUrl) : undefined,
  };
}

/**
 * Job input - sanitizes all job fields
 */
export interface JobInput {
  title?: string;
  companyName?: string;
  description?: string;
  applyUrl?: string;
}

export interface SanitizedJobInput {
  title?: string | null;
  companyName?: string | null;
  description?: string | null;
  applyUrl?: string | null;
}

export function sanitizeJobInput(input: JobInput): SanitizedJobInput {
  return {
    title: input.title !== undefined ? sanitizeText(input.title) : undefined,
    companyName: input.companyName !== undefined ? sanitizeText(input.companyName) : undefined,
    description: input.description !== undefined ? sanitizeMultilineText(input.description) : undefined,
    applyUrl: input.applyUrl !== undefined ? sanitizeUrl(input.applyUrl) : undefined,
  };
}

/**
 * Project need context - sanitizes context text
 */
export function sanitizeNeedContext(text: string | null | undefined): string | null {
  if (!text) return null;

  const sanitized = sanitizeText(text);
  if (!sanitized) return null;

  // Max 180 chars for need context
  return sanitized.slice(0, 180);
}
