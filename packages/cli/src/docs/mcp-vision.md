# MCP Vision Verification

## Generated App Dependency Notes

- `preview.start` and `webstudio preview` install generated app dependencies under `.webstudio/preview` and reuse them across regenerations.
- Do not add generated-preview dependencies to the repository root `package.json` or `pnpm-lock.yaml`.
- If dependency installation fails, check npm and network configuration, then reinstall or update the Webstudio CLI if the problem persists.

## Visual Verification Rule

For visual/design work, use preview.start and screenshot after generated project files are current so vision can inspect the rendered result before finishing. `preview.start` is long-lived and cannot be used through one-shot `mcp single-op-call`; from a shell, use `webstudio mcp run` for preview.start/screenshot/preview.stop in one shared process, or use a long-running MCP server. When a baseline exists, use screenshot.diff to get pixel regions, OCR text changes, and diff PNG artifacts.

An authenticated project share URL is used with `webstudio init --link`; it is
not a generated-site preview URL. Project screenshots and rendered audits use
the generated local preview owned by the current CLI/MCP process. Do not pass a
Builder URL containing `authToken` and `mode` to `screenshot`; use `path` after
starting preview, or use `baseUrl` only for an intentional generated site that
is already running.

## Vision Verification Loop

- Make focused page/content/style changes with semantic MCP tools.
- Make sure generated project files are current, then call preview.start to build the app and keep the production-like generated site running. In shell-driven workflows, run preview.start, screenshot, and preview.stop inside one `webstudio mcp run` call so they share the same preview owner.
- {{dependency-notes}}
- After MCP mutations, path-based screenshots regenerate/restart preview as needed before capture; when preview is fresh in the same long-running MCP server, repeated path screenshots reuse the running server. From one-shot shell calls or another process, pass `baseUrl` with `path` to capture an already-running preview without starting or restarting it. Use preview.stop only in the same long-running MCP server or `webstudio mcp run` process that started preview; a separate one-shot `single-op-call` process does not own another process's preview controller.
- For multi-page work, capture each changed page by path through the same preview server, for example screenshot({ path: "/" }), screenshot({ path: "/pricing" }), and screenshot({ path: "/about" }). The screenshot tool navigates directly to the requested route; no browser click navigation is required.
- For responsive work, call list-breakpoints first, then capture screenshots at viewport widths based on the Builder breakpoints plus a narrow mobile and desktop width.
- Call screenshot with { path: "/" } or the changed page path and viewport such as { width: 375, height: 812 } and { width: 1440, height: 900 }. For an existing preview in another process, call screenshot with { baseUrl: "http://127.0.0.1:5177", path: "/" }. Use waitForSelector when the page has a reliable ready marker, waitUntil:"networkidle" for network-heavy pages, and waitForTimeout only for final visual settling.
- {{diff}} When a baseline PNG exists, call screenshot.diff with baselinePath, currentPath, and outputDir for each page/viewport pair. Add expectedText when a specific visible phrase must be present; its assertions report pass/fail plus found and missing text. Add expectedVisual to set pass/fail limits for mismatch percentage, the number of changed regions, or an overall dominant color/brightness direction.
- {{diff}} Read screenshot.diff textAnalysis: it reports OCR status plus text that appeared, disappeared, moved, changed content, or changed font/style geometry. If OCR is unavailable, expectedText assertions fail and textAnalysis reports why; ask the user for permission to install Tesseract, then call vision.install-ocr with { "confirm": true }, or rely on visual inspection.
- Inspect every viewport PNG and any diff artifacts with vision, then compare layout, OCR text evidence, color, spacing, imagery, and responsive framing against the user intent.
- If the screenshot does not match, apply another focused mutation and repeat screenshot verification.

## Workflow Summary With Diff

For visual/design work, make sure generated project files are current, call preview.start to build and start the production-like preview server, then screenshot({ path, viewport }) for every changed page path; for responsive work, use list-breakpoints and capture each changed page at Builder breakpoint widths plus mobile and desktop widths; use screenshot.diff on each baseline/current page or viewport pair when a baseline exists, then inspect pixel regions, OCR textAnalysis, and PNG/diff artifacts with vision before finishing.

## Workflow Summary Without Diff

For visual/design work, make sure generated project files are current, call preview.start to build and start the production-like preview server, then screenshot({ path, viewport }) for every changed page path; for responsive work, use list-breakpoints and capture each changed page at Builder breakpoint widths plus mobile and desktop widths; inspect every PNG with vision before finishing.

Each screenshot result includes rendered `layout` metrics when the local browser
provides them. `layout.horizontalOverflow: true` is deterministic evidence that
the rendered document exceeds the requested viewport width. Use vision for
clipping, wrapping, hierarchy, and other judgments that layout dimensions alone
cannot establish.

Pass `includeImageMetrics: true` when an ordinary screenshot needs
`layout.images`; rendered audit enables it automatically. The array includes
each rendered image's Webstudio instance id when available, loading mode,
completion state, natural dimensions, rendered dimensions, and document
position. Rendered audits use this evidence to report broken images, eager
loading below the fold, and sources more than 2x the rendered dimensions in
both axes. Oversized-source results are optimization evidence, not universal
performance conformance.

Pass `includeResourceMetrics: true` when an ordinary screenshot needs sanitized
Resource Timing evidence; rendered audit enables it automatically. Resource
metrics contain only the URL pathname, initiator type, transfer/body sizes,
duration, and browser-provided render-blocking status. Origins and query strings
are omitted. Rendered audits report explicitly blocking resources and legacy
`.ttf`, `.otf`, or `.woff` font files without applying a universal byte-size
budget.

## Screenshot Verification Summary

Inside a long-running MCP server, prefer preview.start plus screenshot({ path, viewport }) after generated project files are current, so a fresh production-like preview server is available for fast repeated checks across multiple pages. After MCP mutations, path screenshots restart preview as needed before capture; when preview is fresh in that same MCP server, repeated path screenshots reuse the running server. From one-shot shell calls or another process, use screenshot({ baseUrl, path, viewport }) to capture an already-running preview/site without generating, building, starting, or restarting preview. Use path values such as "/", "/pricing", or "/about" to capture specific generated routes. For responsive work, read list-breakpoints and capture one familiar device viewport inside each Builder breakpoint range before using vision. Screenshot waits for load by default, then fonts and two layout frames; pass waitForSelector for app readiness, waitUntil:"networkidle" for network-heavy pages, and waitForTimeout for final settling. When a baseline exists, use screenshot.diff for changed regions, OCR textAnalysis, and diff artifacts on each baseline/current screenshot pair. Outside MCP, use `webstudio screenshot --path /pricing --output pricing.png` for one temporary generated preview capture, or keep `webstudio preview` running and pass its absolute URL to `webstudio screenshot` for repeated captures.

## Screenshot Diff Evidence

- Pixel evidence: total mismatch, changed regions, dominant color/luminance direction, diffPath, and contextDiffPath.
- OCR evidence: textAnalysis.status, provider, and changes for appeared/disappeared/content_changed/moved/font_changed text. expectedText adds pass/fail assertions plus found and missing current-screen text. expectedVisual adds pass/fail quantitative checks for mismatch percentage, changed-region count, and the overall dominant color/brightness direction.
- OCR dependency: screenshot.diff uses the system tesseract binary when available. If missing, it returns ocr_unavailable_tesseract_not_found_or_failed and still returns pixel evidence.
- OCR install: MCP cannot prompt. Ask the user first; if they agree, call vision.install-ocr with { "confirm": true }. If automatic install is unavailable, follow the returned installUrl.
- Final judgment: OCR and pixel diff are evidence. A vision-capable model must still inspect screenshots/diff artifacts and compare the rendered result to user intent.
