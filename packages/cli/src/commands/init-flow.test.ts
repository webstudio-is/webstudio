import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initFlow } from "./init-flow";

const originalCwd = process.cwd();
let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "webstudio-init-"));
  process.chdir(tempDir);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(tempDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

test("initializes credentials from share link", async () => {
  const projectId = "11111111-1111-4111-8111-111111111111";
  const saveShareLink = vi.fn().mockResolvedValue({
    origin: "https://example.com",
    projectId,
  });

  await initFlow(
    {
      assets: true,
      json: true,
      link: `https://p-${projectId}-dot-example.com/?authToken=token-1`,
      template: [],
    },
    { saveShareLink }
  );

  expect(saveShareLink).toHaveBeenCalledWith(
    `https://p-${projectId}-dot-example.com/?authToken=token-1`
  );
  const output = JSON.parse(vi.mocked(console.info).mock.calls[0][0]);
  expect(output).toEqual({
    ok: true,
    data: { projectId },
    meta: {
      command: "init",
      projectId,
      durationMs: expect.any(Number),
    },
  });
});
