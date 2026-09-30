import { execFile } from "node:child_process";
import { cp, mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
let temporaryDirectory: string | undefined;

afterEach(async () => {
  if (temporaryDirectory !== undefined) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

test("packs declarations for every public entrypoint", async () => {
  // Stage inside the package so its normal workspace dependencies resolve.
  temporaryDirectory = await mkdtemp(join(packageDirectory, ".package-test-"));
  const stagingDirectory = join(temporaryDirectory, "staging");
  await mkdir(stagingDirectory);
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
}, 30_000);
