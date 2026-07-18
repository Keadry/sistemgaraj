/*
  Warnings:

  - The `storageId` column on the `BuildEditRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "BuildEditRequest" DROP COLUMN "storageId",
ADD COLUMN     "storageId" TEXT[] DEFAULT ARRAY[]::TEXT[];
