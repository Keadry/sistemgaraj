-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "showBirthDate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showLastActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true;
