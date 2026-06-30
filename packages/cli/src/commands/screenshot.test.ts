import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, test, vi } from "vitest";
import { screenshot } from "./screenshot";

afterEach(() => {
  vi.restoreAllMocks();
});

test("prints json result with a browser executable path", async () => {
  const folder = await mkdtemp(join(tmpdir(), "webstudio-screenshot-test-"));
  const browserPath = join(folder, "browser");
  await writeFile(browserPath, "#!/bin/sh\nexit 0\n");
  await chmod(browserPath, 0o755);
  vi.spyOn(console, "info").mockImplementation(() => undefined);

  try {
    await screenshot({
      url: "https://example.com",
      output: join(folder, "current.png"),
      width: 800,
      height: 600,
      browser: "auto",
      browserPath,
      json: true,
    });
  } finally {
    await rm(folder, { recursive: true, force: true });
  }

  const output = JSON.parse(vi.mocked(console.info).mock.calls.at(-1)?.[0]);
  expect(output).toEqual({
    ok: true,
    data: {
      output: expect.stringContaining("current.png"),
      browserPath,
      browser: "chrome",
      viewport: { width: 800, height: 600 },
      elapsedMs: expect.any(Number),
      warnings: [],
    },
    meta: { command: "screenshot" },
  });
});
