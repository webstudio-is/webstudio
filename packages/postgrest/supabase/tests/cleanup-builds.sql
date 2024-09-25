BEGIN;
SET LOCAL search_path = pgtap, public;
-- Initialize the testing environment without planning any specific number of tests
-- We are using SELECT no_plan() because we don't specify the exact number of tests upfront.
SELECT no_plan();

-- =========================================
-- Setup: Insert initial data for Users, Projects, Domains, ProjectDomains, and Builds
-- =========================================

-- Insert a user into the "User" table
INSERT INTO "public"."User" ("id", "createdAt", "email", "username")
VALUES
  ('user1', '2023-01-01 00:00:00+00', 'user1@517cce32-9af3-example.com', 'user1');

-- Insert projects associated with the user into the "Project" table
INSERT INTO "public"."Project" ("id", "title", "domain", "userId", "isDeleted", "createdAt")
VALUES
  ('project1', 'Project One', '517cce32-9af3-project1-domain1', 'user1', false, '2023-01-01 00:00:00+00'),
  ('project2', 'Project Two', '517cce32-9af3-project2-domain1', 'user1', false, '2023-01-01 00:00:00+00');

-- Insert custom domains into the "Domain" table
INSERT INTO "public"."Domain" ("id", "domain", "createdAt", "status", "updatedAt")
VALUES
  ('project-1-custom-domain-1', '517cce32-9af3-project-1-custom-domain-1.com', '2023-01-01 00:00:00+00', 'INITIALIZING', '2023-01-01 00:00:00+00'),
  ('project-1-custom-domain-2', '517cce32-9af3-project-1-custom-domain-2.com', '2023-01-01 00:00:00+00', 'INITIALIZING', '2023-01-01 00:00:00+00'),
  ('project-2-custom-domain-1', '517cce32-9af3-project-2-custom-domain-1.com', '2023-01-01 00:00:00+00', 'INITIALIZING', '2023-01-01 00:00:00+00'),
  ('project-2-custom-domain-2', '517cce32-9af3-project-2-custom-domain-2.com', '2023-01-01 00:00:00+00', 'INITIALIZING', '2023-01-01 00:00:00+00');

-- Establish relationships between projects and custom domains in the "ProjectDomain" table
INSERT INTO "public"."ProjectDomain" ("projectId", "domainId", "createdAt", "txtRecord", "cname")
VALUES
  ('project1', 'project-1-custom-domain-1', '2023-01-01 00:00:00+00', 'txtRecord1', 'cname1'),
  ('project1', 'project-1-custom-domain-2', '2023-01-01 00:00:00+00', 'txtRecord2', 'cname2'),
  ('project2', 'project-2-custom-domain-1', '2023-01-01 00:00:00+00', 'p2-txtRecord1', 'cname1'),
  ('project2', 'project-2-custom-domain-2', '2023-01-01 00:00:00+00', 'p2-txtRecord2', 'cname2');

-- Insert initial builds into the "Build" table
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
  -- Development Build for Project1
  (
    'build1-development',
    '1990-01-01 00:00:00+00',
    'home',
    'project1',
    NULL,
    '1990-01-01 00:00:00+00',
    'PENDING'
  ),
  -- Development Build for Project2
  (
    'project2-build1-development',
    '1990-01-01 00:00:00+00',
    'home',
    'project2',
    NULL,
    '1990-01-01 00:00:00+00',
    'PENDING'
  ),
  -- Custom Domain Build for Project2
  (
    'project2-build1-for-custom-domain-1',
    '1990-01-02 00:00:00+00',
    'home',
    'project2',
    '{"domains": ["517cce32-9af3-project-2-custom-domain-1.com"]}'::text,
    '1990-01-02 00:00:00+00',
    'PUBLISHED'
  ),
  -- Project Domain Build for Project2
  (
    'project2-build1-for-project-domain-1',
    '1990-01-01 00:00:00+00',
    'home',
    'project2',
    '{"domains": ["517cce32-9af3-project2-domain1"]}'::text,
    '1990-01-01 00:00:00+00',
    'PUBLISHED'
  ),
  -- Custom Domain Build for Project1
  (
    'build1-for-custom-domain-1',
    '1990-01-02 00:00:00+00',
    'home',
    'project1',
    '{"domains": ["517cce32-9af3-project-1-custom-domain-1.com"]}'::text,
    '1990-01-02 00:00:00+00',
    'PUBLISHED'
  ),
  -- Project Domain Build for Project1
  (
    'build1-for-project-domain-1',
    '1990-01-01 00:00:00+00',
    'home',
    'project1',
    '{"domains": ["517cce32-9af3-project1-domain1"]}'::text,
    '1990-01-01 00:00:00+00',
    'PUBLISHED'
  );

-- =========================================
-- Test 1: Verify that initial cleanup does not clean any builds
-- =========================================

-- Run the database cleanup function for builds created in 1990
SELECT database_cleanup('1990-01-01 00:00:00', '1990-12-31 23:59:59');

-- Assert that no builds have been cleaned up initially
SELECT is(
  (SELECT count(*)::integer FROM "Build" WHERE "createdAt" BETWEEN '1990-01-01' AND '1990-12-31' AND "isCleaned" = TRUE),
  0,
  'Test 1: No builds should be cleaned up on initial cleanup'
);

-- =========================================
-- Test 2: Insert a new project domain build and verify cleanup
-- =========================================

-- Insert a new build for the project domain
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
  -- New Project Domain Build for Project1
  (
    'build2-for-project-domain-1',
    '1990-01-02 00:00:00+00',  -- A later date than the previous build
    'home',
    'project1',
    '{"domains": ["517cce32-9af3-project1-domain1"]}'::text,
    '1990-01-02 00:00:00+00',
    'PUBLISHED'
  );

-- Run the database cleanup function again
SELECT database_cleanup('1990-01-01 00:00:00', '1990-12-31 23:59:59');

-- Assert that one build has been cleaned (the previous project domain build)
SELECT is(
  (SELECT count(*)::integer FROM "Build" WHERE "createdAt" BETWEEN '1990-01-01' AND '1990-12-31' AND "isCleaned" = TRUE),
  1,
  'Test 2: Previous project domain build should be cleaned up after new build is published'
);

-- Assert that the specific build cleaned is 'build1-for-project-domain-1'
SELECT is(
  (SELECT id FROM "Build" WHERE "createdAt" BETWEEN '1990-01-01' AND '1990-12-31' AND "isCleaned" = TRUE),
  'build1-for-project-domain-1',
  'Test 2: Build "build1-for-project-domain-1" should be marked as cleaned'
);

-- =========================================
-- Test 3: Insert a new custom domain build and verify cleanup
-- =========================================

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
  -- New Custom Domain Build for Project1
  (
    'build2-for-custom-domain-1',
    '1990-01-03 00:00:00+00',  -- A later date than the previous build
    'home',
    'project1',
    '{"domains": ["517cce32-9af3-project-1-custom-domain-1.com"]}'::text,
    '1990-01-03 00:00:00+00',
    'PUBLISHED'
  );

-- Run the database cleanup function again
SELECT database_cleanup('1990-01-01 00:00:00', '1990-12-31 23:59:59');

-- Assert that two builds have been cleaned (the previous project domain and custom domain builds)
SELECT is(
  (SELECT count(*)::integer FROM "Build" WHERE "createdAt" BETWEEN '1990-01-01' AND '1990-12-31' AND "isCleaned" = TRUE),
  2,
  'Test 3: Previous custom domain build should be cleaned up after new build is published'
);

-- Assert that the builds cleaned are 'build1-for-custom-domain-1' and 'build1-for-project-domain-1'
SELECT results_eq(
  $$
      SELECT id FROM "Build" WHERE "createdAt" BETWEEN '1990-01-01' AND '1990-12-31' AND "isCleaned" = TRUE ORDER BY id
  $$,
  $$
    SELECT * FROM (
        VALUES
            ('build1-for-custom-domain-1'),
            ('build1-for-project-domain-1')
    ) AS expected(id)
    ORDER BY "id"
  $$,
  'Test 3: Builds "build1-for-custom-domain-1" and "build1-for-project-domain-1" should be marked as cleaned'
);

-- =========================================
-- Finish the test
-- =========================================

-- Finish the test by calling the finish() function, which outputs the test summary
SELECT finish();

-- Rollback the transaction to ensure no changes are persisted in the database
ROLLBACK;
