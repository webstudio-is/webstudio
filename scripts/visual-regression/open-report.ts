import path from "node:path";
import { pathToFileURL } from "node:url";
import { openScreenshotComparisonReport } from "@webstudio-is/vision/report";

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await openScreenshotComparisonReport(
    path.resolve(".visual-regression/report/index.html")
  );
}
