-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "status" "CommentStatus" NOT NULL DEFAULT 'APPROVED';
