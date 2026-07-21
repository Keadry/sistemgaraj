/*
  Warnings:

  - You are about to drop the column `ramId` on the `BuildEditRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BuildEditRequest" DROP COLUMN "ramId",
ADD COLUMN     "ramIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
