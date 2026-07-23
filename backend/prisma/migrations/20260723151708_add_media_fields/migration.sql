-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "mediaType" TEXT,
ADD COLUMN     "mediaUrl" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "mediaType" TEXT NOT NULL DEFAULT 'image';

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "backgroundColor" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'media',
ALTER COLUMN "mediaUrl" DROP NOT NULL;
