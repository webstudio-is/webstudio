BEGIN;
SET LOCAL search_path = pgtap, public;
-- Initialize the testing environment without planning any specific number of tests
-- We are using SELECT no_plan() because we don't specify the exact number of tests upfront.
SELECT no_plan();

-- Insert a new user into the User table for the project ownership
-- We're inserting user_1 as the user for the test projects
INSERT INTO "public"."User" ("id", "createdAt", "email", "username")
VALUES
  ('user_1', '2023-01-01 00:00:00+00', 'user1@517cce32-9af3-example.com', 'user1');

-- Insert test projects into the Project table
-- project_1 and project_2 belong to user_1 and are not deleted (isDeleted = false)
INSERT INTO "Project" (id, title, domain, "userId", "isDeleted") VALUES
('project_1', 'Test Project 1', '517cce32-9af3-testproject1.com', 'user_1', false),
('project_2', 'Test Project 1', '517cce32-9af3-testproject2.com', 'user_1', false);

-- Insert test domains into the Domain table
-- We are inserting two domains: 517cce32-9af3-example.com and 517cce32-9af3-example.org with different statuses
INSERT INTO "Domain" (id, domain, status, "txtRecord") VALUES
('domain_1', '517cce32-9af3-example.com', 'INITIALIZING', 'txtRecord1'),
('domain_2', '517cce32-9af3-example.org', 'ACTIVE', 'txtRecord21');

-- Insert test data into the ProjectDomain table
-- Mapping domains to projects, project_1 has two domains, project_2 has one domain
-- Note the different TXT records in ProjectDomain
INSERT INTO "ProjectDomain" ("projectId", "domainId", "txtRecord", "cname") VALUES
('project_1', 'domain_1', 'txtRecord1', 'cname1'),
('project_1', 'domain_2', 'txtRecord22', 'cname2'),
('project_2', 'domain_1', 'txtRecord3', 'cname3');

-- Test case 1: Verify that domainsVirtual returns correct values for project_1
-- Compare the result of the domainsVirtual function with an expected result set.
-- Project_1 is expected to return two domains with statuses, TXT records, and verification status
SELECT results_eq(
  $$
      SELECT domain, status, error, "domainTxtRecord", "expectedTxtRecord", verified
      FROM "domainsVirtual"(
        (SELECT (p.*)::"Project" FROM "Project" p WHERE p.id = 'project_1' ORDER BY p.id)
      )
  $$,
  $$
    SELECT * FROM (
        VALUES
            ('517cce32-9af3-example.com','INITIALIZING'::"DomainStatus",NULL,E'txtRecord1',E'txtRecord1',TRUE), -- Verified domain (TXT records match)
            ('517cce32-9af3-example.org','ACTIVE'::"DomainStatus",NULL,E'txtRecord21',E'txtRecord22',FALSE) -- Not verified domain (TXT records do not match)
    ) AS expected(domain, status, error, "domainTxtRecord", "expectedTxtRecord", verified)
    ORDER BY "domain"
  $$,
  'Test case 1: domainsVirtual should return correct results for project_1'
);

-- Test case 2: Verify that domainsVirtual returns correct values for project_2
-- Project_2 is expected to return one domain with its corresponding status, TXT records, and verification status
SELECT results_eq(
  $$
      SELECT domain, status, error, "domainTxtRecord", "expectedTxtRecord", verified
      FROM "domainsVirtual"(
        (SELECT (p.*)::"Project" FROM "Project" p WHERE p.id = 'project_2' ORDER BY p.id)
      )
  $$,
  $$
    SELECT * FROM (
        VALUES
            ('517cce32-9af3-example.com','INITIALIZING'::"DomainStatus",NULL,E'txtRecord1',E'txtRecord3',FALSE) -- Not verified domain (TXT records do not match)
    ) AS expected(domain, status, error, "domainTxtRecord", "expectedTxtRecord", verified)
    ORDER BY "domain"
  $$,
  'Test case 2: domainsVirtual should return correct results for project_2'
);

-- Finish the test by calling the finish() function, which outputs the test summary
SELECT finish();

-- Rollback the transaction to ensure no changes are persisted in the database
ROLLBACK;