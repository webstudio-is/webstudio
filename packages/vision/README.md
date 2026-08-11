# Vision

`@webstudio-is/vision` provides source-agnostic browser capture, screenshot
comparison, OCR analysis, caching primitives, and portable visual reports.

Import the smallest relevant entry point:

```ts
import { createBrowserScreenshotSession } from "@webstudio-is/vision/browser";
import { captureVisualEntries } from "@webstudio-is/vision/capture";
import { diffPngFiles } from "@webstudio-is/vision/diff";
import { writeScreenshotComparisonReport } from "@webstudio-is/vision/report";
```

Consumers own their source-specific orchestration. The visual regression
runner, for example, handles Git revisions and Storybook CSF rendering while
this package handles capture batches, image comparison, and reports.
