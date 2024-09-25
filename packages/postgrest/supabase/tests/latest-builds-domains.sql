BEGIN;
SET LOCAL search_path = pgtap, public;

-- SET LOCAL search_path = pgtap,public;

-- Initialize the testing environment without planning any specific number of tests
SELECT no_plan();

-- Insert a new user into the User table
INSERT INTO "public"."User" ("id", "createdAt", "email", "username")
VALUES
  ('user1', '2023-01-01 00:00:00+00', 'user1@517cce32-9af3-example.com', 'user1');

-- Insert projects associated with the user
INSERT INTO "public"."Project" ("id", "title", "domain", "userId", "isDeleted", "createdAt")
VALUES
  ('project1', 'Project One', '517cce32-9af3-project1-domain1', 'user1', false, '2023-01-01 00:00:00+00'),
  ('project2', 'Project Two', '517cce32-9af3-project2-domain1', 'user1', false, '2023-01-01 00:00:00+00');

-- Insert custom domains into the Domain table
INSERT INTO "public"."Domain" ("id", "domain", "createdAt", "status", "updatedAt")
VALUES
  ('project-1-custom-domain-1', '517cce32-9af3-project-1-custom-domain-1.com', '2023-01-01 00:00:00+00', 'INITIALIZING', '2023-01-01 00:00:00+00'),
  ('project-1-custom-domain-2', '517cce32-9af3-project-1-custom-domain-2.com', '2023-01-01 00:00:00+00', 'INITIALIZING', '2023-01-01 00:00:00+00');

-- Establish relationships between projects and custom domains
INSERT INTO "public"."ProjectDomain" ("projectId", "domainId", "createdAt", "txtRecord", "cname")
VALUES
  ('project1', 'project-1-custom-domain-1', '2023-01-01 00:00:00+00', 'txtRecord1', 'cname1'),
  ('project1', 'project-1-custom-domain-2', '2023-01-01 00:00:00+00', 'txtRecord2', 'cname2');

-- Create a view to encapsulate the repetitive SELECT query for testing
CREATE OR REPLACE VIEW "public"."TestProjectDomains" AS
SELECT
    pd."projectId",
    pd."domainId",
    lbv."buildId"
FROM "public"."ProjectDomain" pd
LEFT JOIN LATERAL (
    SELECT * FROM "latestBuildVirtual"(ROW('', pd."domainId", pd."projectId", '', 'INITIALIZING'::"DomainStatus", NULL, 'txt','expectedTxt','cname',TRUE, NOW(),NOW())::"domainsVirtual")
) lbv ON TRUE
ORDER BY pd."domainId";

--------------------------------------------------------------------------------
-- Test Case 1: Initial State Without Builds
--------------------------------------------------------------------------------
SELECT results_eq(
    'SELECT * FROM "public"."TestProjectDomains" WHERE "projectId" = ''project1''',
    $$
    SELECT * FROM (
        VALUES
            ('project1', 'project-1-custom-domain-1', NULL),
            ('project1', 'project-1-custom-domain-2', NULL)
    ) AS expected(projectId, domainId, buildId)
    ORDER BY domainId
    $$,
    'Initial state without builds'
);

--------------------------------------------------------------------------------
-- Test Case 2: After Inserting Build1 Associated with Custom Domain 1
--------------------------------------------------------------------------------
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
    '{"domains": ["some-other-domain.com", "517cce32-9af3-project-1-custom-domain-1.com"]}'::text,
    '2023-01-02 00:00:00+00',
    'PUBLISHED'
);

SELECT results_eq(
    'SELECT * FROM "public"."TestProjectDomains" WHERE "projectId" = ''project1''',
    $$
    SELECT * FROM (
        VALUES
            ('project1', 'project-1-custom-domain-1', 'build1-for-custom-domain-1'),
            ('project1', 'project-1-custom-domain-2', NULL)
    ) AS expected(projectId, domainId, buildId)
    ORDER BY domainId
    $$,
    'After inserting build1 associated with custom domain 1'
);

--------------------------------------------------------------------------------
-- Test Case 3: After Inserting Build2 Associated with Custom Domain 1
--------------------------------------------------------------------------------
-- Insert a new build associated with the same custom domain
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
    'build2-for-custom-domain-1',
    '2024-01-02 00:00:00+00',
    'home',
    'project1',
    '{"domains": ["some-other-domain.com", "517cce32-9af3-project-1-custom-domain-1.com"]}'::text,
    '2024-01-02 00:00:00+00',
    'PUBLISHED'
);

SELECT results_eq(
    'SELECT * FROM "public"."TestProjectDomains" WHERE "projectId" = ''project1''',
    $$
    SELECT * FROM (
        VALUES
            ('project1', 'project-1-custom-domain-1', 'build2-for-custom-domain-1'),
            ('project1', 'project-1-custom-domain-2', NULL)
    ) AS expected(projectId, domainId, buildId)
    ORDER BY domainId
    $$,
    'After inserting build2 associated with custom domain 1'
);

--------------------------------------------------------------------------------
-- Test Case 4: After Inserting Build3 Associated with Custom Domain 2
--------------------------------------------------------------------------------
-- Insert a new build associated with another custom domain
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
    'build3-for-custom-domain-2',
    '2024-01-03 00:00:00+00',
    'home',
    'project1',
    '{"domains": ["some-other-domain.com", "517cce32-9af3-project-1-custom-domain-2.com"]}'::text,
    '2024-01-03 00:00:00+00',
    'PUBLISHED'
);

SELECT results_eq(
    'SELECT * FROM "public"."TestProjectDomains" WHERE "projectId" = ''project1''',
    $$
    SELECT * FROM (
        VALUES
            ('project1', 'project-1-custom-domain-1', 'build2-for-custom-domain-1'),
            ('project1', 'project-1-custom-domain-2', 'build3-for-custom-domain-2')
    ) AS expected(projectId, domainId, buildId)
    ORDER BY domainId
    $$,
    'After inserting build3 associated with custom domain 2'
);

--------------------------------------------------------------------------------
-- Test Case 5: After Inserting Build4 Associated with Both Domains
--------------------------------------------------------------------------------
-- Insert a new build associated with both custom domains
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
    'build4-for-both-domains',
    '2024-01-04 00:00:00+00',
    'home',
    'project1',
    '{"domains": ["some-other-domain.com", "517cce32-9af3-project-1-custom-domain-2.com", "517cce32-9af3-project-1-custom-domain-1.com"]}'::text,
    '2024-01-04 00:00:00+00',
    'PUBLISHED'
);

SELECT results_eq(
    'SELECT * FROM "public"."TestProjectDomains" WHERE "projectId" = ''project1''',
    $$
    SELECT * FROM (
        VALUES
            ('project1', 'project-1-custom-domain-1', 'build4-for-both-domains'),
            ('project1', 'project-1-custom-domain-2', 'build4-for-both-domains')
    ) AS expected(projectId, domainId, buildId)
    ORDER BY domainId
    $$,
    'After inserting build4 associated with both domains'
);

--------------------------------------------------------------------------------
-- Test Case 6: Insert Builds and Relationships for Project2
--------------------------------------------------------------------------------
-- Establish relationships between project2 and the same custom domains
INSERT INTO "public"."ProjectDomain" ("projectId", "domainId", "createdAt", "txtRecord", "cname")
VALUES
  ('project2', 'project-1-custom-domain-1', '2023-01-01 00:00:00+00', 'txtRecord21', 'cname21'),
  ('project2', 'project-1-custom-domain-2', '2023-01-01 00:00:00+00', 'txtRecord22', 'cname22');

-- Insert a new build for project2 associated with both domains
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
    'build5-project2-for-both-domains',
    '2025-01-04 00:00:00+00',
    'home',
    'project2',
    '{"domains": ["some-other-domain.com", "517cce32-9af3-project-1-custom-domain-2.com", "517cce32-9af3-project-1-custom-domain-1.com"]}'::text,
    '2025-01-04 00:00:00+00',
    'PUBLISHED'
);

--------------------------------------------------------------------------------
-- Test Case 7: Verify Results for Project1 Remain Unchanged After Project2 Updates
--------------------------------------------------------------------------------
SELECT results_eq(
    'SELECT * FROM "public"."TestProjectDomains" WHERE "projectId" = ''project1''',
    $$
    SELECT * FROM (
        VALUES
            ('project1', 'project-1-custom-domain-1', 'build4-for-both-domains'),
            ('project1', 'project-1-custom-domain-2', 'build4-for-both-domains')
    ) AS expected(projectId, domainId, buildId)
    ORDER BY domainId
    $$,
    'Verify Project1 results remain unchanged after Project2 updates'
);

--------------------------------------------------------------------------------
-- Test Case 8: Verify Results for Project2 Reflect Latest Build
--------------------------------------------------------------------------------
SELECT results_eq(
    $$SELECT * FROM "public"."TestProjectDomains" WHERE "projectId" = 'project2'$$,
    $$
    SELECT * FROM (
        VALUES
            ('project2', 'project-1-custom-domain-1', 'build5-project2-for-both-domains'),
            ('project2', 'project-1-custom-domain-2', 'build5-project2-for-both-domains')
    ) AS expected(projectId, domainId, buildId)
    ORDER BY domainId
    $$,
    'Verify Project2 results reflect the latest build'
);

-- Finalize the tests
SELECT finish();

ROLLBACK;