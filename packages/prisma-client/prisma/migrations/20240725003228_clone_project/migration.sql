DROP FUNCTION IF EXISTS clone_project;
CREATE FUNCTION clone_project(
  project_id text,
  user_id text,
  title text,
  domain text
) RETURNS "Project" AS $$
DECLARE
  old_project "Project";
  new_project "Project";
BEGIN
  SELECT * FROM "Project" WHERE id=project_id INTO old_project;

  INSERT INTO "Project" (
    id,
    "userId",
    title,
    domain,
    "previewImageAssetId"
  )
  VALUES (
    extensions.uuid_generate_v4(),
    user_id,
    title,
    domain,
    old_project."previewImageAssetId"
  )
  RETURNING * INTO new_project;
  
  INSERT INTO "Asset" (id, name, "projectId")
  SELECT asset.id, asset.name, new_project.id AS "projectId"
  FROM "Asset" AS asset, "File" AS file
  WHERE
    asset.name = file.name AND
    file.status = 'UPLOADED' AND
    asset."projectId" = old_project.id;

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
$$ LANGUAGE plpgsql;
