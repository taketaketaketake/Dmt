import type { User, Profile } from "@prisma/client";

// Authenticated user attached to request after auth middleware
export interface AuthUser {
  id: string;
  email: string;
  status: User["status"];
  isEmployer: boolean;
  isAdmin: boolean;
}

// Extended user with profile (for /me endpoint)
export interface AuthUserWithProfile extends AuthUser {
  profile: Profile | null;
}

// Fastify request augmentation
declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}
