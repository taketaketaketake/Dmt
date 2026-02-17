import { vi } from "vitest";
import { type PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>();

// Mock the prisma module so all imports get our mock
vi.mock("../../lib/prisma.js", () => ({
  prisma: prismaMock,
}));

// Reset all mock state between tests
export function resetPrismaMock() {
  mockReset(prismaMock);
}
