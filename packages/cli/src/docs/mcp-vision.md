# MCP Vision Verification

## Generated App Dependency Notes

- `preview.start` and `webstudio preview` isolate generated app dependencies under `.webstudio/preview` by linking to the CLI package dependency tree.
- Do not add generated-preview dependencies to the repository root `package.json` or `pnpm-lock.yaml`.
- If preview fails with a missing generated-app command/package such as react-router, react-router-serve, or vite, install dependencies for the CLI package and retry.

## Visual Verification Rule

For visual/design work, use preview.start and screenshot after generated project files are current so vision can inspect the rendered result before finishing. `preview.start` is long-lived and cannot be used through one-shot `mcp single-op-call`; from a shell, use `webstudio mcp run` for preview.start/screenshot/preview.stop in one shared process, or use a long-running MCP server. When a baseline exists, use screenshot.diff to get pixel regions, OCR text changes, and diff PNG artifacts.

## Vision Verification Loop

- Make focused page/content/style changes with semantic MCP tools.
- Make sure generated project files are current, then call preview.start to build the app and keep the production-like generated site running. In shell-driven workflows, run preview.start, screenshot, and preview.stop inside one `webstudio mcp run` call so they share the same preview owner.
- {{dependency-notes}}
- After MCP mutations, path-based screenshots regenerate/restart preview as needed before capture; when preview is fresh in the same long-running MCP server, repeated path screenshots reuse the running server. From one-shot shell calls or another process, pass `baseUrl` with `path` to capture an already-running preview without starting or restarting it. Use preview.stop only in the same long-running MCP server or `webstudio mcp run` process that started preview; a separate one-shot `single-op-call` process does not own another process's preview controller.
- For multi-page work, capture each changed page by path through the same preview server, for example screenshot({ path: "/" }), screenshot({ path: "/pricing" }), and screenshot({ path: "/about" }). The screenshot tool navigates directly to the requested route; no browser click navigation is required.
- For responsive work, call list-breakpoints first, then capture screenshots at viewport widths based on the Builder breakpoints plus a narrow mobile and desktop width.
- Call screenshot with { path: "/" } or the changed page path and viewport such as { width: 375, height: 812 } and { width: 1440, height: 900 }. For an existing preview in another process, call screenshot with { baseUrl: "http://127.0.0.1:5177", path: "/" }. Use waitForSelector when the page has a reliable ready marker, waitUntil:"networkidle" for network-heavy pages, and waitForTimeout only for final visual settling.
- {{diff}} When a baseline PNG exists, call screenshot.diff with baselinePath, currentPath, and outputDir for each page/viewport pair.
- {{diff}} Read screenshot.diff textAnalysis: it reports OCR status plus text that appeared, disappeared, moved, changed content, or changed font/style geometry. If OCR is unavailable, ask the user for permission to install Tesseract, then call vision.install-ocr with { "confirm": true }, or rely on visual inspection.
- Inspect every viewport PNG and any diff artifacts with vision, then compare layout, OCR text evidence, color, spacing, imagery, and responsive framing against the user intent.
- If the screenshot does not match, apply another focused mutation and repeat screenshot verification.

## Workflow Summary With Diff

For visual/design work, make sure generated project files are current, call preview.start to build and start the production-like preview server, then screenshot({ path, viewport }) for every changed page path; for responsive work, use list-breakpoints and capture each changed page at Builder breakpoint widths plus mobile and desktop widths; use screenshot.diff on each baseline/current page or viewport pair when a baseline exists, then inspect pixel regions, OCR textAnalysis, and PNG/diff artifacts with vision before finishing.

## Workflow Summary Without Diff

For visual/design work, make sure generated project files are current, call preview.start to build and start the production-like preview server, then screenshot({ path, viewport }) for every changed page path; for responsive work, use list-breakpoints and capture each changed page at Builder breakpoint widths plus mobile and desktop widths; inspect every PNG with vision before finishing.

## Screenshot Verification Summary

Inside a long-running MCP server, prefer preview.start plus screenshot({ path, viewport }) after generated project files are current, so a fresh production-like preview server is available for fast repeated checks across multiple pages. After MCP mutations, path screenshots restart preview as needed before capture; when preview is fresh in that same MCP server, repeated path screenshots reuse the running server. From one-shot shell calls or another process, use screenshot({ baseUrl, path, viewport }) to capture an already-running preview/site without generating, building, starting, or restarting preview. Use path values such as "/", "/pricing", or "/about" to capture specific generated routes. For responsive work, read list-breakpoints and capture viewport widths from Builder breakpoint edges plus mobile and desktop widths before using vision. Screenshot waits for load by default, then fonts and two layout frames; pass waitForSelector for app readiness, waitUntil:"networkidle" for network-heavy pages, and waitForTimeout for final settling. When a baseline exists, use screenshot.diff for changed regions, OCR textAnalysis, and diff artifacts on each baseline/current screenshot pair. Outside MCP, use webstudio preview and webstudio screenshot <url> --output current.png.

## Screenshot Diff Evidence

- Pixel evidence: total mismatch, changed regions, dominant color/luminance direction, diffPath, and contextDiffPath.
- OCR evidence: textAnalysis.status, provider, and changes for appeared/disappeared/content_changed/moved/font_changed text.
- OCR dependency: screenshot.diff uses the system tesseract binary when available. If missing, it returns ocr_unavailable_tesseract_not_found_or_failed and still returns pixel evidence.
- OCR install: MCP cannot prompt. Ask the user first; if they agree, call vision.install-ocr with { "confirm": true }. If automatic install is unavailable, follow the returned installUrl.
- Final judgment: OCR and pixel diff are evidence. A vision-capable model must still inspect screenshots/diff artifacts and compare the rendered result to user intent.
