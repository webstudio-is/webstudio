
-- Implementation Zanzibar paper https://research.google/pubs/pub48190/ subset
-- We don't support any depth of relations, only 1 level of SubjectSet relations
-- We don't support `any` relation in SubjectSet
-- This table allows to create rows:
-- - Namespace:Object#Relation@Subject
-- - Namespace:Object#Relation@(SubjectSetNamespace:SubjectSetObject#SubjectSetRelation)
CREATE TABLE "Acl" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "subject" TEXT,
    -- If subject is null, then subjectSetNamespace and subjectSetObject and subjectSetRelation must be non-null and vice versa
    "subjectSetNamespace" TEXT CHECK(("subjectSetNamespace" IS NULL) != (subject IS NULL)),
    "subjectSetObject" TEXT CHECK(("subjectSetNamespace" IS NULL) != (subject IS NULL)),
    -- Zanzibar paper allows subjectSetRelation to be NULL meaning ANY relation, but we don't
    "subjectSetRelation" TEXT CHECK(("subjectSetRelation" IS NULL) != (subject IS NULL)),

    CONSTRAINT "Acl_pkey" PRIMARY KEY ("id")
);


-- Zanzibar allows any depth of relations, and can expand them to any depth
-- We resrict depth of SubjectSet relations to 1.
-- AclExpand expands all Subject Sets on depth 1
--
-- Example:
-- In table we have:
-- Group:Project Alice Writers#member@Bob
-- Group:Project Alice Writers#member@Carol
-- Project:Project Alice#writer@(Group:Project Alice Writers#member)'
--
-- After expanding (Group:Project Alice Writers#member) we get
-- Group:Project Alice Writers#member@Bob
-- Group:Project Alice Writers#member@Carol
-- Project:Project Alice#writer@Bob'
-- Project:Project Alice#writer@Carol'
CREATE OR REPLACE VIEW "AclExpand" AS
SELECT
  a.id,
  a.namespace,
  a.object,
  a.relation,
  coalesce(a.subject, b.subject) AS subject,
  -- Source is for debug needs, to know where the relation came from
  CASE WHEN a."subjectSetNamespace" IS NOT NULL THEN
    concat(a."subjectSetNamespace", ':', a."subjectSetObject", '#', a."subjectSetRelation")
  ELSE
    'direct-relation'
  END AS "debugSource"
FROM
  "Acl" a
  LEFT JOIN "Acl" b ON a."subjectSetNamespace" = b.namespace
    AND a."subjectSetObject" = b.object
    AND a."subjectSetRelation" = b.relation;

-- Rewrites described in 2.3.1  allows to minimize amount of rules.
-- Example:
-- owner has writer, reader permissions
-- writer has reader permissions
-- Instead of creating 3 rows for owner, we use rewrites
-- Example:
-- In table we have:
-- Project:Project Alice#owner@Alice
-- After "AclExpandRewrites"
-- Project:Project Alice#owner@Alice
-- Project:Project Alice#writer@Alice
-- Project:Project Alice#reader@Alice
CREATE OR REPLACE VIEW "AclExpandRewrites" AS
SELECT
  id,
  namespace,
  object,
  unnest(
    CASE WHEN namespace = 'Project' THEN
      CASE WHEN relation = 'owner' THEN
        (ARRAY['owner', 'writer', 'reader'])
      WHEN relation = 'writer' THEN
        (ARRAY['writer', 'reader'])
      ELSE
        (ARRAY["relation"])
      END
    ELSE
      (ARRAY["relation"])
    END) AS relation,
  subject,
  relation AS "originalRelation",
  "debugSource"
FROM
  "AclExpand";

