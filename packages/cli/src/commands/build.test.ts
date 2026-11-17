import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { build } from "./build";

const originalCwd = process.cwd();
const directories: string[] = [];

const useSyncedProject = async () => {
  const directory = await mkdtemp(join(tmpdir(), "webstudio-build-command-"));
  directories.push(directory);
  process.chdir(directory);
  await mkdir(".webstudio");
  await writeFile(".webstudio/data.json", "{}");
};

afterEach(async () => {
  vi.restoreAllMocks();
  process.chdir(originalCwd);
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

test("syncs before building and expands published static templates", async () => {
  await useSyncedProject();
  const order: string[] = [];
  const sync = vi.fn(async () => {
    order.push("sync");
    return ["ssg-netlify" as const];
  });
  const prebuild = vi.fn(async () => {
    order.push("build");
  });

  await build(
    {
      assets: true,
      template: [],
      buildId: "build-1",
      origin: "https://example.com",
      authToken: "token",
    },
    { sync, prebuild }
  );

  expect(order).toEqual(["sync", "build"]);
  expect(sync).toHaveBeenCalledWith({
    assets: true,
    template: [],
    buildId: "build-1",
    origin: "https://example.com",
    authToken: "token",
  });
  expect(prebuild).toHaveBeenCalledWith(
    expect.objectContaining({ template: ["ssg", "ssg-netlify"] })
  );
});

test("keeps explicit templates for hosted publishing", async () => {
  await useSyncedProject();
  const sync = vi.fn(async () => ["ssg" as const]);
  const prebuild = vi.fn(async () => undefined);

  await build(
    { assets: false, template: ["internal", "cloudflare"], buildId: "build-1" },
    { sync, prebuild }
  );

  expect(prebuild).toHaveBeenCalledWith(
    expect.objectContaining({ template: ["internal", "cloudflare"] })
  );
});

test("does not build if sync fails", async () => {
  const failure = new Error("sync failed");
  const sync = vi.fn(async (): Promise<undefined> => {
    throw failure;
  });
  const prebuild = vi.fn(async () => undefined);

  await expect(
    build(
      { assets: true, template: ["ssg"], buildId: "build-1" },
      { sync, prebuild }
    )
  ).rejects.toBe(failure);
  expect(prebuild).not.toHaveBeenCalled();
});

test("passes missing hosted templates to existing build validation", async () => {
  await useSyncedProject();
  const sync = vi.fn(async () => undefined);
  const prebuild = vi.fn(async ({ template }: { template: string[] }) => {
    if (template.length === 0) {
      throw new Error("missing template");
    }
  });

  await expect(
    build(
      { assets: true, template: [], buildId: "build-1" },
      { sync, prebuild }
    )
  ).rejects.toThrow("missing template");
  expect(sync).toHaveBeenCalledOnce();
  expect(prebuild).toHaveBeenCalledWith(
    expect.objectContaining({ template: [] })
  );
});

test("builds an already synced project without fetching it again", async () => {
  await useSyncedProject();
  const sync = vi.fn(async () => undefined);
  const prebuild = vi.fn(async () => undefined);

  await build(
    { assets: false, template: ["react-router"] },
    { sync, prebuild }
  );

  expect(sync).not.toHaveBeenCalled();
  expect(prebuild).toHaveBeenCalledWith(
    expect.objectContaining({ template: ["react-router"] })
  );
});
