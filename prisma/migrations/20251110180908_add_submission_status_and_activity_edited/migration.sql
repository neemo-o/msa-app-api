-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'GRADED', 'RETURNED');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING';
