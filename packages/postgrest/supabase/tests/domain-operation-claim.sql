BEGIN;
SET LOCAL search_path = pgtap, public;
SELECT no_plan();

INSERT INTO "User" (id, email, username)
VALUES ('claim-test-user', 'claim-test@example.com', 'claim-test-user');

INSERT INTO "Project" (id, title, domain, "userId")
VALUES
  ('claim-test-project', 'Claim test', 'claim-test-project.example.com', 'claim-test-user'),
  ('claim-test-project-2', 'Claim test 2', 'claim-test-project-2.example.com', 'claim-test-user');

INSERT INTO "Domain" (id, domain, status, "txtRecord")
VALUES ('claim-test-domain', 'claim-test.example.com', 'ACTIVE', 'claim-test-txt');

INSERT INTO "ProjectDomain" ("projectId", "domainId", "txtRecord", cname)
VALUES ('claim-test-project', 'claim-test-domain', 'claim-test-txt', 'claim-test-cname');

SELECT is(
  claim_domain_operation('claim-test-domain', 'claim-test-project', NULL),
  -1,
  'a null token cannot claim a domain'
);

SELECT is(
  claim_domain_operation('claim-test-domain', 'claim-test-project', ''),
  -1,
  'an empty token cannot claim a domain'
);

SELECT is(
  finish_domain_operation('claim-test-domain', 'claim-test-project', NULL, TRUE),
  FALSE,
  'a null token cannot finish an unclaimed removal'
);

SELECT is(
  (SELECT count(*)::integer FROM "ProjectDomain" WHERE "domainId" = 'claim-test-domain'),
  1,
  'the project link survives an invalid finish call'
);

SELECT is(
  claim_domain_operation('claim-test-domain', 'claim-test-project', 'claim-test-token'),
  1,
  'a nonempty token claims the domain'
);

SELECT is(
  claim_domain_operation('claim-test-domain', 'claim-test-project', 'competing-token'),
  -1,
  'a second claim cannot take an active domain'
);

SELECT throws_ok(
  $$INSERT INTO "ProjectDomain" ("projectId", "domainId", "txtRecord", cname)
    VALUES ('claim-test-project-2', 'claim-test-domain', 'claim-test-txt-2', 'claim-test-cname-2')$$,
  '40001',
  'Domain operation failed',
  'another project cannot link the domain during an active claim'
);

SELECT is(
  release_domain_operation('claim-test-domain', 'competing-token'),
  FALSE,
  'another token cannot release the claim'
);

SELECT is(
  finish_domain_operation('claim-test-domain', 'claim-test-project', NULL, TRUE),
  FALSE,
  'a null token cannot finish an active claim'
);

SELECT is(
  finish_domain_operation('claim-test-domain', 'claim-test-project', 'claim-test-token', NULL),
  FALSE,
  'an omitted operation cannot finish an active claim'
);

SELECT is(
  release_domain_operation('claim-test-domain', 'claim-test-token'),
  TRUE,
  'the owner can release its claim after a failed operation'
);

SELECT lives_ok(
  $$INSERT INTO "ProjectDomain" ("projectId", "domainId", "txtRecord", cname)
    VALUES ('claim-test-project-2', 'claim-test-domain', 'claim-test-txt-2', 'claim-test-cname-2')$$,
  'another project can link the domain after the claim is released'
);

SELECT is(
  claim_domain_operation('claim-test-domain', 'claim-test-project', 'expired-token'),
  2,
  'the new claim counts both project links'
);

UPDATE "Domain"
SET "operationExpiresAt" = clock_timestamp() - INTERVAL '1 second'
WHERE id = 'claim-test-domain';

SELECT is(
  claim_domain_operation('claim-test-domain', 'claim-test-project-2', 'replacement-token'),
  2,
  'a new claim can replace an expired claim'
);

SELECT is(
  finish_domain_operation('claim-test-domain', 'claim-test-project', 'expired-token', TRUE),
  FALSE,
  'an expired claim cannot finish after another claim replaces it'
);

SELECT is(
  release_domain_operation('claim-test-domain', 'expired-token'),
  FALSE,
  'an expired claim cannot release its replacement'
);

SELECT is(
  finish_domain_operation('claim-test-domain', 'claim-test-project-2', 'replacement-token', FALSE),
  TRUE,
  'a status-only operation can finish without detaching a link'
);

SELECT is(
  claim_domain_operation('claim-test-domain', 'claim-test-project', 'first-removal-token'),
  2,
  'the first removal sees two project links'
);

SELECT is(
  finish_domain_operation('claim-test-domain', 'claim-test-project', 'first-removal-token', TRUE),
  TRUE,
  'the first removal detaches only its project link'
);

SELECT is(
  (SELECT status FROM "Domain" WHERE id = 'claim-test-domain'),
  'ACTIVE'::"DomainStatus",
  'the shared domain stays active after its first link is removed'
);

SELECT is(
  claim_domain_operation('claim-test-domain', 'claim-test-project-2', 'last-removal-token'),
  1,
  'the last removal sees one project link'
);

SELECT is(
  finish_domain_operation('claim-test-domain', 'claim-test-project-2', 'last-removal-token', TRUE),
  TRUE,
  'the matching token finishes the last removal'
);

SELECT is(
  (SELECT count(*)::integer FROM "ProjectDomain" WHERE "domainId" = 'claim-test-domain'),
  0,
  'the claimed removal detaches the last link'
);

SELECT is(
  (SELECT status FROM "Domain" WHERE id = 'claim-test-domain'),
  'INITIALIZING'::"DomainStatus",
  'the unlinked domain is inactive'
);

SELECT * FROM finish();
ROLLBACK;
