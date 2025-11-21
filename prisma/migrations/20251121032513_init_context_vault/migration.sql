-- CreateEnum
CREATE TYPE "CoreBlockKind" AS ENUM ('CANON', 'SECONDARY');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PASS', 'FAIL');

-- CreateTable
CREATE TABLE "Play" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Play_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreBlock" (
    "id" TEXT NOT NULL,
    "kind" "CoreBlockKind" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shape" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schemaJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dab" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "systemPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "playId" TEXT,
    "shapeId" TEXT,
    "dabId" TEXT,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "configJson" TEXT,
    "judge" TEXT,
    "resultJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "playId" TEXT,
    "shapeId" TEXT,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Play_slug_key" ON "Play"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Shape_slug_key" ON "Shape"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Dab_slug_key" ON "Dab"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_runId_key" ON "Asset"("runId");

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_playId_fkey" FOREIGN KEY ("playId") REFERENCES "Play"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_shapeId_fkey" FOREIGN KEY ("shapeId") REFERENCES "Shape"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_dabId_fkey" FOREIGN KEY ("dabId") REFERENCES "Dab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_playId_fkey" FOREIGN KEY ("playId") REFERENCES "Play"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_shapeId_fkey" FOREIGN KEY ("shapeId") REFERENCES "Shape"("id") ON DELETE SET NULL ON UPDATE CASCADE;
