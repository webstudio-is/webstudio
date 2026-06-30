# MCP Vision Verification

## Generated App Dependency Notes

- For a fresh checkout, copied fixture, or newly generated app, run npm install or pnpm install in the generated project before preview.start or webstudio preview.
- If preview fails with a missing generated-app command/package such as react-router or vite, install the generated app dependencies and retry.

## Visual Verification Rule

For visual/design work, use preview.start and screenshot after generated project files are current and generated app dependencies are installed so vision can inspect the rendered result before finishing.

## Vision Verification Loop

- Make focused page/content/style changes with semantic MCP tools.
- Make sure generated project files are current and generated app dependencies are installed, then call preview.start once to keep the generated site running.
- {{dependency-notes}}
- Call screenshot with { path: "/" } or the changed page path.
- {{diff}} When a baseline PNG exists, call screenshot.diff with baselinePath, currentPath, and outputDir.
- Inspect the PNG and any diff artifacts with vision, then compare layout, text, color, spacing, imagery, and responsive framing against the user intent.
- If the screenshot does not match, apply another focused mutation and repeat screenshot verification.

## Workflow Summary With Diff

For visual/design work, make sure generated project files are current and generated app dependencies are installed, call preview.start, then screenshot({ path }); use screenshot.diff when a baseline exists, and inspect the PNG/diff artifacts with vision before finishing.

## Workflow Summary Without Diff

For visual/design work, make sure generated project files are current and generated app dependencies are installed, call preview.start, then screenshot({ path }); inspect the PNG with vision before finishing.

## Screenshot Verification Summary

Inside MCP, prefer preview.start plus screenshot({ path: "/" }) after generated project files are current and generated app dependencies are installed, so the preview server stays running for fast repeated checks. When a baseline exists, use screenshot.diff for changed regions and diff artifacts. Outside MCP, use webstudio preview and webstudio screenshot <url> --output current.png.
