# MCP Vision Verification

## Generated App Dependency Notes

- For a fresh checkout, copied fixture, or newly generated app, run npm install or pnpm install in the generated project before preview.start or webstudio preview.
- If preview fails with a missing generated-app command/package such as react-router or vite, install the generated app dependencies and retry.

## Visual Verification Rule

For visual/design work, use preview.start and screenshot after generated project files are current and generated app dependencies are installed so vision can inspect the rendered result before finishing. When a baseline exists, use screenshot.diff to get pixel regions, OCR text changes, and diff PNG artifacts.

## Vision Verification Loop

- Make focused page/content/style changes with semantic MCP tools.
- Make sure generated project files are current and generated app dependencies are installed, then call preview.start once to keep the generated site running.
- {{dependency-notes}}
- For responsive work, call list-breakpoints first, then capture screenshots at viewport widths based on the Builder breakpoints plus a narrow mobile and desktop width.
- Call screenshot with { path: "/" } or the changed page path and viewport such as { width: 375, height: 812 } and { width: 1440, height: 900 }. Use waitForSelector when the page has a reliable ready marker, waitUntil:"networkidle" for network-heavy pages, and waitForTimeout only for final visual settling.
- {{diff}} When a baseline PNG exists, call screenshot.diff with baselinePath, currentPath, and outputDir.
- {{diff}} Read screenshot.diff textAnalysis: it reports OCR status plus text that appeared, disappeared, moved, changed content, or changed font/style geometry. If OCR is unavailable, ask the user for permission to install Tesseract, then call vision.install-ocr with { "confirm": true }, or rely on visual inspection.
- Inspect every viewport PNG and any diff artifacts with vision, then compare layout, OCR text evidence, color, spacing, imagery, and responsive framing against the user intent.
- If the screenshot does not match, apply another focused mutation and repeat screenshot verification.

## Workflow Summary With Diff

For visual/design work, make sure generated project files are current and generated app dependencies are installed, call preview.start, then screenshot({ path, viewport }); for responsive work, use list-breakpoints and capture the changed page at Builder breakpoint widths plus mobile and desktop widths; use screenshot.diff when a baseline exists, then inspect pixel regions, OCR textAnalysis, and PNG/diff artifacts with vision before finishing.

## Workflow Summary Without Diff

For visual/design work, make sure generated project files are current and generated app dependencies are installed, call preview.start, then screenshot({ path, viewport }); for responsive work, use list-breakpoints and capture the changed page at Builder breakpoint widths plus mobile and desktop widths; inspect every PNG with vision before finishing.

## Screenshot Verification Summary

Inside MCP, prefer preview.start plus screenshot({ path: "/", viewport }) after generated project files are current and generated app dependencies are installed, so the preview server stays running for fast repeated checks. For responsive work, read list-breakpoints and capture viewport widths from Builder breakpoint edges plus mobile and desktop widths before using vision. Screenshot waits for load by default, then fonts and two layout frames; pass waitForSelector for app readiness, waitUntil:"networkidle" for network-heavy pages, and waitForTimeout for final settling. When a baseline exists, use screenshot.diff for changed regions, OCR textAnalysis, and diff artifacts. Outside MCP, use webstudio preview and webstudio screenshot <url> --output current.png.

## Screenshot Diff Evidence

- Pixel evidence: total mismatch, changed regions, dominant color/luminance direction, diffPath, and contextDiffPath.
- OCR evidence: textAnalysis.status, provider, and changes for appeared/disappeared/content_changed/moved/font_changed text.
- OCR dependency: screenshot.diff uses the system tesseract binary when available. If missing, it returns ocr_unavailable_tesseract_not_found_or_failed and still returns pixel evidence.
- OCR install: MCP cannot prompt. Ask the user first; if they agree, call vision.install-ocr with { "confirm": true }. If automatic install is unavailable, follow the returned installUrl.
- Final judgment: OCR and pixel diff are evidence. A vision-capable model must still inspect screenshots/diff artifacts and compare the rendered result to user intent.
