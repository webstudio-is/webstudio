UPDATE
  "Build"
SET
  deployment = deployment::jsonb ||('{"projectDomain": "' || "Project".domain || '" }')::jsonb
FROM
  "Project"
WHERE
  "Project".id = "Build"."projectId"
  AND "Build".deployment IS NOT NULL;

