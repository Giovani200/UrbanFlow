-- DropForeignKey
ALTER TABLE "carbon_entries" DROP CONSTRAINT "carbon_entries_userId_fkey";

-- AddForeignKey
ALTER TABLE "carbon_entries" ADD CONSTRAINT "carbon_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
