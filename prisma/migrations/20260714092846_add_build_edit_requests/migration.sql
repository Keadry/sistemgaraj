-- CreateTable
CREATE TABLE "BuildEditRequest" (
    "id" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "buildId" TEXT NOT NULL,
    "cpuId" TEXT,
    "motherboardId" TEXT,
    "ramId" TEXT,
    "gpuId" TEXT,
    "psuId" TEXT,
    "caseId" TEXT,

    CONSTRAINT "BuildEditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildEditRequestImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "BuildEditRequestImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildEditRequestNote" (
    "id" TEXT NOT NULL,
    "componentType" "ComponentType" NOT NULL,
    "note" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "BuildEditRequestNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BuildEditRequest" ADD CONSTRAINT "BuildEditRequest_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildEditRequestImage" ADD CONSTRAINT "BuildEditRequestImage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BuildEditRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildEditRequestNote" ADD CONSTRAINT "BuildEditRequestNote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "BuildEditRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
