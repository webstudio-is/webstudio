/*
  Warnings:

  - You are about to alter the column `height` on the `Asset` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `width` on the `Asset` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "Asset" ALTER COLUMN "height" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "width" SET DATA TYPE DECIMAL(65,30);
