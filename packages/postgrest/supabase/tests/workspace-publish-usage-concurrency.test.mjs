import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { test } from "node:test";

const databaseUrl = process.env.PUBLISH_USAGE_TEST_DATABASE_URL;
const exec = promisify(execFile);
const sql = async (query) => {
  const { stdout } = await exec("psql", [
    databaseUrl,
    "-X",
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    query,
  ]);
  return stdout.trim();
};

test(
  "concurrent projects cannot spend the same last workspace publish",
  { skip: !databaseUrl },
  async () => {
    const workspaceId = randomUUID();
    const ownerId = randomUUID();
    const projectA = randomUUID();
    const projectB = randomUUID();
    try {
      await sql(`
      INSERT INTO "User" (id, email, username) VALUES ('${ownerId}', '${ownerId}@example.com', '${ownerId}');
      INSERT INTO "Workspace" (id, name, "userId") VALUES ('${workspaceId}', 'Concurrency test', '${ownerId}');
      INSERT INTO "Project" (id, title, domain, "userId", "workspaceId") VALUES
        ('${projectA}', 'A', '${projectA}', '${ownerId}', '${workspaceId}'),
        ('${projectB}', 'B', '${projectB}', '${ownerId}', '${workspaceId}');
      INSERT INTO "Build" (id, "projectId", pages) VALUES
        ('${projectA}', '${projectA}', '{}'), ('${projectB}', '${projectB}', '{}');
    `);
      const results = await Promise.allSettled(
        [projectA, projectB].map((projectId) =>
          sql(`
      BEGIN;
      SELECT create_production_build('${projectId}', '{}', 1, '${ownerId}');
      SELECT pg_sleep(0.25);
      COMMIT;
    `)
        )
      );
      assert.equal(
        results.filter((result) => result.status === "fulfilled").length,
        1
      );
      const rejected = results.find((result) => result.status === "rejected");
      assert.match(rejected.reason.stderr, /daily publishing limit of 1/);
      assert.equal(
        await sql(`SELECT get_workspace_publish_usage('${projectA}')`),
        "1"
      );
      assert.equal(
        await sql(
          `SELECT count(*) FROM "Build" WHERE "projectId" IN ('${projectA}', '${projectB}') AND deployment IS NOT NULL`
        ),
        "1"
      );
    } finally {
      await sql(`
      DELETE FROM "Build" WHERE "projectId" IN ('${projectA}', '${projectB}');
      DELETE FROM "Project" WHERE id IN ('${projectA}', '${projectB}');
      DELETE FROM "Workspace" WHERE id = '${workspaceId}';
      DELETE FROM "User" WHERE id = '${ownerId}';
      DELETE FROM "WorkspacePublishUsage" WHERE "scopeId" = 'workspace:${workspaceId}';
    `);
    }
  }
);
