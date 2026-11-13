import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const backendLibrary = join(import.meta.dirname, "lib.sh");
const temporaryDirectories: string[] = [];

const createRepositoryFixture = async () => {
  const root = await mkdtemp(join(tmpdir(), "webstudio-builder-backend-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "packages/prisma-client/prisma/migrations/initial"), {
    recursive: true,
  });
  await mkdir(join(root, "apps/builder/backend"), { recursive: true });
  await writeFile(
    join(
      root,
      "packages/prisma-client/prisma/migrations/initial/migration.sql"
    ),
    "SELECT 1;"
  );
  await writeFile(join(root, "apps/builder/backend/compose.yaml"), "services:");
  await writeFile(
    join(root, "apps/builder/backend/compose.development.yaml"),
    "services:"
  );
  await writeFile(
    join(root, "apps/builder/backend/compose.test.yaml"),
    "services:"
  );
  return root;
};

const readSchemaFingerprint = async (root: string) => {
  const { stdout } = await execFileAsync(
    "bash",
    [
      "-c",
      'source "$1"; ROOT_DIR="$2"; builder_backend_schema_fingerprint',
      "bash",
      backendLibrary,
      root,
    ],
    { cwd: root }
  );
  return stdout.trim();
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

test("schema fingerprint includes new backend files", async () => {
  const root = await createRepositoryFixture();
  const before = await readSchemaFingerprint(root);

  await writeFile(join(root, "apps/builder/backend/init.sql"), "SELECT 2;");

  expect(await readSchemaFingerprint(root)).not.toBe(before);
});

test("backend modes select safe Compose projects", async () => {
  const root = await createRepositoryFixture();
  const readProjectName = async (mode: "development" | "test") => {
    const { stdout } = await execFileAsync(
      "bash",
      [
        "-c",
        [
          "unset COMPOSE_PROJECT_NAME",
          'source "$1"',
          'ROOT_DIR="$2"',
          'builder_backend_init "$3"',
          'printf "%s" "$COMPOSE_PROJECT_NAME"',
        ].join("; "),
        "bash",
        backendLibrary,
        root,
        mode,
      ],
      { cwd: root }
    );
    return stdout;
  };

  expect(await readProjectName("development")).toBe("builder");
  expect(await readProjectName("test")).toBe("builder-e2e");
});

test("migration bootstrap requires the Builder schema", async () => {
  const root = await createRepositoryFixture();

  await expect(
    execFileAsync(
      "bash",
      [
        "-c",
        [
          'source "$1"',
          'ROOT_DIR="$2"',
          "pnpm() { :; }",
          "builder_backend_schema_exists() { return 1; }",
          "builder_backend_migrate",
        ].join("; "),
        "bash",
        backendLibrary,
        root,
      ],
      { cwd: root }
    )
  ).rejects.toThrow("Migrations completed without creating the Builder schema");
});
