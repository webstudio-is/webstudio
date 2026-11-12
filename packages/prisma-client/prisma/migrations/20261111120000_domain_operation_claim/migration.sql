ALTER TABLE "Domain"
ADD COLUMN "operationToken" TEXT,
ADD COLUMN "operationExpiresAt" TIMESTAMPTZ(3);

-- A claim survives the separate Cloudflare request. It serializes changes to
-- one hostname and expires if the Builder process exits before releasing it.
CREATE FUNCTION claim_domain_operation(
  p_domain_id TEXT,
  p_project_id TEXT,
  p_token TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_token TEXT;
  expires_at TIMESTAMPTZ;
  link_count INTEGER;
BEGIN
  IF p_token IS NULL OR p_token = '' THEN
    RETURN -1;
  END IF;

  SELECT "operationToken", "operationExpiresAt"
  INTO current_token, expires_at
  FROM "Domain"
  WHERE id = p_domain_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN -2;
  END IF;
  IF current_token IS NOT NULL AND expires_at > clock_timestamp() THEN
    RETURN -1;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "ProjectDomain"
    WHERE "domainId" = p_domain_id AND "projectId" = p_project_id
  ) THEN
    RETURN -2;
  END IF;

  UPDATE "Domain"
  SET "operationToken" = p_token,
      "operationExpiresAt" = clock_timestamp() + INTERVAL '15 minutes'
  WHERE id = p_domain_id;

  SELECT count(*) INTO link_count
  FROM "ProjectDomain"
  WHERE "domainId" = p_domain_id;
  RETURN link_count;
END;
$$;

CREATE FUNCTION finish_domain_operation(
  p_domain_id TEXT,
  p_project_id TEXT,
  p_token TEXT,
  p_remove BOOLEAN
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_token TEXT;
  link_count INTEGER;
BEGIN
  SELECT "operationToken" INTO current_token
  FROM "Domain"
  WHERE id = p_domain_id
  FOR UPDATE;

  IF p_token IS NULL OR p_token = '' OR p_remove IS NULL
     OR current_token IS NULL OR current_token <> p_token THEN
    RETURN FALSE;
  END IF;

  IF p_remove THEN
    DELETE FROM "ProjectDomain"
    WHERE "domainId" = p_domain_id AND "projectId" = p_project_id;
    IF NOT FOUND THEN
      RETURN FALSE;
    END IF;

    SELECT count(*) INTO link_count
    FROM "ProjectDomain"
    WHERE "domainId" = p_domain_id;
  END IF;

  UPDATE "Domain"
  SET "operationToken" = NULL,
      "operationExpiresAt" = NULL,
      status = CASE WHEN p_remove AND link_count = 0
        THEN 'INITIALIZING'::"DomainStatus" ELSE status END,
      error = CASE WHEN p_remove AND link_count = 0
        THEN 'Removed from project' ELSE error END,
      "txtRecord" = CASE WHEN p_remove AND link_count = 0
        THEN NULL ELSE "txtRecord" END
  WHERE id = p_domain_id;
  RETURN TRUE;
END;
$$;

CREATE FUNCTION release_domain_operation(
  p_domain_id TEXT,
  p_token TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE "Domain"
  SET "operationToken" = NULL, "operationExpiresAt" = NULL
  WHERE id = p_domain_id AND "operationToken" = p_token;
  RETURN FOUND;
END;
$$;

CREATE FUNCTION guard_domain_link_during_operation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_token TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  SELECT "operationToken", "operationExpiresAt"
  INTO current_token, expires_at
  FROM "Domain"
  WHERE id = NEW."domainId"
  FOR UPDATE;

  IF current_token IS NOT NULL AND expires_at > clock_timestamp() THEN
    RAISE EXCEPTION 'Domain operation failed' USING ERRCODE = '40001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_domain_link_during_operation
BEFORE INSERT OR UPDATE OF "domainId" ON "ProjectDomain"
FOR EACH ROW
EXECUTE FUNCTION guard_domain_link_during_operation();

-- Expose the new RPC functions to an already running PostgREST server.
NOTIFY pgrst, 'reload schema';
