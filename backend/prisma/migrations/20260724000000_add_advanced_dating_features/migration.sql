-- Create MessageReaction table
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- Create ProfilePrompt table
CREATE TABLE "ProfilePrompt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfilePrompt_pkey" PRIMARY KEY ("id")
);

-- Create Milestone table
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- Create VideoIntro table
CREATE TABLE "VideoIntro" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoIntro_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_key" ON "MessageReaction"("messageId", "userId");
CREATE UNIQUE INDEX "Milestone_matchId_type_key" ON "Milestone"("matchId", "type");
CREATE UNIQUE INDEX "VideoIntro_userId_key" ON "VideoIntro"("userId");

-- Add columns to SafetyCheck
ALTER TABLE "SafetyCheck" ADD COLUMN "shareLocation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SafetyCheck" ADD COLUMN "sharedWith" TEXT;
ALTER TABLE "SafetyCheck" ADD COLUMN "lastLat" DOUBLE PRECISION;
ALTER TABLE "SafetyCheck" ADD COLUMN "lastLng" DOUBLE PRECISION;

-- Add daily pick tracking to User
ALTER TABLE "User" ADD COLUMN "lastDailyPickAt" TIMESTAMP(3);

-- Add foreign keys
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfilePrompt" ADD CONSTRAINT "ProfilePrompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoIntro" ADD CONSTRAINT "VideoIntro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
