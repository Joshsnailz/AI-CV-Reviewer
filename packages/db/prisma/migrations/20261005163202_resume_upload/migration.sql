-- AlterTable
ALTER TABLE "resume_versions" ADD COLUMN     "extraction_warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "page_count" INTEGER,
ADD COLUMN     "word_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "resumes" ALTER COLUMN "user_id" DROP NOT NULL;
