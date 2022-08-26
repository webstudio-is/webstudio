/*
 The MIT License (MIT)
 Copyright (c) 2013 Jamar Parris
 
 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 
 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 
 https://gist.github.com/jamarparris/6100413
 */
CREATE OR REPLACE FUNCTION temporary_fn_generate_object_id() RETURNS varchar AS $$
DECLARE time_component bigint;
machine_id bigint := FLOOR(random() * 16777215);
process_id bigint;
seq_id bigint := FLOOR(random() * 16777215);
result varchar := '';
BEGIN
SELECT FLOOR(
    EXTRACT(
      EPOCH
      FROM clock_timestamp()
    )
  ) INTO time_component;
SELECT pg_backend_pid() INTO process_id;
result := result || lpad(to_hex(time_component), 8, '0');
result := result || lpad(to_hex(machine_id), 6, '0');
result := result || lpad(to_hex(process_id), 4, '0');
result := result || lpad(to_hex(seq_id), 6, '0');
RETURN result;
END;
$$ LANGUAGE PLPGSQL;


CREATE TABLE "Build" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pages" TEXT NOT NULL,
  "projectProdId" TEXT,
  
  -- for data migration
  "tmpTreeId" TEXT NOT NULL,

  CONSTRAINT "Build_pkey" PRIMARY KEY ("id")
);


-- Create a Build for every Tree
INSERT INTO "Build" ("id", "pages", "tmpTreeId")
select gen_random_uuid()::text as id,
  '{"homePage":{"id":"' || temporary_fn_generate_object_id() || '","name":"Home","path":"","title":"Home","meta":{},"treeId":"' || id || '"},"pages":[]}' as pages,
  id as tmpTreeId
from "Tree";

DROP FUNCTION temporary_fn_generate_object_id;


-- Add and set Project.devBuildId
ALTER TABLE "Project"
ADD COLUMN "devBuildId" TEXT;
UPDATE "Project"
SET "devBuildId" = (
    SELECT "id"
    FROM "Build"
    WHERE "Build"."tmpTreeId" = "Project"."devTreeId"
  );


-- Make sure all Builds corresponding to a prodTreeId have createdAt more recent than other Builds
UPDATE "Build"
SET "createdAt" = clock_timestamp()
WHERE "Build"."tmpTreeId" IN (
    SELECT "prodTreeId"
    FROM "Project"
  );


-- Set Build.projectProdId
WITH prod_trees AS (
  select id as project_id,
    json_array_elements_text("prodTreeIdHistory"::json) as tree_id
  from "Project"
  union
  select id as project_id,
    "prodTreeId" as tree_id
  from "Project"
  where "prodTreeId" IS NOT NULL
)
UPDATE "Build"
SET "projectProdId" = project_id
FROM prod_trees
WHERE "Build"."tmpTreeId" = tree_id;


ALTER TABLE "Build" DROP COLUMN "tmpTreeId";


-- AlterTable
ALTER TABLE "Project" DROP COLUMN "devTreeId",
  DROP COLUMN "prodTreeId",
  DROP COLUMN "prodTreeIdHistory",
  ALTER COLUMN "devBuildId"
SET NOT NULL;


-- CreateIndex
CREATE UNIQUE INDEX "Project_devBuildId_key" ON "Project"("devBuildId");


-- AddForeignKey
ALTER TABLE "Project"
ADD CONSTRAINT "Project_devBuildId_fkey" FOREIGN KEY ("devBuildId") REFERENCES "Build"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "Build"
ADD CONSTRAINT "Build_projectProdId_fkey" FOREIGN KEY ("projectProdId") REFERENCES "Project"("id") ON DELETE
SET NULL ON UPDATE CASCADE;