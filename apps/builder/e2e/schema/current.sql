--
-- PostgreSQL database dump
--

\restrict J29mZQHzSYuDPm8eRJiWoDBJq2TAh0b0ii1URRuunEM0BP9wmmC5I93noDiexdr

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: AuthorizationRelation; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AuthorizationRelation" AS ENUM (
    'viewers',
    'editors',
    'builders',
    'administrators'
);


--
-- Name: DomainStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DomainStatus" AS ENUM (
    'INITIALIZING',
    'ACTIVE',
    'ERROR',
    'PENDING'
);


--
-- Name: MarketplaceApprovalStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MarketplaceApprovalStatus" AS ENUM (
    'UNLISTED',
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: PublishStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PublishStatus" AS ENUM (
    'PENDING',
    'PUBLISHED',
    'FAILED'
);


--
-- Name: UploadStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UploadStatus" AS ENUM (
    'UPLOADING',
    'UPLOADED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Project; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    title text NOT NULL,
    domain text NOT NULL,
    "userId" text,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "previewImageAssetId" text,
    "marketplaceApprovalStatus" public."MarketplaceApprovalStatus" DEFAULT 'UNLISTED'::public."MarketplaceApprovalStatus" NOT NULL,
    tags text[],
    "workspaceId" uuid
);


--
-- Name: clone_project(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clone_project(project_id text, user_id text, title text, domain text) RETURNS public."Project"
    LANGUAGE plpgsql
    AS $$
DECLARE
  old_project "Project";
  new_project "Project";
BEGIN
  SELECT * FROM "Project" WHERE id=project_id INTO old_project;

  INSERT INTO "Project" (
    id,
    "userId",
    title,
    domain
  )
  VALUES (
    extensions.uuid_generate_v4(),
    user_id,
    title,
    domain
  )
  RETURNING * INTO new_project;

  INSERT INTO "Asset" (id, name, "projectId")
  SELECT asset.id, asset.name, new_project.id AS "projectId"
  FROM "Asset" AS asset, "File" AS file
  WHERE
    asset.name = file.name AND
    file.status = 'UPLOADED' AND
    asset."projectId" = old_project.id;

  -- set preview image asset after copying assets to the project
  UPDATE "Project"
  SET "previewImageAssetId"= old_project."previewImageAssetId"
  WHERE id=new_project.id;

  INSERT INTO "Build" (
    id,
    "projectId",
    pages,
    "styleSources",
    "styleSourceSelections",
    styles,
    breakpoints,
    props,
    instances,
    "dataSources",
    resources
  )
  SELECT
    extensions.uuid_generate_v4() AS id,
    new_project.id AS "projectId",
    pages,
    "styleSources",
    "styleSourceSelections",
    styles,
    breakpoints,
    props,
    instances,
    "dataSources",
    resources
  FROM "Build"
  WHERE "projectId" = old_project.id AND deployment IS NULL;

  RETURN new_project;
END;
$$;


--
-- Name: create_production_build(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_production_build(project_id text, deployment text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  new_build_id text;
BEGIN
  INSERT INTO "Build" (
    version,
    "lastTransactionId",
    pages,
    breakpoints,
    styles,
    "styleSources",
    "styleSourceSelections",
    props,
    "dataSources",
    resources,
    instances,
    "marketplaceProduct",
    "publishStatus",
    "projectId",
    id,
    deployment
  )
  SELECT
    version,
    "lastTransactionId",
    pages,
    breakpoints,
    styles,
    "styleSources",
    "styleSourceSelections",
    props,
    "dataSources",
    resources,
    instances,
    "marketplaceProduct",
    "publishStatus",
    "projectId",
    extensions.uuid_generate_v4() as id,
    create_production_build.deployment as deployment
  FROM "Build"
  WHERE "projectId" = project_id AND "Build"."deployment" IS NULL
  RETURNING "id" INTO new_build_id;

  RETURN new_build_id;
END;
$$;


--
-- Name: database_cleanup(timestamp without time zone, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.database_cleanup(from_date timestamp without time zone DEFAULT '2020-01-01 00:00:00'::timestamp without time zone, to_date timestamp without time zone DEFAULT '2099-12-31 23:59:59'::timestamp without time zone) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  WITH latest_builds AS (
    SELECT "buildId" FROM "Project" p, LATERAL "latestProjectDomainBuildVirtual"(p)
    UNION
    SELECT "buildId" FROM "Project" p, LATERAL "latestBuildVirtual"(p)
    UNION
    SELECT lb."buildId"
    FROM "Project" p, LATERAL "domainsVirtual"(p) dv, LATERAL "latestBuildVirtual"(dv) lb
  )
  UPDATE "Build"
  SET
    "styleSources" = '[]'::text,
    styles = '[]'::text,
    breakpoints = '[]'::text,
    "styleSourceSelections" = '[]'::text,
    props = '[]'::text,
    instances = '[]'::text,
    "dataSources" = '[]'::text,
    resources = '[]'::text,
    "marketplaceProduct" = '{}'::text,
    "isCleaned" = TRUE
  WHERE deployment IS NOT NULL
  AND id NOT IN (SELECT "buildId" FROM latest_builds)
  AND "isCleaned" = FALSE
  AND "createdAt" BETWEEN from_date AND to_date;  -- Filter by date range (for testing purposes)
END;
$$;


--
-- Name: domainsVirtual; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."domainsVirtual" (
    id text NOT NULL,
    "domainId" text NOT NULL,
    "projectId" text NOT NULL,
    domain text NOT NULL,
    status public."DomainStatus" DEFAULT 'INITIALIZING'::public."DomainStatus" NOT NULL,
    error text,
    "domainTxtRecord" text,
    "expectedTxtRecord" text NOT NULL,
    cname text NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


--
-- Name: TABLE "domainsVirtual"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."domainsVirtual" IS 'Virtual table representing domains related to each project. This table enforces a 1-1 relationship with the Project table and is used for API interaction (postgrest types).';


--
-- Name: COLUMN "domainsVirtual"."domainId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."domainsVirtual"."domainId" IS 'Unique identifier for the domain (Domain table reference).';


--
-- Name: COLUMN "domainsVirtual"."projectId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."domainsVirtual"."projectId" IS 'Unique identifier for the project, acting as the primary key (1-1 relationship with Project table).';


--
-- Name: COLUMN "domainsVirtual".domain; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."domainsVirtual".domain IS 'The domain name (must not be NULL).';


--
-- Name: COLUMN "domainsVirtual".status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."domainsVirtual".status IS 'Current status of the domain, with a default of INITIALIZING.';


--
-- Name: COLUMN "domainsVirtual".error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."domainsVirtual".error IS 'Optional error message field populated if the domain status is ERROR.';


--
-- Name: COLUMN "domainsVirtual"."domainTxtRecord"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."domainsVirtual"."domainTxtRecord" IS 'Current TXT record for the domain, coming from the Domain table.';


--
-- Name: COLUMN "domainsVirtual"."expectedTxtRecord"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."domainsVirtual"."expectedTxtRecord" IS 'Expected TXT record for the domain, pulled from the ProjectDomain table.';


--
-- Name: COLUMN "domainsVirtual".verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."domainsVirtual".verified IS 'Boolean flag indicating whether the domain is verified (true if TXT records match, false otherwise).';


--
-- Name: COLUMN "domainsVirtual"."createdAt"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."domainsVirtual"."createdAt" IS 'Timestamp indicating when the ProjectDomain entry was created.';


--
-- Name: COLUMN "domainsVirtual"."updatedAt"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."domainsVirtual"."updatedAt" IS 'Timestamp indicating when the Domain was last updated.';


--
-- Name: domainsVirtual(public."Project"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public."domainsVirtual"(public."Project") RETURNS SETOF public."domainsVirtual"
    LANGUAGE sql STABLE
    AS $_$
    -- This function retrieves all the domain information associated with a specific project by joining the Domain and ProjectDomain tables.
    -- It returns a result set conforming to the "domainsVirtual" structure, including fields such as domain status, error, verification status, etc.
    SELECT
        "Domain".id || '-' || "ProjectDomain"."projectId" as id,
        "Domain".id AS "domainId", -- Domain ID from Domain table
        "ProjectDomain"."projectId", -- Project ID from ProjectDomain table
        "Domain".domain, -- Domain name
        "Domain".status, -- Current domain status
        "Domain".error, -- Error message, if any
        "Domain"."txtRecord" AS "domainTxtRecord", -- Current TXT record from Domain table
        "ProjectDomain"."txtRecord" AS "expectedTxtRecord", -- Expected TXT record from ProjectDomain table
        "ProjectDomain"."cname" AS "cname",
        CASE
            WHEN "Domain"."txtRecord" = "ProjectDomain"."txtRecord" THEN true -- If TXT records match, domain is verified
            ELSE false
        END AS "verified", -- Boolean flag for verification status
        "ProjectDomain"."createdAt", -- Creation timestamp from ProjectDomain table
        "Domain"."updatedAt" -- Last updated timestamp from Domain table
    FROM
        "Domain"
    JOIN
        "ProjectDomain" ON "Domain".id = "ProjectDomain"."domainId" -- Joining Domain and ProjectDomain on domainId
    WHERE
        "ProjectDomain"."projectId" = $1.id -- Filtering by projectId passed as an argument to the function
    ORDER BY "ProjectDomain"."createdAt", "Domain".id; -- Stable sort
$_$;


--
-- Name: FUNCTION "domainsVirtual"(public."Project"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public."domainsVirtual"(public."Project") IS 'Function that retrieves domain-related data for a given project by joining the Domain and ProjectDomain tables. It returns a result set that conforms to the structure defined in the domainsVirtual virtual table.';


--
-- Name: Build; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Build" (
    id text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    pages text NOT NULL,
    "projectId" text NOT NULL,
    "styleSources" text DEFAULT '[]'::text NOT NULL,
    styles text DEFAULT '[]'::text NOT NULL,
    breakpoints text DEFAULT '[]'::text NOT NULL,
    "styleSourceSelections" text DEFAULT '[]'::text NOT NULL,
    props text DEFAULT '[]'::text NOT NULL,
    instances text DEFAULT '[]'::text NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer DEFAULT 0 NOT NULL,
    deployment text,
    "publishStatus" public."PublishStatus" DEFAULT 'PENDING'::public."PublishStatus" NOT NULL,
    "dataSources" text DEFAULT '[]'::text NOT NULL,
    "lastTransactionId" text,
    resources text DEFAULT '[]'::text NOT NULL,
    "marketplaceProduct" text DEFAULT '{}'::text NOT NULL,
    "isCleaned" boolean DEFAULT false
);


--
-- Name: DashboardProject; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public."DashboardProject" AS
 SELECT id,
    title,
    tags,
    domain,
    "userId",
    "workspaceId",
    "isDeleted",
    "createdAt",
    "previewImageAssetId",
    "marketplaceApprovalStatus",
    (EXISTS ( SELECT 1
           FROM public."Build"
          WHERE (("Build"."projectId" = "Project".id) AND ("Build".deployment IS NOT NULL)))) AS "isPublished"
   FROM public."Project";


--
-- Name: latestBuildVirtual; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."latestBuildVirtual" (
    "buildId" text NOT NULL,
    "projectId" text NOT NULL,
    "domainsVirtualId" text NOT NULL,
    domain text NOT NULL,
    "createdAt" timestamp(3) with time zone NOT NULL,
    "publishStatus" public."PublishStatus" NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE "latestBuildVirtual"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public."latestBuildVirtual" IS 'Virtual table representing the latest build for each project, enforcing a 1-1 relationship with the Project table. Used ONLY for postgrest types';


--
-- Name: COLUMN "latestBuildVirtual"."projectId"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."latestBuildVirtual"."projectId" IS 'Identifier for the project, enforcing a 1-1 relationship with the Project table as a primary key';


--
-- Name: COLUMN "latestBuildVirtual"."updatedAt"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public."latestBuildVirtual"."updatedAt" IS 'Timestamp indicating when the Build was last updated';


--
-- Name: latestBuildVirtual(public."DashboardProject"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public."latestBuildVirtual"(public."DashboardProject") RETURNS SETOF public."latestBuildVirtual"
    LANGUAGE sql STABLE ROWS 1
    AS $_$
SELECT
  lbv.*
FROM
  "Project" p,
  LATERAL "latestBuildVirtual"(p) lbv
WHERE
  p.id = $1.id
LIMIT 1;

$_$;


--
-- Name: FUNCTION "latestBuildVirtual"(public."DashboardProject"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public."latestBuildVirtual"(public."DashboardProject") IS 'Wrapper function to make latestBuildVirtual work with DashboardProject view for PostgREST computed fields.';


--
-- Name: latestBuildVirtual(public."Project"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public."latestBuildVirtual"(public."Project") RETURNS SETOF public."latestBuildVirtual"
    LANGUAGE sql STABLE ROWS 1
    AS $_$
SELECT
  b.id AS "buildId",
  b."projectId",
  '' as "domainsVirtualId",
  -- Use CASE to determine which domain to select based on conditions
  CASE
    WHEN (b.deployment :: jsonb ->> 'projectDomain') = p.domain
    OR (b.deployment :: jsonb -> 'domains') @> to_jsonb(array [p.domain]) THEN p.domain
    ELSE d.domain
  END AS "domain",
  b."createdAt",
  b."publishStatus",
  b."updatedAt"
FROM
  "Build" b
  JOIN "Project" p ON b."projectId" = p.id
  LEFT JOIN "ProjectDomain" pd ON pd."projectId" = p.id
  LEFT JOIN "Domain" d ON d.id = pd."domainId"
WHERE
  b."projectId" = $1.id
  AND b.deployment IS NOT NULL -- 'destination' IS NULL for backward compatibility; 'destination' = 'saas' for non-static builds
  AND (
    (b.deployment :: jsonb ->> 'destination') IS NULL
    OR (b.deployment :: jsonb ->> 'destination') = 'saas'
  )
  AND (
    -- Check if 'projectDomain' matches p.domain
    (b.deployment :: jsonb ->> 'projectDomain') = p.domain -- Check if 'domains' contains p.domain or d.domain
    OR (b.deployment :: jsonb -> 'domains') @> to_jsonb(array [p.domain])
    OR (b.deployment :: jsonb -> 'domains') @> to_jsonb(array [d.domain])
  )
ORDER BY
  b."createdAt" DESC
LIMIT
  1;

$_$;


--
-- Name: FUNCTION "latestBuildVirtual"(public."Project"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public."latestBuildVirtual"(public."Project") IS 'This function computes the latest build for a project, ensuring it is a production (non-static) build, where the domain matches either the Project.domain field or exists in the related Domain table. It provides backward compatibility for older records with a missing "destination" field.';


--
-- Name: latestBuildVirtual(public."domainsVirtual"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public."latestBuildVirtual"(public."domainsVirtual") RETURNS SETOF public."latestBuildVirtual"
    LANGUAGE sql STABLE ROWS 1
    AS $_$
SELECT
  b.id AS "buildId",
  b."projectId",
  '' as "domainsVirtualId",
  d."domain",
  b."createdAt",
  b."publishStatus",
  b."updatedAt"
FROM
  "Build" b
  JOIN "Domain" d ON d.id = $1."domainId"
WHERE
  b."projectId" = $1."projectId"
  AND b.deployment IS NOT NULL
  AND (b.deployment :: jsonb -> 'domains') @> to_jsonb(array [d.domain])
ORDER BY
  b."createdAt" DESC
LIMIT
  1;

$_$;


--
-- Name: FUNCTION "latestBuildVirtual"(public."domainsVirtual"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public."latestBuildVirtual"(public."domainsVirtual") IS 'Returns the latest build for a given project and domain as a computed field for PostgREST.';


--
-- Name: latestProjectDomainBuildVirtual(public."Project"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public."latestProjectDomainBuildVirtual"(public."Project") RETURNS SETOF public."latestBuildVirtual"
    LANGUAGE sql STABLE ROWS 1
    AS $_$
SELECT
  b.id AS "buildId",
  b."projectId",
  '' as "domainsVirtualId",
  p.domain AS "domain",
  b."createdAt",
  b."publishStatus",
  b."updatedAt"
FROM
  "Build" b
  JOIN "Project" p ON b."projectId" = p.id
  LEFT JOIN "ProjectDomain" pd ON pd."projectId" = p.id
WHERE
  b."projectId" = $1.id
  AND b.deployment IS NOT NULL
  AND (
    (b.deployment :: jsonb ->> 'destination') IS NULL
    OR (b.deployment :: jsonb ->> 'destination') = 'saas'
  )
  AND (
    (b.deployment :: jsonb ->> 'projectDomain') = p.domain
    OR (b.deployment :: jsonb -> 'domains') @> to_jsonb(array [p.domain])
  )
ORDER BY
  b."createdAt" DESC
LIMIT
  1;

$_$;


--
-- Name: FUNCTION "latestProjectDomainBuildVirtual"(public."Project"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public."latestProjectDomainBuildVirtual"(public."Project") IS 'This function computes the latest build for a project domain, ensuring it is a production (non-static) build, where the domain matches either the Project.domain field or exists in the related Domain table. It provides backward compatibility for older records with a missing "destination" field.';


--
-- Name: restore_development_build(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restore_development_build(project_id text, from_build_id text) RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE "Build"
  SET
    "version" = source."version",
    "lastTransactionId" = source."lastTransactionId",
    "pages" = source."pages",
    "breakpoints" = source."breakpoints",
    "styles" = source."styles",
    "styleSources" = source."styleSources",
    "styleSourceSelections" = source."styleSourceSelections",
    "props" = source."props",
    "dataSources" = source."dataSources",
    "resources" = source."resources",
    "instances" = source."instances",
    "marketplaceProduct" = source."marketplaceProduct"
  FROM (
    SELECT * FROM "Build"
    WHERE "projectId" = project_id AND "id" = from_build_id
  ) as source
  WHERE "Build"."projectId" = project_id AND "Build"."deployment" IS NULL;
  RETURN 'OK';
END;
$$;


--
-- Name: AuthorizationToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuthorizationToken" (
    token text NOT NULL,
    "projectId" text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    relation public."AuthorizationRelation" DEFAULT 'viewers'::public."AuthorizationRelation" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "canClone" boolean DEFAULT true NOT NULL,
    "canCopy" boolean DEFAULT true NOT NULL,
    "canPublish" boolean DEFAULT false NOT NULL
);


--
-- Name: ApprovedMarketplaceProduct; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public."ApprovedMarketplaceProduct" AS
 SELECT DISTINCT ON ("projectId") "projectId",
    "marketplaceProduct",
    ( SELECT auth.token
           FROM public."AuthorizationToken" auth
          WHERE ((auth."projectId" = build."projectId") AND (auth.relation = 'viewers'::public."AuthorizationRelation"))
          ORDER BY auth.token
         LIMIT 1) AS "authorizationToken"
   FROM public."Build" build
  WHERE ((deployment IS NOT NULL) AND ("projectId" IN ( SELECT "Project".id
           FROM public."Project"
          WHERE (("Project"."isDeleted" = false) AND ("Project"."marketplaceApprovalStatus" = ('APPROVED'::text)::public."MarketplaceApprovalStatus")))))
  ORDER BY "projectId", "createdAt" DESC, id;


--
-- Name: Asset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Asset" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    name text NOT NULL,
    description text,
    filename text
);


--
-- Name: ClientReferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClientReferences" (
    reference text DEFAULT public.uuid_generate_v4() NOT NULL,
    service text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" text NOT NULL
);


--
-- Name: Domain; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Domain" (
    id text NOT NULL,
    domain text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "txtRecord" text,
    status public."DomainStatus" DEFAULT 'INITIALIZING'::public."DomainStatus" NOT NULL,
    error text,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: File; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."File" (
    name text NOT NULL,
    format text NOT NULL,
    size integer NOT NULL,
    description text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    meta text DEFAULT '{}'::text NOT NULL,
    status public."UploadStatus" DEFAULT 'UPLOADING'::public."UploadStatus" NOT NULL,
    "uploaderProjectId" text,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: LatestStaticBuildPerProject; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public."LatestStaticBuildPerProject" AS
 SELECT DISTINCT ON ("projectId") id AS "buildId",
    "projectId",
    "updatedAt",
    "publishStatus"
   FROM public."Build" bld
  WHERE ((deployment IS NOT NULL) AND (((deployment)::jsonb ->> 'destination'::text) = 'static'::text))
  ORDER BY "projectId", "createdAt" DESC, id;


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    "recipientId" text NOT NULL,
    "senderId" text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "respondedAt" timestamp(3) with time zone
);


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    features text[],
    images text[],
    meta jsonb NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ProjectDomain; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProjectDomain" (
    "projectId" text NOT NULL,
    "domainId" text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "txtRecord" text NOT NULL,
    cname text NOT NULL
);


--
-- Name: TransactionLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TransactionLog" (
    "eventId" text NOT NULL,
    "productId" text,
    "userId" text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "eventData" jsonb,
    "eventCreated" integer GENERATED ALWAYS AS ((("eventData" #>> '{created}'::text[]))::integer) STORED,
    "eventType" text GENERATED ALWAYS AS (("eventData" #>> '{type}'::text[])) STORED,
    status text GENERATED ALWAYS AS (("eventData" #>> '{data,object,status}'::text[])) STORED,
    "customerId" text GENERATED ALWAYS AS (("eventData" #>> '{data,object,customer}'::text[])) STORED,
    "customerEmail" text GENERATED ALWAYS AS (("eventData" #>> '{data,object,customer_details,email}'::text[])) STORED,
    "subscriptionId" text GENERATED ALWAYS AS (
CASE
    WHEN (("eventData" #>> '{data,object,object}'::text[]) = 'subscription'::text) THEN ("eventData" #>> '{data,object,id}'::text[])
    ELSE ("eventData" #>> '{data,object,subscription}'::text[])
END) STORED,
    "paymentIntent" text GENERATED ALWAYS AS (("eventData" #>> '{data,object,payment_intent}'::text[])) STORED
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    email text,
    image text,
    provider text,
    username text,
    "projectsTags" jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: UserProduct; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public."UserProduct" AS
( SELECT tl."userId",
    tl."subscriptionId",
    tl."productId",
    tl."customerId",
    tl."customerEmail"
   FROM public."TransactionLog" tl
  WHERE ((tl.status = 'complete'::text) AND (tl."eventType" = 'checkout.session.completed'::text) AND (NOT (EXISTS ( SELECT 1
           FROM public."TransactionLog" failed
          WHERE ((failed."eventType" = 'checkout.session.async_payment_failed'::text) AND ((failed."eventData" #>> '{data,object,id}'::text[]) = (tl."eventData" #>> '{data,object,id}'::text[])) AND (failed."eventCreated" >= tl."eventCreated"))))) AND (NOT (EXISTS ( SELECT 1
           FROM public."TransactionLog" tlexsists
          WHERE ((tlexsists."subscriptionId" = tl."subscriptionId") AND (tlexsists."eventType" = 'customer.subscription.deleted'::text) AND (tlexsists.status = 'canceled'::text) AND (tlexsists."eventCreated" > tl."eventCreated"))))) AND (NOT (EXISTS ( SELECT 1
           FROM public."TransactionLog" tlexsists
          WHERE ((tlexsists."paymentIntent" = tl."paymentIntent") AND (tlexsists."eventType" = 'charge.refunded'::text) AND (tlexsists.status = 'succeeded'::text) AND (tlexsists."eventCreated" > tl."eventCreated"))))))
  ORDER BY tl."userId", tl."eventCreated" DESC)
UNION ALL
 SELECT "TransactionLog"."userId",
    "TransactionLog"."subscriptionId",
    "TransactionLog"."productId",
    "TransactionLog"."customerId",
    "TransactionLog"."customerEmail"
   FROM public."TransactionLog"
  WHERE ("TransactionLog"."eventType" = 'appsumo.activate'::text);


--
-- Name: Workspace; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Workspace" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "userId" text NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL
);


--
-- Name: WorkspaceMember; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkspaceMember" (
    "workspaceId" uuid NOT NULL,
    "userId" text NOT NULL,
    relation public."AuthorizationRelation" DEFAULT 'administrators'::public."AuthorizationRelation" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "removedAt" timestamp(3) with time zone
);


--
-- Name: WorkspaceProjectAuthorization; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public."WorkspaceProjectAuthorization" AS
 SELECT w."userId",
    p.id AS "projectId",
    'own'::text AS relation
   FROM (public."Workspace" w
     JOIN public."Project" p ON ((p."workspaceId" = w.id)))
  WHERE ((w."isDeleted" = false) AND (p."isDeleted" = false))
UNION ALL
 SELECT wm."userId",
    p.id AS "projectId",
    (wm.relation)::text AS relation
   FROM ((public."WorkspaceMember" wm
     JOIN public."Workspace" w ON ((w.id = wm."workspaceId")))
     JOIN public."Project" p ON ((p."workspaceId" = wm."workspaceId")))
  WHERE ((wm."removedAt" IS NULL) AND (w."isDeleted" = false) AND (p."isDeleted" = false));


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: published_builds; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.published_builds AS
 SELECT id AS "buildId",
    "projectId",
    "createdAt",
    ( SELECT string_agg(list.value, ', '::text) AS string_agg
           FROM jsonb_array_elements_text(((build.deployment)::jsonb -> 'domains'::text)) list(value)) AS domains
   FROM public."Build" build
  WHERE ((deployment IS NOT NULL) AND ("isCleaned" = false))
  ORDER BY "projectId", "createdAt" DESC;


--
-- Name: user_publish_count; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_publish_count AS
 SELECT DISTINCT "Project"."userId" AS user_id,
    count(*) AS count
   FROM (public."Build"
     LEFT JOIN public."Project" ON (("Project".id = "Build"."projectId")))
  WHERE ((date_trunc('day'::text, "Build"."createdAt") = date_trunc('day'::text, now())) AND ("Build".deployment IS NOT NULL))
  GROUP BY "Project"."userId";


--
-- Name: Asset Asset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_pkey" PRIMARY KEY (id, "projectId");


--
-- Name: AuthorizationToken AuthorizationToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuthorizationToken"
    ADD CONSTRAINT "AuthorizationToken_pkey" PRIMARY KEY (token, "projectId");


--
-- Name: Build Build_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Build"
    ADD CONSTRAINT "Build_pkey" PRIMARY KEY (id, "projectId");


--
-- Name: ClientReferences ClientReferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClientReferences"
    ADD CONSTRAINT "ClientReferences_pkey" PRIMARY KEY ("userId", service);


--
-- Name: Domain Domain_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Domain"
    ADD CONSTRAINT "Domain_pkey" PRIMARY KEY (id);


--
-- Name: File File_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."File"
    ADD CONSTRAINT "File_pkey" PRIMARY KEY (name);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: ProjectDomain ProjectDomain_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectDomain"
    ADD CONSTRAINT "ProjectDomain_pkey" PRIMARY KEY ("projectId", "domainId");


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: TransactionLog TransactionLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionLog"
    ADD CONSTRAINT "TransactionLog_pkey" PRIMARY KEY ("eventId");


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WorkspaceMember WorkspaceMember_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkspaceMember"
    ADD CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId", "userId");


--
-- Name: Workspace Workspace_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Workspace"
    ADD CONSTRAINT "Workspace_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: domainsVirtual domainsVirtual_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."domainsVirtual"
    ADD CONSTRAINT "domainsVirtual_pkey" PRIMARY KEY (id);


--
-- Name: latestBuildVirtual latestBuildVirtual_buildId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."latestBuildVirtual"
    ADD CONSTRAINT "latestBuildVirtual_buildId_key" UNIQUE ("buildId");


--
-- Name: latestBuildVirtual latestBuildVirtual_domainsVirtualId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."latestBuildVirtual"
    ADD CONSTRAINT "latestBuildVirtual_domainsVirtualId_key" UNIQUE ("domainsVirtualId");


--
-- Name: latestBuildVirtual latestBuildVirtual_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."latestBuildVirtual"
    ADD CONSTRAINT "latestBuildVirtual_pkey" PRIMARY KEY ("projectId");


--
-- Name: AuthorizationToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AuthorizationToken_token_key" ON public."AuthorizationToken" USING btree (token);


--
-- Name: Build_dev_index; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Build_dev_index" ON public."Build" USING btree ("projectId") WHERE (deployment IS NULL);


--
-- Name: Build_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Build_id_key" ON public."Build" USING btree (id);


--
-- Name: Build_projectId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Build_projectId_createdAt_idx" ON public."Build" USING btree ("projectId", "createdAt" DESC);


--
-- Name: INDEX "Build_projectId_createdAt_idx"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public."Build_projectId_createdAt_idx" IS 'Used to speedup ApprovedMarketplaceProduct view';


--
-- Name: ClientReferences_reference_service_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ClientReferences_reference_service_key" ON public."ClientReferences" USING btree (reference, service);


--
-- Name: Domain_domain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Domain_domain_key" ON public."Domain" USING btree (domain);


--
-- Name: Notification_recipientId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_recipientId_status_idx" ON public."Notification" USING btree ("recipientId", status);


--
-- Name: ProjectDomain_domainId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectDomain_domainId_idx" ON public."ProjectDomain" USING btree ("domainId");


--
-- Name: ProjectDomain_txtRecord_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProjectDomain_txtRecord_key" ON public."ProjectDomain" USING btree ("txtRecord");


--
-- Name: Project_domain_isDeleted_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Project_domain_isDeleted_key" ON public."Project" USING btree (domain, "isDeleted");


--
-- Name: Project_domain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Project_domain_key" ON public."Project" USING btree (domain);


--
-- Name: Project_id_domain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Project_id_domain_key" ON public."Project" USING btree (id, domain);


--
-- Name: Project_id_isDeleted_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Project_id_isDeleted_key" ON public."Project" USING btree (id, "isDeleted");


--
-- Name: Project_isDeleted_marketplaceApprovalStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_isDeleted_marketplaceApprovalStatus_idx" ON public."Project" USING btree ("isDeleted", "marketplaceApprovalStatus");


--
-- Name: INDEX "Project_isDeleted_marketplaceApprovalStatus_idx"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public."Project_isDeleted_marketplaceApprovalStatus_idx" IS 'Used to speedup ApprovedMarketplaceProduct view';


--
-- Name: TransactionLog_eventId_productId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TransactionLog_eventId_productId_key" ON public."TransactionLog" USING btree ("eventId", "productId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: WorkspaceMember_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkspaceMember_userId_idx" ON public."WorkspaceMember" USING btree ("userId");


--
-- Name: Workspace_userId_isDefault_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Workspace_userId_isDefault_key" ON public."Workspace" USING btree ("userId", "isDefault") WHERE ("isDefault" = true);


--
-- Name: Asset Asset_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_name_fkey" FOREIGN KEY (name) REFERENCES public."File"(name) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuthorizationToken AuthorizationToken_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuthorizationToken"
    ADD CONSTRAINT "AuthorizationToken_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Build Build_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Build"
    ADD CONSTRAINT "Build_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ClientReferences ClientReferences_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClientReferences"
    ADD CONSTRAINT "ClientReferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: File File_uploaderProjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."File"
    ADD CONSTRAINT "File_uploaderProjectId_fkey" FOREIGN KEY ("uploaderProjectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProjectDomain ProjectDomain_domainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectDomain"
    ADD CONSTRAINT "ProjectDomain_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES public."Domain"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProjectDomain ProjectDomain_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectDomain"
    ADD CONSTRAINT "ProjectDomain_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Project Project_previewImageAssetId_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_previewImageAssetId_id_fkey" FOREIGN KEY ("previewImageAssetId", id) REFERENCES public."Asset"(id, "projectId") ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Project Project_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Project Project_workspaceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TransactionLog TransactionLog_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionLog"
    ADD CONSTRAINT "TransactionLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TransactionLog TransactionLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TransactionLog"
    ADD CONSTRAINT "TransactionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WorkspaceMember WorkspaceMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkspaceMember"
    ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WorkspaceMember WorkspaceMember_workspaceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkspaceMember"
    ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Workspace Workspace_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Workspace"
    ADD CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: domainsVirtual domainsVirtual_domainId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."domainsVirtual"
    ADD CONSTRAINT "domainsVirtual_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES public."Domain"(id);


--
-- Name: domainsVirtual domainsVirtual_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."domainsVirtual"
    ADD CONSTRAINT "domainsVirtual_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id);


--
-- Name: latestBuildVirtual latestBuildVirtual_buildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."latestBuildVirtual"
    ADD CONSTRAINT "latestBuildVirtual_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES public."Build"(id);


--
-- Name: latestBuildVirtual latestBuildVirtual_domainsVirtualId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."latestBuildVirtual"
    ADD CONSTRAINT "latestBuildVirtual_domainsVirtualId_fkey" FOREIGN KEY ("domainsVirtualId") REFERENCES public."domainsVirtual"(id);


--
-- Name: latestBuildVirtual latestBuildVirtual_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."latestBuildVirtual"
    ADD CONSTRAINT "latestBuildVirtual_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id);


--
-- PostgreSQL database dump complete
--

\unrestrict J29mZQHzSYuDPm8eRJiWoDBJq2TAh0b0ii1URRuunEM0BP9wmmC5I93noDiexdr

