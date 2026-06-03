-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultUnit" TEXT NOT NULL,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Material_farmId_idx" ON "Material"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "Material_farmId_name_defaultUnit_key" ON "Material"("farmId", "name", "defaultUnit");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
