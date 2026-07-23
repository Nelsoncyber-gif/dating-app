-- AlterTable
ALTER TABLE "User" ADD COLUMN     "education" TEXT,
ADD COLUMN     "loveLanguage" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'light',
ADD COLUMN     "zodiacSign" TEXT;
