/*
  Warnings:

  - Added the required column `churchId` to the `Activity` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "churchId" TEXT;

-- Update existing activities with churchId from their authors
UPDATE "Activity" SET "churchId" = "users"."churchId"
FROM "users"
WHERE "Activity"."authorId" = "users"."id";

-- Make churchId NOT NULL after populating data
ALTER TABLE "Activity" ALTER COLUMN "churchId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
