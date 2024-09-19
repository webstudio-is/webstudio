# Sql Testing AI Helpers

Extract schema

```bash
pnpx supabase db dump -s public --db-url postgresql://postgres:pass@localhost/webstudio > schema.sql
```

Promt Examples

---

Below is a partial dump of the SQL schema:

```sql

CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" "text" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "email" "text",
    "image" "text",
    "provider" "text",
    "username" "text",
    "teamId" "text"
);


CREATE TABLE IF NOT EXISTS "public"."Domain" (
    "id" "text" NOT NULL,
    "domain" "text" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "txtRecord" "text",
    "status" "public"."DomainStatus" DEFAULT 'INITIALIZING'::"public"."DomainStatus" NOT NULL,
    "error" "text",
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."Build" (
    "id" "text" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "pages" "text" NOT NULL,
    "projectId" "text" NOT NULL,
    "styleSources" "text" DEFAULT '[]'::"text" NOT NULL,
    "styles" "text" DEFAULT '[]'::"text" NOT NULL,
    "breakpoints" "text" DEFAULT '[]'::"text" NOT NULL,
    "styleSourceSelections" "text" DEFAULT '[]'::"text" NOT NULL,
    "props" "text" DEFAULT '[]'::"text" NOT NULL,
    "instances" "text" DEFAULT '[]'::"text" NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "version" integer DEFAULT 0 NOT NULL,
    "deployment" "text",
    "publishStatus" "public"."PublishStatus" DEFAULT 'PENDING'::"public"."PublishStatus" NOT NULL,
    "dataSources" "text" DEFAULT '[]'::"text" NOT NULL,
    "lastTransactionId" "text",
    "resources" "text" DEFAULT '[]'::"text" NOT NULL,
    "marketplaceProduct" "text" DEFAULT '{}'::"text" NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."Project" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "domain" "text" NOT NULL,
    "userId" "text",
    "isDeleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "previewImageAssetId" "text",
    "marketplaceApprovalStatus" "public"."MarketplaceApprovalStatus" DEFAULT 'UNLISTED'::"public"."MarketplaceApprovalStatus" NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."ProjectDomain" (
    "projectId" "text" NOT NULL,
    "domainId" "text" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "txtRecord" "text" NOT NULL,
    "cname" "text" NOT NULL
);

CREATE OR REPLACE FUNCTION "public"."latestBuildVirtual"("public"."Project") RETURNS SETOF "public"."latestBuildVirtual"
    LANGUAGE "sql" STABLE ROWS 1
    AS $_$ -- The function is expected to return 1 row


SELECT
    b.id AS "buildId",
    b."projectId",
    -- Use CASE to determine which domain to select based on conditions
    CASE
        WHEN (b.deployment::jsonb ->> 'projectDomain') = p.domain
             OR (b.deployment::jsonb -> 'domains') @> to_jsonb(array[p.domain])
        THEN p.domain
        ELSE d.domain
    END AS "domain",
    b."createdAt",
    b."publishStatus"
FROM "Build" b
JOIN "Project" p ON b."projectId" = p.id
LEFT JOIN "ProjectDomain" pd ON pd."projectId" = p.id
LEFT JOIN "Domain" d ON d.id = pd."domainId"
WHERE b."projectId" = $1.id
  AND b.deployment IS NOT NULL
  -- 'destination' IS NULL for backward compatibility; 'destination' = 'saas' for non-static builds
  AND ((b.deployment::jsonb ->> 'destination') IS NULL OR (b.deployment::jsonb ->> 'destination') = 'saas')
  AND (
      -- Check if 'projectDomain' matches p.domain
      (b.deployment::jsonb ->> 'projectDomain') = p.domain
      -- Check if 'domains' contains p.domain or d.domain
      OR (b.deployment::jsonb -> 'domains') @> to_jsonb(array[p.domain])
      OR (b.deployment::jsonb -> 'domains') @> to_jsonb(array[d.domain])
  )
ORDER BY b."createdAt" DESC
LIMIT 1;

$_$;

```

Create a pgTAP test for the function "public"."latestBuildVirtual" that takes "public"."Project" as an argument.

---

## Additional Instructions

These instructions are sometimes necessary, while at other times they may not be required.

All fields, such as `projectId`, already reference their corresponding table columns (e.g., `"Project"."id"`), but foreign key constraints are omitted.

- **Data Integrity:** Do not create new tables for `"public"."Project"` or related entities. These tables already exist in the database. DO NOT TRUNCATE DROP or DELETE Existing tables.

- **Data Accuracy:** When inserting new data, adhere strictly to the NULL constraints. Ensure all fields without default values are filled correctly in every `INSERT` statement.
  you may omit fields with default values if they are not directly relevant to the tests, except for `"createdAt"` and `"updatedAt"` fields, which should always be specified with explicit timestamp values.

- **Timestamp Fields:** For fields like `"createdAt"` and `"updatedAt"`, always use specific timestamp values rather than functions like `NOW()`.

- **Naming Conventions:** Since field and function names use camelCase, always wrap them in double quotes (`""`) to ensure proper referencing.

- **Test Coverage:** In addition to standard tests, cover additional cases to validate that the function returns the correct data in different scenarios:

  1. When a project has changed its domain.
  2. When builds with the new domain do not exist and when they do exist.
  3. When the domain is either in `Build.deployment.projectDomain` or included in `Build.deployment.domains`.

- **Function Calls:** Use precise casting for function calls, such as `(p.*)::Project`, to ensure accuracy in test execution.

Ensure the tests comprehensively validate the function’s behavior in all specified cases.

In addition to the specific test cases mentioned, any other test scenarios the model identifies would be highly appreciated.

Examples of calling the function:

```sql

select "public"."latestBuildVirtual"((p.*)::"Project") from "public"."Project" p where p.id = '1';
```

---

## PS

Initially, it may produce non-working examples. However, it seems that a multi-step improvement process can enhance the results. By incorporating the additions mentioned above, you can achieve better final outcomes. While not perfect, it serves as a good starting point.

Seems like the shorter the input the better the results. The models are seems to struggle with longer inputs.
