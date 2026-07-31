-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNewsletterOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailNotifyOnActivity" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'tr',
ADD COLUMN     "notifyOnBuildComment" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOnBuildLike" BOOLEAN NOT NULL DEFAULT true;
