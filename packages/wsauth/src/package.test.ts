import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { cp, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, test } from "vitest";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const workspaceDirectory = fileURLToPath(new URL("../../..", import.meta.url));
const tsc = join(workspaceDirectory, "node_modules/.bin/tsc");
const packageBinDirectory = join(workspaceDirectory, "node_modules/.bin");
let temporaryDirectory: string | undefined;

afterEach(async () => {
  if (temporaryDirectory !== undefined) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

test("publishes type declarations for every public entrypoint", async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), "webstudio-wsauth-pack-"));
  const packDirectory = join(temporaryDirectory, "pack");
  const stagingDirectory = join(temporaryDirectory, "staging");
  const projectDirectory = join(temporaryDirectory, "project");
  await Promise.all([
    mkdir(packDirectory, { recursive: true }),
    mkdir(stagingDirectory, { recursive: true }),
    mkdir(projectDirectory, { recursive: true }),
  ]);
  await Promise.all([
    ...[
      "package.json",
      "README.md",
      "src",
      "tsconfig.json",
      "tsconfig.dts.json",
    ].map((entry) =>
      cp(join(packageDirectory, entry), join(stagingDirectory, entry), {
        recursive: true,
      })
    ),
    ...[
      ["zod", dirname(require.resolve("zod/package.json"))],
      ["@types/node", dirname(require.resolve("@types/node/package.json"))],
      [
        "@webstudio-is/tsconfig",
        dirname(require.resolve("@webstudio-is/tsconfig/package.json")),
      ],
      ["undici-types", dirname(require.resolve("undici-types/package.json"))],
    ].map(async ([name, source]) => {
      const destination = join(stagingDirectory, "node_modules", name);
      await mkdir(dirname(destination), { recursive: true });
      await cp(source, destination, { recursive: true });
    }),
  ]);

  const env = {
    ...process.env,
    PATH: `${packageBinDirectory}${delimiter}${process.env.PATH ?? ""}`,
  };
  await execFileAsync("pnpm", ["build"], { cwd: stagingDirectory, env });
  await execFileAsync("pnpm", ["dts"], { cwd: stagingDirectory, env });
  const packed = JSON.parse(
    (
      await execFileAsync(
        "npm",
        ["pack", "--json", "--pack-destination", packDirectory],
        { cwd: stagingDirectory }
      )
    ).stdout
  ) as Array<{ filename: string }>;
  const archive = join(packDirectory, packed[0]?.filename ?? "");
  await writeFile(
    join(projectDirectory, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies: {
        "@webstudio-is/wsauth": `file:${archive}`,
        zod: `file:${dirname(require.resolve("zod/package.json"))}`,
      },
    }),
    "utf8"
  );
  await execFileAsync(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-package-lock",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: projectDirectory }
  );
  await writeFile(
    join(projectDirectory, "index.ts"),
    `import type { WsAuthResources } from "@webstudio-is/wsauth";
import type { WsAuthConfig } from "@webstudio-is/wsauth/schema";

const routes: WsAuthResources["routes"] = [];
const config: WsAuthConfig = { version: 1, routes: {} };
void [routes, config];
`,
    "utf8"
  );

  await execFileAsync(
    tsc,
    [
      "--ignoreConfig",
      "--noEmit",
      "--strict",
      "--moduleResolution",
      "bundler",
      "--module",
      "esnext",
      "--target",
      "es2022",
      "index.ts",
    ],
    { cwd: projectDirectory }
  );
}, 30_000);
