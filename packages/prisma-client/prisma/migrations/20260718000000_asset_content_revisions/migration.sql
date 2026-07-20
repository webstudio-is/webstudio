CREATE OR REPLACE FUNCTION swap_asset_file(
  project_id text,
  asset_id text,
  expected_name text,
  replacement_name text
) RETURNS text AS $$
DECLARE
  current_name text;
BEGIN
  SELECT "name"
  INTO current_name
  FROM "Asset"
  WHERE "projectId" = project_id AND "id" = asset_id
  FOR UPDATE;

  IF current_name IS NULL THEN
    RETURN 'not_found';
  END IF;

  IF current_name <> expected_name THEN
    RETURN 'conflict';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "File"
    WHERE
      "name" = replacement_name
      AND "status" = 'UPLOADED'
      AND "uploaderProjectId" = project_id
  ) THEN
    RETURN 'invalid_revision';
  END IF;

  UPDATE "File"
  SET "isDeleted" = false
  WHERE "name" = replacement_name;

  UPDATE "Asset"
  SET "name" = replacement_name
  WHERE "projectId" = project_id AND "id" = asset_id;

  UPDATE "File"
  SET "isDeleted" = true
  WHERE
    "name" = expected_name
    AND NOT EXISTS (
      SELECT 1 FROM "Asset" WHERE "name" = expected_name
    );

  RETURN 'updated';
END;
$$ LANGUAGE plpgsql;
