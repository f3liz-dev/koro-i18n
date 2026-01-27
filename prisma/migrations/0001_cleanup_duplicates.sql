-- Cleanup duplicate WebTranslation entries before applying unique constraint
-- Keep only the most recent entry (by createdAt) for each projectId/language/filename/key combination

DELETE FROM WebTranslation 
WHERE id IN (
  SELECT t1.id
  FROM WebTranslation t1
  INNER JOIN (
    SELECT projectId, language, filename, key, MAX(createdAt) as maxCreatedAt
    FROM WebTranslation
    GROUP BY projectId, language, filename, key
    HAVING COUNT(*) > 1
  ) t2 ON t1.projectId = t2.projectId 
    AND t1.language = t2.language 
    AND t1.filename = t2.filename 
    AND t1.key = t2.key
  WHERE t1.createdAt < t2.maxCreatedAt
);
