-- DropForeignKey
ALTER TABLE "BuildComponent" DROP CONSTRAINT "BuildComponent_buildId_fkey";

-- DropForeignKey
ALTER TABLE "BuildEditRequest" DROP CONSTRAINT "BuildEditRequest_buildId_fkey";

-- DropForeignKey
ALTER TABLE "BuildEditRequestImage" DROP CONSTRAINT "BuildEditRequestImage_requestId_fkey";

-- DropForeignKey
ALTER TABLE "BuildEditRequestNote" DROP CONSTRAINT "BuildEditRequestNote_requestId_fkey";

-- DropForeignKey
ALTER TABLE "BuildImage" DROP CONSTRAINT "BuildImage_buildId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_buildId_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_buildId_fkey";

-- AddForeignKey
ALTER TABLE "BuildComponent" ADD CONSTRAINT "BuildComponent_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildImage" ADD CONSTRAINT "BuildImage_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildEditRequest" ADD CONSTRAINT "BuildEditRequest_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildEditRequestImage" ADD CONSTRAINT "BuildEditRequestImage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BuildEditRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildEditRequestNote" ADD CONSTRAINT "BuildEditRequestNote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BuildEditRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
