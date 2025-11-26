-- Add counter columns to R2File
ALTER TABLE "R2File" ADD COLUMN "approvedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "R2File" ADD COLUMN "committedCount" INTEGER NOT NULL DEFAULT 0;

-- Populate counters from existing WebTranslation rows
UPDATE "R2File" SET "approvedCount" = (
  SELECT COUNT(*) FROM "WebTranslation" wt
  WHERE wt."projectId" = "R2File"."projectId"
    AND wt."language" = "R2File"."lang"
    AND wt."filename" = "R2File"."filename"
    AND wt."status" = 'approved'
);

UPDATE "R2File" SET "committedCount" = (
  SELECT COUNT(*) FROM "WebTranslation" wt
  WHERE wt."projectId" = "R2File"."projectId"
    AND wt."language" = "R2File"."lang"
    AND wt."filename" = "R2File"."filename"
    AND wt."status" = 'committed'
);

-- Trigger: After INSERT on WebTranslation -> increment counters
CREATE TRIGGER IF NOT EXISTS webtranslation_after_insert
AFTER INSERT ON "WebTranslation"
BEGIN
  UPDATE "R2File"
  SET "approvedCount" = "approvedCount" + 1
  WHERE "projectId" = NEW."projectId" AND "lang" = NEW."language" AND "filename" = NEW."filename" AND NEW."status" = 'approved';

  UPDATE "R2File"
  SET "committedCount" = "committedCount" + 1
  WHERE "projectId" = NEW."projectId" AND "lang" = NEW."language" AND "filename" = NEW."filename" AND NEW."status" = 'committed';
END;

-- Trigger: After UPDATE on WebTranslation -> adjust counters if status or file changed
CREATE TRIGGER IF NOT EXISTS webtranslation_after_update
AFTER UPDATE ON "WebTranslation"
BEGIN
  -- Decrement counters from OLD record if it was approved/committed
  UPDATE "R2File"
  SET "approvedCount" = CASE WHEN "approvedCount" > 0 AND OLD."status" = 'approved' THEN "approvedCount" - 1 ELSE "approvedCount" END
  WHERE "projectId" = OLD."projectId" AND "lang" = OLD."language" AND "filename" = OLD."filename";

  UPDATE "R2File"
  SET "committedCount" = CASE WHEN "committedCount" > 0 AND OLD."status" = 'committed' THEN "committedCount" - 1 ELSE "committedCount" END
  WHERE "projectId" = OLD."projectId" AND "lang" = OLD."language" AND "filename" = OLD."filename";

  -- Increment counters for NEW record if it's approved/committed
  UPDATE "R2File"
  SET "approvedCount" = "approvedCount" + 1
  WHERE "projectId" = NEW."projectId" AND "lang" = NEW."language" AND "filename" = NEW."filename" AND NEW."status" = 'approved';

  UPDATE "R2File"
  SET "committedCount" = "committedCount" + 1
  WHERE "projectId" = NEW."projectId" AND "lang" = NEW."language" AND "filename" = NEW."filename" AND NEW."status" = 'committed';
END;

-- Trigger: After DELETE on WebTranslation -> decrement counters
CREATE TRIGGER IF NOT EXISTS webtranslation_after_delete
AFTER DELETE ON "WebTranslation"
BEGIN
  UPDATE "R2File"
  SET "approvedCount" = CASE WHEN "approvedCount" > 0 AND OLD."status" = 'approved' THEN "approvedCount" - 1 ELSE "approvedCount" END
  WHERE "projectId" = OLD."projectId" AND "lang" = OLD."language" AND "filename" = OLD."filename";

  UPDATE "R2File"
  SET "committedCount" = CASE WHEN "committedCount" > 0 AND OLD."status" = 'committed' THEN "committedCount" - 1 ELSE "committedCount" END
  WHERE "projectId" = OLD."projectId" AND "lang" = OLD."language" AND "filename" = OLD."filename";
END;
