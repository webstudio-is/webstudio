/*
  Warnings:

  - You are about to drop the column `type` on the `Asset` table. All the data in the column will be lost.
  - Added the required column `format` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `height` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `Asset` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "type",
ADD COLUMN     "format" TEXT NOT NULL,
ADD COLUMN     "height" INTEGER NOT NULL,
ADD COLUMN     "size" INTEGER NOT NULL,
ADD COLUMN     "width" INTEGER NOT NULL;
