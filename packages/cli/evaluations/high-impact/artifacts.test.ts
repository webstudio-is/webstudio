import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { collectHighImpactArtifacts } from "./artifacts";

test("collects bounded screenshot and rendered-audit evidence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "high-impact-artifacts-"));
  try {
    const screenshots = join(directory, "screenshots");
    const audits = join(directory, ".webstudio", "audits");
    await Promise.all([
      mkdir(screenshots, { recursive: true }),
      mkdir(audits, { recursive: true }),
    ]);
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
    png.writeUInt32BE(1440, 16);
    png.writeUInt32BE(900, 20);
    await Promise.all([
      writeFile(join(screenshots, "desktop.png"), png),
      writeFile(
        join(audits, "rendered-project-1.json"),
        JSON.stringify({ checks: [{}], failures: [] })
      ),
      writeFile(
        join(audits, "rendered-project-2.json"),
        JSON.stringify({ checks: [], failures: [{ code: "FAILED" }] })
      ),
    ]);

    expect(await collectHighImpactArtifacts(directory)).toEqual([
      {
        kind: "screenshot",
        path: "screenshots/desktop.png",
        viewport: { width: 1440, height: 900 },
        passed: true,
      },
      {
        kind: "audit",
        path: ".webstudio/audits/rendered-project-1.json",
        passed: true,
      },
      {
        kind: "audit",
        path: ".webstudio/audits/rendered-project-2.json",
        passed: false,
      },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
