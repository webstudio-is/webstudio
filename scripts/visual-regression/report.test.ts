import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { writeVisualReport } from "./report";

test("writes portable JSON data for the static visual report", async () => {
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
            title: "Design system/Button </script><script>unsafe()</script>",
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
    const dataStart =
      '<script id="visual-report-data" type="application/json">';
    const start = html.indexOf(dataStart);
    const end = html.indexOf("</script>", start + dataStart.length);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    const embeddedReport = JSON.parse(
      html.slice(start + dataStart.length, end)
    );
    assert.deepEqual(embeddedReport, json);
    assert.equal(html.includes("</script><script>unsafe()"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
