-- Stage 3: Default workspace provisioning (data migration)
-- Idempotent: safe to run multiple times.

-- Create a default workspace for every existing user who doesn't have one yet.
INSERT INTO "Workspace" (id, name, "isDefault", "userId")
SELECT gen_random_uuid(), 'My workspace', true, u.id
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "Workspace" w WHERE w."userId" = u.id AND w."isDefault" = true
);

-- Assign all existing projects to their owner's default workspace.
-- Only updates projects that have no workspace assigned yet.
UPDATE "Project" p
SET "workspaceId" = w.id
FROM "Workspace" w
WHERE w."userId" = p."userId" AND w."isDefault" = true
  AND p."workspaceId" IS NULL;
