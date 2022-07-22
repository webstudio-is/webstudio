/*
  Warnings:

  - Added the required column `location` to the `Asset` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Location" AS ENUM ('FS', 'REMOTE');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "location" "Location" NOT NULL;
