import { describe, it, expect } from "vitest";
import { parsePagination, paginationMeta, PAGINATION } from "./pagination.js";

describe("parsePagination", () => {
  it("returns defaults when no params provided", () => {
    const result = parsePagination({});
    expect(result.limit).toBe(PAGINATION.DEFAULT_LIMIT);
    expect(result.offset).toBe(0);
  });

  it("parses valid limit and offset", () => {
    const result = parsePagination({ limit: "10", offset: "20" });
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(20);
  });

  it("clamps limit to MAX_LIMIT", () => {
    const result = parsePagination({ limit: "999" });
    expect(result.limit).toBe(PAGINATION.MAX_LIMIT);
  });

  it("defaults limit for invalid values", () => {
    expect(parsePagination({ limit: "abc" }).limit).toBe(PAGINATION.DEFAULT_LIMIT);
    expect(parsePagination({ limit: "0" }).limit).toBe(PAGINATION.DEFAULT_LIMIT);
    expect(parsePagination({ limit: "-5" }).limit).toBe(PAGINATION.DEFAULT_LIMIT);
  });

  it("defaults offset for invalid values", () => {
    expect(parsePagination({ offset: "abc" }).offset).toBe(0);
    expect(parsePagination({ offset: "-1" }).offset).toBe(0);
  });

  it("accepts offset of 0", () => {
    expect(parsePagination({ offset: "0" }).offset).toBe(0);
  });
});

describe("paginationMeta", () => {
  it("calculates hasMore correctly when more results exist", () => {
    const meta = paginationMeta(50, 20, 0);
    expect(meta.total).toBe(50);
    expect(meta.limit).toBe(20);
    expect(meta.offset).toBe(0);
    expect(meta.hasMore).toBe(true);
  });

  it("hasMore is false when at the end", () => {
    const meta = paginationMeta(50, 20, 40);
    expect(meta.hasMore).toBe(false);
  });

  it("hasMore is false when exactly at boundary", () => {
    const meta = paginationMeta(20, 20, 0);
    expect(meta.hasMore).toBe(false);
  });

  it("hasMore is false when past the end", () => {
    const meta = paginationMeta(10, 20, 0);
    expect(meta.hasMore).toBe(false);
  });

  it("handles zero total", () => {
    const meta = paginationMeta(0, 20, 0);
    expect(meta.total).toBe(0);
    expect(meta.hasMore).toBe(false);
  });
});
