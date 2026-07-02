# Webstudio CLI Manual for LLMs

Use this order. Stop only when a command returns ok:false.

## Always

1. webstudio permissions --json
2. webstudio mcp
3. Read MCP resource webstudio://project/tools.
4. Pick focused MCP read tool.
5. Pick semantic MCP write tool.

::doc-section{field="implementationProcess"}

## LLM Implementation Process

Use this process for user requests that change Webstudio content, layout, styles, assets, pages, redirects, resources, or publishing state:

1. Discover capabilities with `webstudio man llm --json`, `webstudio schema api --json`, and MCP `meta.index` or `webstudio://project/tools`.
2. Inspect current project state with semantic reads such as `list-pages`, `get-page-by-path`, `list-instances`, `inspect-instance`, `get-styles`, `list-assets`, `list-breakpoints`, and `snapshot` only when needed.
3. Mutate the Webstudio project with semantic MCP write tools first. Prefer `append-instance`, `update-text`, `update-props`, `update-styles`, `upload-asset`, `create-page`, and page/project settings tools over raw patches.
4. Use `apply-patch` only when no semantic tool covers the required change, and only after reading the latest snapshot/version.
5. For visual/design work, regenerate or preview the generated app, capture a screenshot, inspect it with vision, and iterate before final response.
6. Report what changed and what verification ran.

::doc-section{field="visualDesignWorkflow"}

## Visual Design Workflow

For requests involving visible HTML/CSS, layout, typography, colors, imagery, responsive behavior, or screenshots:

1. Read editable Webstudio structure first: pages, instances, props, styles, breakpoints, assets, and relevant text.
2. Do not use generated route/component files as the source of truth for editable content.
3. Make edits through Webstudio semantic commands/MCP tools so the result stays editable in Builder and survives the next `webstudio build`.
4. Keep generated project files current, start preview, and capture the changed page with `screenshot`.
5. Use `screenshot.diff` when a baseline exists and inspect screenshot/diff artifacts with vision before finishing.
6. If vision or screenshot tooling is unavailable, state that explicitly and explain what fallback verification was used.

::doc-section{field="responsiveVerification"}

## Responsive Verification Workflow

For responsive page work, use Builder breakpoints as the source of truth:

1. Read breakpoints with `list-breakpoints` before deciding responsive behavior.
2. Apply responsive styles with existing Builder breakpoint ids; do not invent CSS media queries or breakpoint names when Webstudio breakpoint data exists.
3. Pick screenshot viewport widths from the project breakpoints: include a desktop width, each defined max-width or min-width edge, and a narrow mobile width.
4. Capture each viewport with `screenshot`, for example `{"path":"/","output":"home-375.png","viewport":{"width":375,"height":812}}` and `{"path":"/","output":"home-1440.png","viewport":{"width":1440,"height":900}}`.
5. Inspect every viewport screenshot with vision before finishing, checking layout, overflow, hidden content, text wrapping, and breakpoint-specific style changes.
6. If any viewport fails, update styles through semantic Webstudio tools and repeat screenshots for the affected breakpoints.

::doc-section{field="generatedFileGuardrails"}

## Generated Files Guardrails

- Do not edit `app/__generated__`, generated route files, generated page files, generated CSS, or build output for normal Webstudio content/design requests.
- Do not replace generated page components with handcrafted app code unless the user explicitly asks for code-only export customization.
- Generated files are build artifacts and may be overwritten by `webstudio build`.
- If a task truly requires generated app customization, keep it outside `app/__generated__` where possible and explain that it is not editable Webstudio content.

## Pick Read Command

{{readFirst}}

## Pick Write Command

{{taskRecipeIndex}}

## Raw Patch Only If Needed

1. Use MCP tool: snapshot.
2. Write BuildPatchTransaction[].
3. Use MCP tool: apply-patch.

## MCP Argument Examples

MCP tools receive JSON argument objects, not CLI flags. Use these shapes:

{{mcpArgumentExampleIndex}}

::doc-section{field="rules"}

## Rules

- Never guess ids for existing records. Read them first.
- Never use project ids from user input. Commands use the configured project.
- Use --refresh before a local-capable command when cached data may be stale.
- Pass --json only to commands whose help/schema documents it. Do not add --json to top-level commands such as sync unless supported.
- On VERSION_CONFLICT, read MCP snapshot again, regenerate the patch, then retry.
- Treat stdout JSON as the API contract and stderr as diagnostics.
- For visual/design work, verify the rendered result with vision before finishing.
- Do not edit generated files for normal Webstudio content/design requests.
- Confirm destructive commands with --confirm only when user requested deletion/unpublish/replacement.
- Use webstudio schema api --json for machine-readable command metadata.

## Known Gaps

{{knownCliGapIndex}}
