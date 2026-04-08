-- Add missing FK and index on WorkspaceMember.userId
-- Idempotent: safe to run multiple times.

-- FK: WorkspaceMember.userId → User(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkspaceMember_userId_fkey'
  ) THEN
    ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- The composite PK is (workspaceId, userId). Queries that filter only by
-- userId (e.g. findMany) cannot use the PK index efficiently, so add a
-- single-column index.
CREATE INDEX IF NOT EXISTS "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
