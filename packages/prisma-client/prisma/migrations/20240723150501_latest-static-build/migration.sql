
CREATE OR REPLACE VIEW "LatestStaticBuildPerProject" AS
SELECT DISTINCT ON ("projectId")
  bld.id AS "buildId",
  bld."projectId",
  bld."updatedAt",
  bld."publishStatus"
FROM
  "Build" bld
WHERE
  bld.deployment IS NOT NULL
  AND bld.deployment::jsonb ->> 'destination'::text = 'static'
ORDER BY
  bld."projectId",
  bld."createdAt" DESC,
  "buildId";

