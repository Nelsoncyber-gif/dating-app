/*
  Warnings:

  - A unique constraint covering the columns `[verificationExtId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificationExtId" TEXT,
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'unverified';

-- CreateIndex
CREATE UNIQUE INDEX "User_verificationExtId_key" ON "User"("verificationExtId");
