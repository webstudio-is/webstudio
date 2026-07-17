CREATE TABLE "AssetFolder" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parentId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AssetFolder_pkey" PRIMARY KEY ("id", "projectId"),
  CONSTRAINT "AssetFolder_name_not_blank" CHECK (BTRIM("name") <> ''),
  CONSTRAINT "AssetFolder_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssetFolder_parentId_projectId_fkey"
    FOREIGN KEY ("parentId", "projectId") REFERENCES "AssetFolder"("id", "projectId")
    ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE INDEX "AssetFolder_projectId_parentId_idx"
  ON "AssetFolder"("projectId", "parentId");

CREATE UNIQUE INDEX "AssetFolder_unique_sibling_name"
  ON "AssetFolder"(
    "projectId",
    COALESCE("parentId", ''),
    LOWER(BTRIM("name"))
  );

ALTER TABLE "Asset" ADD COLUMN "folderId" TEXT;

ALTER TABLE "Asset"
  ADD CONSTRAINT "Asset_folderId_projectId_fkey"
  FOREIGN KEY ("folderId", "projectId") REFERENCES "AssetFolder"("id", "projectId")
  ON DELETE NO ACTION ON UPDATE CASCADE;

-- Keep the database-level project clone path aligned with asset folders.
CREATE OR REPLACE FUNCTION clone_project(
  project_id text,
  user_id text,
  title text,
  domain text
) RETURNS "Project" AS $$
DECLARE
  old_project "Project";
  new_project "Project";
BEGIN
  SELECT * FROM "Project" WHERE id = project_id INTO old_project;

  INSERT INTO "Project" (id, "userId", title, domain)
  VALUES (gen_random_uuid(), user_id, title, domain)
  RETURNING * INTO new_project;

  INSERT INTO "AssetFolder" (id, "projectId", name, "parentId", "createdAt")
  SELECT id, new_project.id, name, "parentId", "createdAt"
  FROM "AssetFolder"
  WHERE "projectId" = old_project.id;

  INSERT INTO "Asset" (
    id,
    name,
    "projectId",
    filename,
    description,
    "folderId"
  )
  SELECT
    asset.id,
    asset.name,
    new_project.id,
    asset.filename,
    asset.description,
    asset."folderId"
  FROM "Asset" AS asset, "File" AS file
  WHERE
    asset.name = file.name AND
    file.status = 'UPLOADED' AND
    asset."projectId" = old_project.id;

  UPDATE "Project"
  SET "previewImageAssetId" = old_project."previewImageAssetId"
  WHERE id = new_project.id;

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
    resources,
    "marketplaceProduct",
    "projectSettings"
  )
  SELECT
    gen_random_uuid(),
    new_project.id,
    pages,
    "styleSources",
    "styleSourceSelections",
    styles,
    breakpoints,
    props,
    instances,
    "dataSources",
    resources,
    "marketplaceProduct",
    "projectSettings"
  FROM "Build"
  WHERE "projectId" = old_project.id AND deployment IS NULL;

  RETURN new_project;
END;
$$ LANGUAGE plpgsql;
