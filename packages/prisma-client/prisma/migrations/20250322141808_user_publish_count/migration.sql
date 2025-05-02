CREATE OR REPLACE VIEW user_publish_count AS
SELECT DISTINCT "userId" AS user_id, count(*)
FROM "Build"
LEFT JOIN "Project" ON "Project".id="Build"."projectId"
WHERE DATE_TRUNC('day', "Build"."createdAt") = DATE_TRUNC('day', NOW())
AND "Build".deployment IS NOT NULL
GROUP BY "userId";
