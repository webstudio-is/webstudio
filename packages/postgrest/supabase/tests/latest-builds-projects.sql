BEGIN;
SET LOCAL search_path = pgtap, public;

-- Initialize the testing environment without planning any specific number of tests
SELECT no_plan();

--------------------------------------------------------------------------------
-- Setup: Insert Initial Data
--------------------------------------------------------------------------------

-- Insert a new user into the User table
INSERT INTO "public"."User" ("id", "createdAt", "email", "username")
VALUES
  ('user1', '2023-01-01 00:00:00+00', 'user1@example.com', 'user1');

-- Insert projects associated with the user
INSERT INTO "public"."Project" ("id", "title", "domain", "userId", "isDeleted", "createdAt")
VALUES
  ('project1', 'Project One', 'project1-domain1', 'user1', false, '2023-01-01 00:00:00+00'),
  ('project2', 'Project Two', 'project2-domain1', 'user1', false, '2023-01-01 00:00:00+00');

-- Insert builds with different deployment formats
INSERT INTO "public"."Build" (
    "id",
    "createdAt",
    "pages",
    "projectId",
    "deployment",
    "updatedAt",
    "publishStatus"
)
VALUES
  -- Old deployment format: includes projectDomain
  (
    'build1',
    '2023-01-01 00:00:00+00',
    'home',
    'project1',
    '{"projectDomain": "project1-domain1", "domains": [""]}'::text,
    '2023-01-01 00:00:00+00',
    'PUBLISHED'
  ),
  (
    'build1-old',
    '2022-01-01 00:00:00+00',
    'home',
    'project1',
    '{"projectDomain": "project1-domain1", "domains": [""]}'::text,
    '2022-01-01 00:00:00+00',
    'PUBLISHED'
  ),
  (
    'build1-newest-wrong-domain',
    '2024-01-01 00:00:00+00',
    'home',
    'project1',
    '{"projectDomain": "project-wrong", "domains": [""]}'::text,
    '2024-01-01 00:00:00+00',
    'PUBLISHED'
  ),
  -- New deployment format: domains array only
  (
    'build2',
    '2023-01-02 00:00:00+00',
    'home',
    'project2',
    '{"domains": ["project2-domain1"]}'::text,
    '2023-01-02 00:00:00+00',
    'PENDING'
  ),
  (
    'build2-old',
    '2022-01-02 00:00:00+00',
    'home',
    'project2',
    '{"domains": ["project2-domain1"]}'::text,
    '2022-01-02 00:00:00+00',
    'PENDING'
  );

--------------------------------------------------------------------------------
-- Test Case 1: Verify Latest Build Retrieval Using Old Deployment Format (projectDomain)
--------------------------------------------------------------------------------
SELECT is (
    (
        SELECT "buildId"
        FROM "public"."latestBuildVirtual"(
            (
                SELECT (p.*)::"Project"
                FROM "public"."Project" p
                WHERE p."id" = 'project1'
            )
        )
    ),
    'build1',
    'Test Case 1: Should return the latest build for project1 with domain matching projectDomain.'
);

--------------------------------------------------------------------------------
-- Test Case 2: Verify Latest Build Retrieval Using New Deployment Format (domains array)
--------------------------------------------------------------------------------
SELECT is (
    (
        SELECT "buildId"
        FROM "public"."latestBuildVirtual"(
            (
                SELECT (p.*)::"Project"
                FROM "public"."Project" p
                WHERE p."id" = 'project2'
            )
        )
    ),
    'build2',
    'Test Case 2: Should return the latest build for project2 with domain present in domains array.'
);

--------------------------------------------------------------------------------
-- Test Case 3: Update Project Domain and Verify No Build Exists for the New Domain
--------------------------------------------------------------------------------
-- Update project1's domain to a new domain
UPDATE "public"."Project"
SET "domain" = 'project1-domain2'
WHERE "id" = 'project1';

-- Verify that no build exists for the updated domain
SELECT is (
    (
        SELECT COUNT(*)::integer
        FROM "public"."latestBuildVirtual"(
            (
                SELECT (p.*)::"Project"
                FROM "public"."Project" p
                WHERE p."id" = 'project1'
            )
        )
    ),
    0,
    'Test Case 3: Should return 0 as no build exists for the updated domain project1-domain2.'
);

--------------------------------------------------------------------------------
-- Test Case 4: Insert a New Build with the Updated Domain and Verify Retrieval
--------------------------------------------------------------------------------
-- Insert a new build associated with the updated domain
INSERT INTO "public"."Build" (
    "id",
    "createdAt",
    "pages",
    "projectId",
    "deployment",
    "updatedAt",
    "publishStatus"
)
VALUES
  (
    'build1-for-domain2',
    '2023-01-01 00:00:00+00',
    'home',
    'project1',
    '{"domains": ["some-other-domain.com", "project1-domain2"]}'::text,
    '2023-01-01 00:00:00+00',
    'PUBLISHED'
  );

-- Verify that the latest build now reflects the updated domain
SELECT is (
    (
        SELECT "buildId"
        FROM "public"."latestBuildVirtual"(
            (
                SELECT (p.*)::"Project"
                FROM "public"."Project" p
                WHERE p."id" = 'project1'
            )
        )
    ),
    'build1-for-domain2',
    'Test Case 4: Should return the latest build for project1 with the updated domain in domains array.'
);

--------------------------------------------------------------------------------
-- Test Case 5: Register Custom Domains and Verify Latest Build for a Custom Domain
--------------------------------------------------------------------------------
-- Insert custom domains
INSERT INTO "public"."Domain" (
    "id",
    "domain",
    "createdAt",
    "status",
    "updatedAt"
)
VALUES
  ('project-1-custom-domain-1', 'project-1-custom-domain-1.com', '2023-01-01 00:00:00+00', 'INITIALIZING', '2023-01-01 00:00:00+00'),
  ('project-1-custom-domain-2', 'project-1-custom-domain-2.com', '2023-01-01 00:00:00+00', 'INITIALIZING', '2023-01-01 00:00:00+00');

-- Establish relationships between project1 and custom domains
INSERT INTO "public"."ProjectDomain" (
    "projectId",
    "domainId",
    "createdAt",
    "txtRecord",
    "cname"
)
VALUES
  ('project1', 'project-1-custom-domain-1', '2023-01-01 00:00:00+00', 'txtRecord1', 'cname1'),
  ('project1', 'project-1-custom-domain-2', '2023-01-01 00:00:00+00', 'txtRecord2', 'cname2');

-- Insert a build associated with a custom domain
INSERT INTO "public"."Build" (
    "id",
    "createdAt",
    "pages",
    "projectId",
    "deployment",
    "updatedAt",
    "publishStatus"
)
VALUES
  (
    'build1-for-custom-domain-1',
    '2023-01-02 00:00:00+00',
    'home',
    'project1',
    '{"domains": ["some-other-domain.com", "project-1-custom-domain-1.com"]}'::text,
    '2023-01-02 00:00:00+00',
    'PUBLISHED'
  );

-- Verify that the latest build reflects the custom domain association
SELECT is (
    (
        SELECT "buildId"
        FROM "public"."latestBuildVirtual"(
            (
                SELECT (p.*)::"Project"
                FROM "public"."Project" p
                WHERE p."id" = 'project1'
            )
        )
    ),
    'build1-for-custom-domain-1',
    'Test Case 5: Should return the latest build for project1 with a registered custom domain in domains array.'
);

--------------------------------------------------------------------------------
-- Test Case 6: Publish a Preview Domain and Verify Latest Build Retrieval
--------------------------------------------------------------------------------
-- Insert a build for the preview domain using the new deployment format
INSERT INTO "public"."Build" (
    "id",
    "createdAt",
    "pages",
    "projectId",
    "deployment",
    "updatedAt",
    "publishStatus"
)
VALUES
  (
    'build1-for-domain2-new',
    '2023-01-03 00:00:00+00',
    'home',
    'project1',
    '{"domains": ["project1-domain2"]}'::text,
    '2023-01-03 00:00:00+00',
    'PUBLISHED'
  );

-- Verify that the latest build reflects the preview domain
SELECT is (
    (
        SELECT "buildId"
        FROM "public"."latestBuildVirtual"(
            (
                SELECT (p.*)::"Project"
                FROM "public"."Project" p
                WHERE p."id" = 'project1'
            )
        )
    ),
    'build1-for-domain2-new',
    'Test Case 6: Should return the latest build for project1 with the preview domain in domains array.'
);

--------------------------------------------------------------------------------
-- Test Case 7: Publish a New Build for a Custom Domain, Delete the Custom Domain, and Verify Latest Build Update
--------------------------------------------------------------------------------
-- Insert a new build for the custom domain
INSERT INTO "public"."Build" (
    "id",
    "createdAt",
    "pages",
    "projectId",
    "deployment",
    "updatedAt",
    "publishStatus"
)
VALUES
  (
    'build1-for-custom-domain-1-new',
    '2023-01-04 00:00:00+00',
    'home',
    'project1',
    '{"domains": ["some-other-domain.com", "project-1-custom-domain-1.com"]}'::text,
    '2023-01-04 00:00:00+00',
    'PUBLISHED'
  );

-- Verify that the latest build reflects the newly published build for the custom domain
SELECT is (
    (
        SELECT "buildId"
        FROM "public"."latestBuildVirtual"(
            (
                SELECT (p.*)::"Project"
                FROM "public"."Project" p
                WHERE p."id" = 'project1'
            )
        )
    ),
    'build1-for-custom-domain-1-new',
    'Test Case 7a: Should return the latest build after publishing a new build for a custom domain.'
);

-- Delete the custom domain association
DELETE FROM "public"."ProjectDomain"
WHERE "projectId" = 'project1' AND "domainId" = 'project-1-custom-domain-1';

-- Verify that the latest build reverts to the previous latest build after deletion
SELECT is (
    (
        SELECT "buildId"
        FROM "public"."latestBuildVirtual"(
            (
                SELECT (p.*)::"Project"
                FROM "public"."Project" p
                WHERE p."id" = 'project1'
            )
        )
    ),
    'build1-for-domain2-new',
    'Test Case 7b: Should return the latest build after deleting the custom domain, reverting to the previous latest build.'
);

--------------------------------------------------------------------------------
-- Test Case 8: Publish a New Build for a Custom Domain, Move the Custom Domain, and Verify Latest Build Update
--------------------------------------------------------------------------------
-- Re-establish the custom domain association to revert Test Case 7
INSERT INTO "public"."ProjectDomain" (
    "projectId",
    "domainId",
    "createdAt",
    "txtRecord",
    "cname"
)
VALUES
  ('project1', 'project-1-custom-domain-1', '2023-01-01 00:00:00+00', 'txtRecord1', 'cname1');

-- Verify that the latest build is updated after re-establishing the custom domain
SELECT is (
    (
        SELECT "buildId"
        FROM "public"."latestBuildVirtual"(
            (
                SELECT (p.*)::"Project"
                FROM "public"."Project" p
                WHERE p."id" = 'project1'
            )
        )
    ),
    'build1-for-custom-domain-1-new',
    'Test Case 8a: Should return the latest build after re-publishing a new build for a custom domain.'
);

-- Move the custom domain association from project1 to project2
UPDATE "public"."ProjectDomain"
SET "projectId" = 'project2'
WHERE "projectId" = 'project1' AND "domainId" = 'project-1-custom-domain-1';

-- Verify that the latest build reverts to the previous latest build after moving the custom domain
SELECT is (
    (
        SELECT "buildId"
        FROM "public"."latestBuildVirtual"(
            (
                SELECT (p.*)::"Project"
                FROM "public"."Project" p
                WHERE p."id" = 'project1'
            )
        )
    ),
    'build1-for-domain2-new',
    'Test Case 8b: Should return the latest build after moving the custom domain, reverting to the previous latest build.'
);

-- Finalize the tests
SELECT finish();

ROLLBACK;