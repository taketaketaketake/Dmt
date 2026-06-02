-- AlterTable
ALTER TABLE "NeedOption" ADD COLUMN     "offerable" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProfileSkill" (
    "profileId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileSkill_pkey" PRIMARY KEY ("profileId","optionId")
);

-- CreateIndex
CREATE INDEX "ProfileSkill_optionId_idx" ON "ProfileSkill"("optionId");

-- AddForeignKey
ALTER TABLE "ProfileSkill" ADD CONSTRAINT "ProfileSkill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSkill" ADD CONSTRAINT "ProfileSkill_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "NeedOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
