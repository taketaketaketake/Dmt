-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'approved', 'suspended');

-- CreateEnum
CREATE TYPE "ProfileApprovalStatus" AS ENUM ('draft', 'pending_review', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('full_time', 'part_time', 'contract', 'freelance');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('skill', 'industry', 'project_type');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'pending',
    "isEmployer" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "bio" TEXT,
    "location" TEXT,
    "portraitUrl" TEXT,
    "websiteUrl" TEXT,
    "twitterHandle" TEXT,
    "linkedinUrl" TEXT,
    "githubHandle" TEXT,
    "approvalStatus" "ProfileApprovalStatus" NOT NULL DEFAULT 'draft',
    "approvedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileCategory" (
    "profileId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileCategory_pkey" PRIMARY KEY ("profileId","categoryId")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "websiteUrl" TEXT,
    "repoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "needsReminderSentAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCategory" (
    "projectId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCategory_pkey" PRIMARY KEY ("projectId","categoryId")
);

-- CreateTable
CREATE TABLE "ProjectCollaborator" (
    "projectId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCollaborator_pkey" PRIMARY KEY ("projectId","profileId")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "posterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "description" TEXT,
    "type" "JobType" NOT NULL,
    "applyUrl" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeedCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NeedCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeedOption" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NeedOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectNeed" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "contextText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectNeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectNeedOption" (
    "projectNeedId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectNeedOption_pkey" PRIMARY KEY ("projectNeedId","optionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_stripeCustomerId_idx" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_token_key" ON "MagicLinkToken"("token");

-- CreateIndex
CREATE INDEX "MagicLinkToken_token_idx" ON "MagicLinkToken"("token");

-- CreateIndex
CREATE INDEX "MagicLinkToken_userId_idx" ON "MagicLinkToken"("userId");

-- CreateIndex
CREATE INDEX "MagicLinkToken_expiresAt_idx" ON "MagicLinkToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_handle_key" ON "Profile"("handle");

-- CreateIndex
CREATE INDEX "Profile_name_idx" ON "Profile"("name");

-- CreateIndex
CREATE INDEX "Profile_handle_idx" ON "Profile"("handle");

-- CreateIndex
CREATE INDEX "Profile_approvalStatus_idx" ON "Profile"("approvalStatus");

-- CreateIndex
CREATE INDEX "Project_creatorId_idx" ON "Project"("creatorId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_title_idx" ON "Project"("title");

-- CreateIndex
CREATE INDEX "Job_posterId_idx" ON "Job"("posterId");

-- CreateIndex
CREATE INDEX "Job_active_idx" ON "Job"("active");

-- CreateIndex
CREATE INDEX "Job_expiresAt_idx" ON "Job"("expiresAt");

-- CreateIndex
CREATE INDEX "Job_active_expiresAt_idx" ON "Job"("active", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_type_idx" ON "Category"("type");

-- CreateIndex
CREATE INDEX "UserFavorite_userId_idx" ON "UserFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavorite_userId_profileId_key" ON "UserFavorite"("userId", "profileId");

-- CreateIndex
CREATE INDEX "ProjectFollow_userId_idx" ON "ProjectFollow"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFollow_userId_projectId_key" ON "ProjectFollow"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "NeedCategory_slug_key" ON "NeedCategory"("slug");

-- CreateIndex
CREATE INDEX "NeedCategory_slug_idx" ON "NeedCategory"("slug");

-- CreateIndex
CREATE INDEX "NeedCategory_active_idx" ON "NeedCategory"("active");

-- CreateIndex
CREATE INDEX "NeedOption_categoryId_idx" ON "NeedOption"("categoryId");

-- CreateIndex
CREATE INDEX "NeedOption_active_idx" ON "NeedOption"("active");

-- CreateIndex
CREATE UNIQUE INDEX "NeedOption_categoryId_slug_key" ON "NeedOption"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "ProjectNeed_projectId_idx" ON "ProjectNeed"("projectId");

-- CreateIndex
CREATE INDEX "ProjectNeed_updatedAt_idx" ON "ProjectNeed"("updatedAt");

-- CreateIndex
CREATE INDEX "ProjectNeed_projectId_updatedAt_idx" ON "ProjectNeed"("projectId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectNeed_projectId_categoryId_key" ON "ProjectNeed"("projectId", "categoryId");

-- CreateIndex
CREATE INDEX "ProjectNeedOption_projectNeedId_idx" ON "ProjectNeedOption"("projectNeedId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicLinkToken" ADD CONSTRAINT "MagicLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileCategory" ADD CONSTRAINT "ProfileCategory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileCategory" ADD CONSTRAINT "ProfileCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCategory" ADD CONSTRAINT "ProjectCategory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCategory" ADD CONSTRAINT "ProjectCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavorite" ADD CONSTRAINT "UserFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavorite" ADD CONSTRAINT "UserFavorite_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFollow" ADD CONSTRAINT "ProjectFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFollow" ADD CONSTRAINT "ProjectFollow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedOption" ADD CONSTRAINT "NeedOption_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "NeedCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectNeed" ADD CONSTRAINT "ProjectNeed_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectNeed" ADD CONSTRAINT "ProjectNeed_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "NeedCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectNeedOption" ADD CONSTRAINT "ProjectNeedOption_projectNeedId_fkey" FOREIGN KEY ("projectNeedId") REFERENCES "ProjectNeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectNeedOption" ADD CONSTRAINT "ProjectNeedOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "NeedOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
