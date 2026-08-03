-- CreateTable
CREATE TABLE "BuildBookmark" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,

    CONSTRAINT "BuildBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuildBookmark_userId_buildId_key" ON "BuildBookmark"("userId", "buildId");

-- AddForeignKey
ALTER TABLE "BuildBookmark" ADD CONSTRAINT "BuildBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildBookmark" ADD CONSTRAINT "BuildBookmark_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;
