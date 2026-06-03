import { vi } from "vitest";

export const mockAuth = {
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
};

export const mockProfiles = {
  list: vi.fn(),
  get: vi.fn(),
  me: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  submit: vi.fn(),
  skills: vi.fn(),
  updateSkills: vi.fn(),
  matchingProjects: vi.fn(),
};

export const mockProjects = {
  list: vi.fn(),
  get: vi.fn(),
  mine: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getNeeds: vi.fn(),
  updateNeeds: vi.fn(),
  matches: vi.fn(),
};

export const mockNeeds = {
  taxonomy: vi.fn(),
};

export const mockCategories = {
  list: vi.fn(),
};

export const mockJobs = {
  list: vi.fn(),
  get: vi.fn(),
  mine: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

export const mockApiError = class extends Error {
  status: number;
  statusText: string;
  body?: { error?: string };
  constructor(status: number, statusText: string, body?: { error?: string }) {
    super(body?.error || statusText);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
};

vi.mock("../../lib/api", () => ({
  auth: mockAuth,
  profiles: mockProfiles,
  projects: mockProjects,
  needs: mockNeeds,
  categories: mockCategories,
  jobs: mockJobs,
  ApiError: mockApiError,
}));
