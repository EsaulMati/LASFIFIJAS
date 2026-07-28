/*
  Warnings:

  - You are about to drop the column `planName` on the `Membership` table. All the data in the column will be lost.
  - Added the required column `plan` to the `Membership` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Membership` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MembershipPlan" AS ENUM ('ONE_MONTH', 'THREE_MONTHS', 'SIX_MONTHS', 'TWELVE_MONTHS');

-- AlterTable
ALTER TABLE "Membership" DROP COLUMN "planName",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "plan" "MembershipPlan" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
