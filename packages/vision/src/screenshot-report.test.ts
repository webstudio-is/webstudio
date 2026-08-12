import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { parse, type DefaultTreeAdapterTypes as Html } from "parse5";
import { expect, test } from "vitest";
import {
  classifyScreenshotComparisonReport,
  openScreenshotComparisonReport,
  writeScreenshotComparisonReport,
  type ScreenshotComparisonReport,
} from "./screenshot-report";

test("reports when the platform cannot open the visual report", async () => {
  const originalPath = process.env.PATH;
  process.env.PATH = "";
  try {
    await expect(
      openScreenshotComparisonReport("/tmp/visual-report/index.html")
    ).rejects.toMatchObject({ code: "ENOENT" });
  } finally {
    if (originalPath === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = originalPath;
    }
  }
});

const createReport = (
  status: ScreenshotComparisonReport["comparisons"][number]["status"]
): ScreenshotComparisonReport => ({
  baselineLabel: "base",
  currentLabel: "current",
  durationMs: 100,
  comparisons: [{ id: "button", title: "Button", name: "Primary", status }],
  errors: [],
});

test("classifies visual differences separately from comparison failures", () => {
  expect(classifyScreenshotComparisonReport(createReport("unchanged"))).toBe(
    "passed"
  );
  expect(classifyScreenshotComparisonReport(createReport("changed"))).toBe(
    "differences"
  );
  expect(classifyScreenshotComparisonReport(createReport("added"))).toBe(
    "differences"
  );
  expect(classifyScreenshotComparisonReport(createReport("removed"))).toBe(
    "differences"
  );
  expect(classifyScreenshotComparisonReport(createReport("error"))).toBe(
    "failure"
  );
  expect(
    classifyScreenshotComparisonReport({
      ...createReport("unchanged"),
      errors: ["Browser crashed"],
    })
  ).toBe("failure");
  expect(
    classifyScreenshotComparisonReport({
      ...createReport("unchanged"),
      comparisons: [],
    })
  ).toBe("failure");
});

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
  const sourceImage = path.join(root, "captures", "baseline.png");
  try {
    await mkdir(path.dirname(sourceImage), { recursive: true });
    await writeFile(sourceImage, "baseline image");
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
            baselinePath: sourceImage,
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
      "assets/comparisons/0/baseline.png"
    );
    expect(
      await readFile(
        path.join(reportDirectory, json.comparisons[0].baselinePath),
        "utf8"
      )
    ).toEqual("baseline image");
    expect(json.comparisons[0].currentPath).toBeUndefined();
    expect(json.comparisons[0].diffPath).toBeUndefined();

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

test("writes a report from bundled code", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "visual-report-bundle-"));
  const output = path.join(root, "screenshot-report.mjs");
  const reportDirectory = path.join(root, "report");
  try {
    await build({
      entryPoints: [
        fileURLToPath(new URL("./screenshot-report.ts", import.meta.url)),
      ],
      outfile: output,
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
    });
    const bundledModule = await import(pathToFileURL(output).href);
    await bundledModule.writeScreenshotComparisonReport({
      reportDirectory,
      report: {
        baselineLabel: "baseline",
        currentLabel: "current",
        durationMs: 0,
        comparisons: [],
        errors: [],
      },
    });
    await readFile(path.join(reportDirectory, "index.html"), "utf8");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
