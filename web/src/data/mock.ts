// =============================================================================
// MOCK DATA
// Placeholder data for frontend development
// Will be replaced with API calls in later phase
// =============================================================================

import type { Profile, Project, Job, ProfileListItem, ProjectListItem, JobListItem } from "./types";

// -----------------------------------------------------------------------------
// PROFILES
// -----------------------------------------------------------------------------

export const mockProfiles: ProfileListItem[] = [
  {
    id: "1",
    name: "Marcus Chen",
    handle: "marcus",
    bio: "Building tools for urban agriculture. Previously at Ford Labs.",
    location: "Corktown",
    portraitUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
  },
  {
    id: "2",
    name: "Aisha Williams",
    handle: "aisha",
    bio: "Designer and community organizer. Focused on equitable transit.",
    location: "Midtown",
    portraitUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
  },
  {
    id: "3",
    name: "David Park",
    handle: "dpark",
    bio: "Software engineer. Working on local commerce infrastructure.",
    location: "Eastern Market",
    portraitUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
  },
  {
    id: "4",
    name: "Elena Rodriguez",
    handle: "elena",
    bio: "Architect. Designing adaptive reuse projects in the city.",
    location: "New Center",
    portraitUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
  },
  {
    id: "5",
    name: "James Morrison",
    handle: "jmorrison",
    bio: "Hardware engineer. Building sensors for environmental monitoring.",
    location: "Southwest",
    portraitUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
  },
  {
    id: "6",
    name: "Nina Okonkwo",
    handle: "nina",
    bio: "Educator and curriculum designer. Making tech accessible.",
    location: "University District",
    portraitUrl: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop",
  },
];

export const mockProfileDetail: Profile = {
  id: "1",
  name: "Marcus Chen",
  handle: "marcus",
  bio: "Building tools for urban agriculture. Previously at Ford Labs. Interested in the intersection of technology and food systems.",
  location: "Corktown",
  portraitUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
  websiteUrl: "https://marcus.dev",
  twitterHandle: "marcuschen",
  githubHandle: "mchen",
  linkedinUrl: "https://linkedin.com/in/marcuschen",
  approvalStatus: "approved",
};

// -----------------------------------------------------------------------------
// PROJECTS
// -----------------------------------------------------------------------------

export const mockProjects: ProjectListItem[] = [
  {
    id: "1",
    title: "Detroit Harvest",
    description: "Open-source platform connecting urban farms with local restaurants and markets.",
    status: "active",
    creator: mockProfiles[0],
  },
  {
    id: "2",
    title: "Transit Equity Map",
    description: "Interactive visualization of transit accessibility across Detroit neighborhoods.",
    status: "active",
    creator: mockProfiles[1],
  },
  {
    id: "3",
    title: "Local Loop",
    description: "Payment infrastructure for neighborhood commerce.",
    status: "active",
    creator: mockProfiles[2],
  },
  {
    id: "4",
    title: "Adaptive Detroit",
    description: "Documentation and case studies of building reuse in the city.",
    status: "completed",
    creator: mockProfiles[3],
  },
  {
    id: "5",
    title: "Air Quality Network",
    description: "Distributed sensor network for real-time environmental monitoring.",
    status: "active",
    creator: mockProfiles[4],
  },
];

export const mockProjectDetail: Project = {
  id: "1",
  title: "Detroit Harvest",
  description: "Open-source platform connecting urban farms with local restaurants and markets. We're building the infrastructure for a more resilient local food system.\n\nThe platform provides tools for inventory management, order coordination, and logistics optimization specifically designed for small-scale urban agriculture operations.",
  status: "active",
  websiteUrl: "https://detroitharvest.org",
  repoUrl: "https://github.com/detroitharvest/platform",
  createdAt: "2024-03-15T00:00:00Z",
  creator: mockProfiles[0],
};

// -----------------------------------------------------------------------------
// JOBS
// -----------------------------------------------------------------------------

export const mockJobs: JobListItem[] = [
  {
    id: "1",
    title: "Senior Frontend Engineer",
    companyName: "Detroit Harvest",
    type: "full_time",
    expiresAt: "2025-02-15T00:00:00Z",
    poster: mockProfiles[0],
  },
  {
    id: "2",
    title: "UX Research Lead",
    companyName: "Transit Equity Initiative",
    type: "full_time",
    expiresAt: "2025-02-20T00:00:00Z",
    poster: mockProfiles[1],
  },
  {
    id: "3",
    title: "Backend Developer",
    companyName: "Local Loop",
    type: "contract",
    expiresAt: "2025-02-10T00:00:00Z",
    poster: mockProfiles[2],
  },
  {
    id: "4",
    title: "Technical Writer",
    companyName: "Adaptive Detroit",
    type: "part_time",
    expiresAt: "2025-03-01T00:00:00Z",
    poster: mockProfiles[3],
  },
];

export const mockJobDetail: Job = {
  id: "1",
  title: "Senior Frontend Engineer",
  companyName: "Detroit Harvest",
  description: "We're looking for an experienced frontend engineer to help build the next generation of our platform.\n\nYou'll work closely with urban farmers and restaurant partners to design interfaces that actually work for people in the field. Experience with React and TypeScript required. Bonus points for experience with mapping libraries.\n\nThis is a fully remote position with occasional on-site visits to partner farms.",
  type: "full_time",
  applyUrl: "https://detroitharvest.org/careers/senior-frontend",
  expiresAt: "2025-02-15T00:00:00Z",
  createdAt: "2024-01-15T00:00:00Z",
  poster: mockProfiles[0],
};

// -----------------------------------------------------------------------------
// CURRENT USER (for account views)
// -----------------------------------------------------------------------------

export const mockCurrentUser = {
  user: {
    id: "1",
    email: "marcus@example.com",
    status: "approved" as const,
    isEmployer: true,
    isAdmin: false,
  },
  profile: mockProfileDetail,
};

// -----------------------------------------------------------------------------
// FAVORITES & FOLLOWS (for private signals)
// -----------------------------------------------------------------------------

export const mockFavorites = [mockProfiles[1], mockProfiles[3], mockProfiles[5]];
export const mockFollows = [mockProjects[1], mockProjects[2]];
