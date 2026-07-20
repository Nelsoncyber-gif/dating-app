/*
  Warnings:

  - A unique constraint covering the columns `[conversationId]` on the table `Community` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Community" ADD COLUMN     "conversationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Community_conversationId_key" ON "Community"("conversationId");

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
