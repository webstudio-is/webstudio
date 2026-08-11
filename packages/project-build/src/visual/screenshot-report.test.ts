import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse, type DefaultTreeAdapterTypes as Html } from "parse5";
import { expect, test } from "vitest";
import { writeScreenshotComparisonReport } from "./screenshot-report";

const findElement = (
  node: Html.Node,
  predicate: (element: Html.Element) => boolean
): Html.Element | undefined => {
  if ("tagName" in node && predicate(node)) {
    return node;
  }
  if ("childNodes" in node) {
    for (const child of node.childNodes) {
      const found = findElement(child, predicate);
      if (found !== undefined) {
        return found;
      }
    }
  }
};

test("writes portable JSON data for the static visual report", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "visual-report-"));
  const reportDirectory = path.join(root, "report");
  const assetDirectory = path.join(reportDirectory, "assets", "button");
  try {
    await writeScreenshotComparisonReport({
      reportDirectory,
      report: {
        baselineLabel: "baseline",
        currentLabel: "current",
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
    expect(json.comparisons[0].baselinePath).toEqual(
      "assets/button/baseline.png"
    );
    expect(json.comparisons[0].currentPath).toEqual(
      "assets/button/current.png"
    );
    expect(json.comparisons[0].diffPath).toEqual(
      "assets/button/current-diff.png"
    );

    const html = await readFile(
      path.join(reportDirectory, "index.html"),
      "utf8"
    );
    const document = parse(html);
    const data = findElement(
      document,
      (element) =>
        element.tagName === "script" &&
        element.attrs.some(
          ({ name, value }) => name === "id" && value === "visual-report-data"
        )
    );
    expect(data).not.toBeUndefined();
    const embeddedReport = JSON.parse(
      data?.childNodes
        .filter((node): node is Html.TextNode => node.nodeName === "#text")
        .map((node) => node.value)
        .join("") ?? ""
    );
    expect(embeddedReport).toEqual(json);
    expect(html.includes("</script><script>unsafe()")).toEqual(false);
    await Promise.all([
      readFile(path.join(reportDirectory, "report.css"), "utf8"),
      readFile(path.join(reportDirectory, "report.js"), "utf8"),
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
