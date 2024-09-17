BEGIN;

-- SELECT plan(8);
SELECT no_plan();

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
INSERT INTO "public"."Build" ("id", "createdAt", "pages", "projectId", "deployment", "updatedAt", "publishStatus")
VALUES
  -- Old deployment format: includes projectDomain
  ('build1', '2023-01-01 00:00:00+00', 'home', 'project1', '{"projectDomain": "project1-domain1", "domains": [""]}'::text, '2023-01-01 00:00:00+00', 'PUBLISHED'),
  ('build1-old', '2022-01-01 00:00:00+00', 'home', 'project1', '{"projectDomain": "project1-domain1", "domains": [""]}'::text, '2022-01-01 00:00:00+00', 'PUBLISHED'),
  ('build1-newest-wrong-domain', '2024-01-01 00:00:00+00', 'home', 'project1', '{"projectDomain": "project-wrong", "domains": [""]}'::text, '2024-01-01 00:00:00+00', 'PUBLISHED'),
  -- New deployment format: domains array only
  ('build2', '2023-01-02 00:00:00+00', 'home', 'project2', '{"domains": ["project2-domain1"]}'::text, '2023-01-02 00:00:00+00', 'PENDING'),
  ('build2-old', '2022-01-02 00:00:00+00', 'home', 'project2', '{"domains": ["project2-domain1"]}'::text, '2022-01-02 00:00:00+00', 'PENDING');

--------------------------------------------------------------------------------
-- Test Case 1: Verify latest build retrieval using old deployment format (projectDomain)
--------------------------------------------------------------------------------
SELECT is (
    (SELECT "buildId" FROM "public"."latestBuildVirtual"(
        (SELECT (p.*)::"Project" FROM "public"."Project" p WHERE p."id" = 'project1')
    )),
    'build1',
    'Test Case 1: Should return the latest build for project with domain matching projectDomain.'
);

--------------------------------------------------------------------------------
-- Test Case 2: Verify latest build retrieval using new deployment format (domains array)
--------------------------------------------------------------------------------
SELECT is (
    (SELECT "buildId" FROM "public"."latestBuildVirtual"(
        (SELECT (p.*)::"Project" FROM "public"."Project" p WHERE p."id" = 'project2')
    )),
    'build2',
    'Test Case 2: Should return the latest build for project with domain present in domains array.'
);

--------------------------------------------------------------------------------
-- Test Case 3: Update project domain and verify no build exists for the new domain
--------------------------------------------------------------------------------
UPDATE "public"."Project" SET "domain" = 'project1-domain2' WHERE "id" = 'project1';

SELECT is (
    (SELECT COUNT(*)::integer FROM "public"."latestBuildVirtual"(
        (SELECT (p.*)::"Project" FROM "public"."Project" p WHERE p."id" = 'project1')
    )),
    0,
    'Test Case 3: Should return 0 as no build exists for the updated domain.'
);

--------------------------------------------------------------------------------
-- Test Case 4: Insert a new build with the updated domain and verify retrieval
--------------------------------------------------------------------------------
INSERT INTO "public"."Build" ("id", "createdAt", "pages", "projectId", "deployment", "updatedAt", "publishStatus")
VALUES
  ('build1-for-domain2', '2023-01-01 00:00:00+00', 'home', 'project1',
   '{"domains": ["some-other-domain.com", "project1-domain2"]}'::text,
   '2023-01-01 00:00:00+00', 'PUBLISHED');

SELECT is (
    (SELECT "buildId" FROM "public"."latestBuildVirtual"(
        (SELECT (p.*)::"Project" FROM "public"."Project" p WHERE p."id" = 'project1')
    )),
    'build1-for-domain2',
    'Test Case 4: Should return the latest build for project with the updated domain in domains array.'
);

--------------------------------------------------------------------------------
-- Test Case 5: Register custom domains and verify the latest build for a custom domain
--------------------------------------------------------------------------------
-- Insert custom domains
INSERT INTO "public"."Domain" ("id", "domain", "createdAt", "status", "updatedAt")
VALUES
  ('project-1-custom-domain-1', 'project-1-custom-domain-1.com', '2023-01-01 00:00:00+00', 'INITIALIZING', '2023-01-01 00:00:00+00'),
  ('project-1-custom-domain-2', 'project-1-custom-domain-2.com', '2023-01-01 00:00:00+00', 'INITIALIZING', '2023-01-01 00:00:00+00');

-- Establish relationships between project and custom domains
INSERT INTO "public"."ProjectDomain" ("projectId", "domainId", "createdAt", "txtRecord", "cname")
VALUES
  ('project1', 'project-1-custom-domain-1', '2023-01-01 00:00:00+00', 'txtRecord1', 'cname1'),
  ('project1', 'project-1-custom-domain-2', '2023-01-01 00:00:00+00', 'txtRecord2', 'cname2');

-- Insert a build associated with a custom domain
INSERT INTO "public"."Build" ("id", "createdAt", "pages", "projectId", "deployment", "updatedAt", "publishStatus")
VALUES
  ('build1-for-custom-domain-1', '2023-01-02 00:00:00+00', 'home', 'project1',
   '{"domains": ["some-other-domain.com", "project-1-custom-domain-1.com"]}'::text,
   '2023-01-02 00:00:00+00', 'PUBLISHED');

SELECT is (
    (SELECT "buildId" FROM "public"."latestBuildVirtual"(
        (SELECT (p.*)::"Project" FROM "public"."Project" p WHERE p."id" = 'project1')
    )),
    'build1-for-custom-domain-1',
    'Test Case 5: Should return the latest build for project with a registered custom domain in domains array.'
);

--------------------------------------------------------------------------------
-- Test Case 6: Publish a preview domain and verify the latest build retrieval
--------------------------------------------------------------------------------
-- Insert a build for the preview domain using the new deployment format
INSERT INTO "public"."Build" ("id", "createdAt", "pages", "projectId", "deployment", "updatedAt", "publishStatus")
VALUES
  ('build1-for-domain2-new', '2023-01-03 00:00:00+00', 'home', 'project1',
   '{"domains": ["project1-domain2"]}'::text,
   '2023-01-03 00:00:00+00', 'PUBLISHED');

SELECT is (
    (SELECT "buildId" FROM "public"."latestBuildVirtual"(
        (SELECT (p.*)::"Project" FROM "public"."Project" p WHERE p."id" = 'project1')
    )),
    'build1-for-domain2-new',
    'Test Case 6: Should return the latest build for project with preview domain in domains array.'
);

--------------------------------------------------------------------------------
-- Test Case 7: Publish a new build for a custom domain, delete the custom domain, and verify latest build update
--------------------------------------------------------------------------------
-- Insert a new build for the custom domain
INSERT INTO "public"."Build" ("id", "createdAt", "pages", "projectId", "deployment", "updatedAt", "publishStatus")
VALUES
  ('build1-for-custom-domain-1-new', '2023-01-04 00:00:00+00', 'home', 'project1',
   '{"domains": ["some-other-domain.com", "project-1-custom-domain-1.com"]}'::text,
   '2023-01-04 00:00:00+00', 'PUBLISHED');

SELECT is (
    (SELECT "buildId" FROM "public"."latestBuildVirtual"(
        (SELECT (p.*)::"Project" FROM "public"."Project" p WHERE p."id" = 'project1')
    )),
    'build1-for-custom-domain-1-new',
    'Test Case 7a: Should return the latest build after publishing a new build for a custom domain.'
);

-- Delete the custom domain association
DELETE FROM "public"."ProjectDomain" WHERE "projectId" = 'project1' AND "domainId" = 'project-1-custom-domain-1';

SELECT is (
    (SELECT "buildId" FROM "public"."latestBuildVirtual"(
        (SELECT (p.*)::"Project" FROM "public"."Project" p WHERE p."id" = 'project1')
    )),
    'build1-for-domain2-new',
    'Test Case 7b: Should return the latest build after deleting the custom domain, reverting to the previous latest build.'
);

--------------------------------------------------------------------------------
-- Test Case 8: Publish a new build for a custom domain, move the custom domain, and verify latest build update
--------------------------------------------------------------------------------
-- Revert 7
INSERT INTO "public"."ProjectDomain" ("projectId", "domainId", "createdAt", "txtRecord", "cname")
VALUES
  ('project1', 'project-1-custom-domain-1', '2023-01-01 00:00:00+00', 'txtRecord1', 'cname1');


SELECT is (
    (SELECT "buildId" FROM "public"."latestBuildVirtual"(
        (SELECT (p.*)::"Project" FROM "public"."Project" p WHERE p."id" = 'project1')
    )),
    'build1-for-custom-domain-1-new',
    'Test Case 8a: Should return the latest build after publishing a new build for a custom domain.'
);


UPDATE "public"."ProjectDomain" SET "projectId" = 'project2' WHERE "projectId" = 'project1' AND "domainId" = 'project-1-custom-domain-1';


SELECT is (
    (SELECT "buildId" FROM "public"."latestBuildVirtual"(
        (SELECT (p.*)::"Project" FROM "public"."Project" p WHERE p."id" = 'project1')
    )),
    'build1-for-domain2-new',
    'Test Case 8b: Should return the latest build after moving the custom domain, reverting to the previous latest build.'
);




SELECT finish();

ROLLBACK;