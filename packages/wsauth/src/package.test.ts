import { execFile } from "node:child_process";
import { cp, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const workspaceDirectory = fileURLToPath(new URL("../../..", import.meta.url));
let temporaryDirectory: string | undefined;

afterEach(async () => {
  if (temporaryDirectory !== undefined) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

test("packs JavaScript and usable declarations for every public entrypoint", async () => {
  // Stage inside the package so its normal workspace dependencies resolve.
  temporaryDirectory = await mkdtemp(join(packageDirectory, ".package-test-"));
  const stagingDirectory = join(temporaryDirectory, "staging");
  const consumerDirectory = join(temporaryDirectory, "consumer");
  await Promise.all([
    mkdir(stagingDirectory),
    mkdir(join(consumerDirectory, "node_modules", "@webstudio-is"), {
      recursive: true,
    }),
  ]);
  await Promise.all(
    [
      "package.json",
      "README.md",
      "src",
      "tsconfig.json",
      "tsconfig.dts.json",
    ].map((entry) =>
      cp(join(packageDirectory, entry), join(stagingDirectory, entry), {
        recursive: true,
      })
    )
  );

  await execFileAsync("pnpm", ["build"], { cwd: stagingDirectory });
  await execFileAsync("pnpm", ["dts"], { cwd: stagingDirectory });

  const packed = JSON.parse(
    (
      await execFileAsync("npm", ["pack", "--dry-run", "--json"], {
        cwd: stagingDirectory,
      })
    ).stdout
  ) as Array<{ files: Array<{ path: string }> }>;
  const packedFiles = packed[0]?.files.map((file) => file.path);
  expect(packedFiles).toEqual(
    expect.arrayContaining([
      "lib/index.js",
      "lib/schema.js",
      "lib/types/index.d.ts",
      "lib/types/schema.d.ts",
    ])
  );

  // Check the same public imports that a separate TypeScript project uses.
  await symlink(
    stagingDirectory,
    join(consumerDirectory, "node_modules", "@webstudio-is", "wsauth"),
    "dir"
  );
  await writeFile(
    join(consumerDirectory, "index.ts"),
    `import { matchPathnamePattern, validatePathnamePattern } from "@webstudio-is/wsauth";
import type { WsAuthResources } from "@webstudio-is/wsauth";
import type { WsAuthConfig } from "@webstudio-is/wsauth/schema";

const routes: WsAuthResources["routes"] = [];
const config: WsAuthConfig = { version: 1, routes: {} };
const params: Record<string, string | undefined> | undefined = matchPathnamePattern("/*", "/docs");
const routeError: string | undefined = validatePathnamePattern("/docs/*");
void [routes, config, params, routeError];
`
  );
  await execFileAsync(
    join(workspaceDirectory, "node_modules/.bin/tsc"),
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
    { cwd: consumerDirectory }
  );
}, 30_000);
