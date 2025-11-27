-- Add deleting column to R2File for coordinated transactional-like cleanup
ALTER TABLE "R2File" ADD COLUMN "deleting" BOOLEAN NOT NULL DEFAULT false;

-- Add miscR2Key column to R2File for storing optional misc metadata R2 key
ALTER TABLE "R2File" ADD COLUMN "miscR2Key" TEXT;
