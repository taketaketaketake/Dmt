import { describe, it, expect } from "vitest";
import {
  sanitizeText,
  sanitizeUrl,
  sanitizeHandle,
  sanitizeProfileInput,
  sanitizeNeedContext,
  stripHtml,
  sanitizeMultilineText,
} from "./sanitize.js";

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<b>bold</b>")).toBe("bold");
    expect(stripHtml("<script>alert('xss')</script>")).toBe("alert('xss')");
    expect(stripHtml("no tags")).toBe("no tags");
  });

  it("handles nested tags", () => {
    expect(stripHtml("<div><p>hello</p></div>")).toBe("hello");
  });
});

describe("sanitizeText", () => {
  it("returns null for falsy inputs", () => {
    expect(sanitizeText(null)).toBeNull();
    expect(sanitizeText(undefined)).toBeNull();
    expect(sanitizeText("")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("collapses multiple whitespace to single space", () => {
    expect(sanitizeText("hello    world")).toBe("hello world");
  });

  it("strips HTML and collapses", () => {
    expect(sanitizeText("  <b>hello</b>   world  ")).toBe("hello world");
  });

  it("returns null for whitespace-only input", () => {
    expect(sanitizeText("   ")).toBeNull();
  });

  it("returns null for HTML-only input", () => {
    expect(sanitizeText("<br><hr>")).toBeNull();
  });
});

describe("sanitizeMultilineText", () => {
  it("preserves single newlines", () => {
    expect(sanitizeMultilineText("line1\nline2")).toBe("line1\nline2");
  });

  it("collapses 3+ newlines to 2", () => {
    expect(sanitizeMultilineText("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("collapses horizontal whitespace but not newlines", () => {
    expect(sanitizeMultilineText("a   b\nc   d")).toBe("a b\nc d");
  });
});

describe("sanitizeUrl", () => {
  it("returns null for falsy inputs", () => {
    expect(sanitizeUrl(null)).toBeNull();
    expect(sanitizeUrl(undefined)).toBeNull();
    expect(sanitizeUrl("")).toBeNull();
  });

  it("accepts valid http/https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com/");
    expect(sanitizeUrl("http://example.com/path")).toBe("http://example.com/path");
  });

  it("rejects non-http protocols", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeUrl("ftp://example.com")).toBeNull();
    expect(sanitizeUrl("data:text/html,<h1>x</h1>")).toBeNull();
  });

  it("auto-prepends https for bare domains", () => {
    expect(sanitizeUrl("example.com")).toBe("https://example.com/");
    expect(sanitizeUrl("example.com/path")).toBe("https://example.com/path");
  });

  it("trims whitespace", () => {
    expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com/");
  });

  it("returns null for invalid URLs", () => {
    expect(sanitizeUrl("not a url at all")).toBeNull();
  });
});

describe("sanitizeHandle", () => {
  it("returns null for falsy inputs", () => {
    expect(sanitizeHandle(null)).toBeNull();
    expect(sanitizeHandle(undefined)).toBeNull();
    expect(sanitizeHandle("")).toBeNull();
  });

  it("lowercases input", () => {
    expect(sanitizeHandle("TestUser")).toBe("testuser");
  });

  it("strips invalid characters", () => {
    expect(sanitizeHandle("test user!")).toBe("testuser");
    expect(sanitizeHandle("test.user")).toBe("testuser");
  });

  it("allows underscores and hyphens", () => {
    expect(sanitizeHandle("test_user")).toBe("test_user");
    expect(sanitizeHandle("test-user")).toBe("test-user");
  });

  it("rejects handles shorter than 3 chars", () => {
    expect(sanitizeHandle("ab")).toBeNull();
  });

  it("rejects handles longer than 30 chars", () => {
    expect(sanitizeHandle("a".repeat(31))).toBeNull();
  });

  it("accepts handles between 3 and 30 chars", () => {
    expect(sanitizeHandle("abc")).toBe("abc");
    expect(sanitizeHandle("a".repeat(30))).toBe("a".repeat(30));
  });
});

describe("sanitizeProfileInput", () => {
  it("sanitizes all profile fields", () => {
    const result = sanitizeProfileInput({
      name: "  <b>Test</b>  User  ",
      handle: "TestUser",
      bio: "A bio  with   spaces",
      websiteUrl: "example.com",
    });

    expect(result.name).toBe("Test User");
    expect(result.handle).toBe("testuser");
    expect(result.bio).toBe("A bio with spaces");
    expect(result.websiteUrl).toBe("https://example.com/");
  });

  it("leaves undefined fields as undefined", () => {
    const result = sanitizeProfileInput({ name: "Test" });
    expect(result.name).toBe("Test");
    expect(result.handle).toBeUndefined();
    expect(result.bio).toBeUndefined();
  });
});

describe("sanitizeNeedContext", () => {
  it("returns null for falsy inputs", () => {
    expect(sanitizeNeedContext(null)).toBeNull();
    expect(sanitizeNeedContext(undefined)).toBeNull();
    expect(sanitizeNeedContext("")).toBeNull();
  });

  it("sanitizes and trims text", () => {
    expect(sanitizeNeedContext("  hello   world  ")).toBe("hello world");
  });

  it("truncates to 180 characters", () => {
    const longText = "a".repeat(200);
    const result = sanitizeNeedContext(longText);
    expect(result).toHaveLength(180);
  });

  it("strips HTML from context", () => {
    expect(sanitizeNeedContext("<script>evil</script>looking for help")).toBe("evillooking for help");
  });
});
