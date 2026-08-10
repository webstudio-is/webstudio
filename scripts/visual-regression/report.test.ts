import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { writeVisualReport } from "./report";

test("writes a portable JSON report and a visual HTML comparison", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "visual-report-"));
  const reportDirectory = path.join(root, "report");
  const assetDirectory = path.join(reportDirectory, "assets", "button");
  try {
    await writeVisualReport({
      reportDirectory,
      report: {
        baselineCommit: "baseline",
        currentCommit: "current",
        durationMs: 1200,
        errors: [],
        comparisons: [
          {
            id: "button",
            title: "Design system/Button",
            name: "Primary",
            status: "changed",
            baselinePath: path.join(assetDirectory, "baseline.png"),
            currentPath: path.join(assetDirectory, "current.png"),
            diffPath: path.join(assetDirectory, "current-diff.png"),
            differentPixels: 12,
            mismatchPercentage: 0.01,
          },
        ],
      },
    });

    const json = JSON.parse(
      await readFile(path.join(reportDirectory, "report.json"), "utf8")
    );
    assert.equal(
      json.comparisons[0].baselinePath,
      "assets/button/baseline.png"
    );
    assert.equal(json.comparisons[0].currentPath, "assets/button/current.png");
    assert.equal(
      json.comparisons[0].diffPath,
      "assets/button/current-diff.png"
    );

    const html = await readFile(
      path.join(reportDirectory, "index.html"),
      "utf8"
    );
    assert.match(html, /<figcaption>Baseline<\/figcaption>/);
    assert.match(html, /<figcaption>Current<\/figcaption>/);
    assert.match(html, /<figcaption>Diff<\/figcaption>/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
