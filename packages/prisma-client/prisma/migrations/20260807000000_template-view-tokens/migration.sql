-- Backfill a 'viewers' AuthorizationToken for each legacy template project
-- that doesn't already have one.
--
-- This preserves public "view" access after the hardcoded template allowlist
-- was removed from packages/trpc-interface/src/authorize/project.server.ts.
-- The marketplace ApprovedMarketplaceProduct view derives its authorizationToken
-- from these 'viewers' tokens, so without them template projects would no
-- longer be viewable or clonable.
INSERT INTO "AuthorizationToken" ("token", "projectId", "name", "relation", "createdAt", "canClone", "canCopy", "canPublish", "canUseApi")
SELECT
  gen_random_uuid()::text AS "token",
  p.id AS "projectId",
  'Legacy template token' AS "name",
  'viewers' AS "relation",
  now() AS "createdAt",
  true AS "canClone",
  true AS "canCopy",
  false AS "canPublish",
  false AS "canUseApi"
FROM
  "Project" p
WHERE
  p."id" IN (
    -- Production
    '5e086cf4-4293-471c-8eab-ddca8b5cd4db',
    '94e6e1b8-c6c4-485a-9d7a-8282e11920c0',
    '05954204-fcee-407e-b47f-77a38de74431',
    'afc162c2-6396-41b7-a855-8fc04604a7b1',
    '3f260731-825b-486a-b534-e747f0ed6106',
    '400b1bde-def1-49e0-9b64-e26416d326fa',
    '2e802ad7-ef32-48e6-8706-3a162785ef95',
    '01f6f1d8-06f5-4a6c-a3b1-89a0448046c7',
    '5b33acf4-53cf-4f03-8973-d5679772edee',
    '909a139b-1f2d-415a-ac90-382fa19fa7d8',
    'ef82ee51-e4d6-4a69-a4cc-7bf1dee65ed7',
    'e761178f-6ac6-47f6-b881-56cc75640d73',
    -- Staging IDs
    'c236999d-be6b-43fb-9edc-78a2ba59e56d',
    'a1371dce-752c-4ccf-8ea4-88bab577fe50',
    '6204396c-3f9e-4d29-8d19-ff0f76960a74'
  )
  AND NOT EXISTS (
    SELECT
      1
    FROM
      "AuthorizationToken" t
    WHERE
      t."projectId" = p."id"
      AND t."relation" = 'viewers'
  );
