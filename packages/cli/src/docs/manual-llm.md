# Webstudio CLI Manual for LLMs

Use this order. Stop only when a command returns ok:false.

## Always

1. webstudio permissions --json
2. For bounded shell workflows, call MCP tools directly through the CLI shortcut, for example `webstudio meta.index` or `webstudio insert-fragment '<json>' --dry-run`. The explicit form `webstudio mcp single-op-call <tool> '<json>'` is equivalent and useful when you need to make the MCP boundary obvious. Use `webstudio mcp run '[{"tool":"components.find","input":{"brief":"button"}}]'` for multiple calls in one shared CLI session. Use a normal JSON file path for large batches. Use long-running `webstudio mcp` only when your environment is a real MCP client. Do not manually send raw JSON-RPC to `webstudio mcp` from a shell or PTY.
3. Read MCP `meta.index`, for example `webstudio meta.index`.
4. Use focused MCP calls with concrete JSON: `webstudio meta.guide '{"brief":"Create a design system page using every component"}'`, `webstudio meta.get_more_tools '{"tools":["insert-fragment"]}'`, `webstudio components.list '{"source":"all"}'`, `webstudio components.coverage-plan`, `webstudio components.search '{"brief":"radix select"}'`, `webstudio components.get '{"component":"@webstudio-is/sdk-components-react-radix:Select"}'`, `webstudio templates.list`, and `webstudio templates.get '{"component":"@webstudio-is/sdk-components-react-radix:Select"}'`.
5. Read overview resources `webstudio://project/tools-overview` or `webstudio://project/components-overview` when useful. Read full resources `webstudio://project/tools` or `webstudio://project/components` only when focused tools are insufficient.
6. Pick focused MCP read tool.
7. Pick semantic MCP write tool.

Use `webstudio schema mcp` for a tiny MCP tool overview. Use `webstudio schema mcp --detail summary` for all tool descriptions, and `webstudio schema mcp --detail full` only when exact input schemas for all tools are truly needed; otherwise prefer focused `meta.get_more_tools` and `components.*` calls.

Run these commands from the linked project root. Use the MCP startup status line's absolute root for local files; write temporary scripts and artifacts under `<project root>/.temp`, not under a parent workspace.

When developing inside the Webstudio monorepo, run the local CLI exactly as `node packages/cli/local.js ...` from the repo root. Do not use `pnpm exec webstudio`, `pnpm --filter webstudio exec webstudio`, or a global `webstudio`: they can resolve an older binary.

Monorepo quick path for a simple styled section:

```sh
node packages/cli/local.js mcp single-op-call meta.index
node packages/cli/local.js mcp single-op-call meta.get_more_tools '{"tools":["insert-fragment"]}'
node packages/cli/local.js mcp single-op-call insert-fragment '{"parentInstanceId":"parent-id","fragment":"<$.Box ws:style={css`padding: 32px; display: grid; gap: 12px;`}><$.Heading>Launch Kit</$.Heading><$.Paragraph>A focused section created with Webstudio JSX.</$.Paragraph><$.Button>Get started</$.Button></$.Box>"}' --dry-run
```

The same local shortcut form is shorter and preferred for simple shell steps:

```sh
node packages/cli/local.js meta.index
node packages/cli/local.js meta.get_more_tools '{"tools":["insert-fragment"]}'
node packages/cli/local.js insert-fragment '{"parentInstanceId":"parent-id","fragment":"<$.Box ws:style={css`padding: 32px; display: grid; gap: 12px;`}><$.Heading>Launch Kit</$.Heading><$.Paragraph>A focused section created with Webstudio JSX.</$.Paragraph><$.Button>Get started</$.Button></$.Box>"}' --dry-run
```

For this simple path, do not grep source files, dump full MCP resources, or write parser scripts first. Use `list-pages`, `get-page-by-path`, or `list-instances` only to get the target `parentInstanceId`.

When authoring JSX for `insert-fragment`, use Webstudio component helpers and Webstudio style syntax. Use `ws:style={css\`...\`}`for Webstudio-native CSS, or use React-style object syntax such as`style={{ padding: 24 }}` when that is simpler. Both forms create editable Webstudio style data.

Do not access host globals or dynamic code APIs in JSX fragments, including `process`, `globalThis`, `eval`, `Function`, or `constructor`. JSX fragments are declarative project data; use the built-in Webstudio helpers instead.

Use Webstudio prop names in JSX: `class`, `for`, `aria-label`, and other HTML/Webstudio names. Do not use React-only aliases such as `className` or `htmlFor`; the runtime rejects them with the Webstudio prop name to use.

Use Webstudio actions for event/action props. Do not pass JavaScript functions such as `onClick={() => ...}`; the runtime rejects them because functions cannot be persisted as Webstudio project data.

```tsx
<$.Button onClick={new ActionValue(["event"], expression`console.log(event)`)}>
  Open
</$.Button>
```

Plain JSX prop values must be JSON-compatible: `null`, strings, booleans, finite numbers, arrays, and plain objects. Do not pass `undefined`, `Symbol`, `BigInt`, `NaN`, `Infinity`, `Date`, `Map`, `Set`, class instances, or circular objects; omit the prop, use plain data, or use `expression`/`ActionValue` when the value is dynamic.

If a component has a registered template with required parts, JSX must include those parts explicitly under the same parent structure as the template, for example `<radix.Switch><radix.SwitchThumb /></radix.Switch>`. Use `insert-component` when you want Webstudio to apply one component template automatically.

## Command Surface Boundary

- Use top-level `webstudio ...` shell commands for setup, sync/import/build/preview/screenshot, permissions, publish/domains, schema, man, and starting MCP.
- Use MCP tools for Builder project data manipulation: pages, instances/components, props, text, styles, tokens, variables, resources, assets, breakpoints, redirects, and raw patches.
- From a shell, call MCP tools with the shortcut form `webstudio <tool> '<json>'`, for example `webstudio insert-fragment '<json>' --dry-run`. The explicit equivalent is `webstudio mcp single-op-call <tool> '<json>'`. Use `--input-file` for large payloads.
- Inside the Webstudio monorepo, call the local CLI as its own command: `node packages/cli/local.js ...`. Do not wrap the CLI call in `pwd && ...`, command substitution, `pnpm exec webstudio`, `pnpm --filter webstudio exec webstudio`, or a global `webstudio`.
- For experiments, pass `--dry-run` to local-capable mutation calls. Copying a `.webstudio` folder is not an isolated project clone; `.webstudio/config.json` still points to the same remote project, so non-dry-run mutations can commit to that project.
- For bounded multi-step shell work, run inline JSON with `webstudio mcp run '[{"tool":"components.find","input":{"brief":"button"}}]'`; this reuses one CLI session without raw JSON-RPC. For large batches, write `{ "calls": [{ "tool": "..." }] }` to a normal JSON file and run `webstudio mcp run .temp/mcp-calls.json`.
- Use JSON strings for `brief` fields. Never pass boolean flags such as `{"brief":true}`.
- Treat `webstudio mcp single-op-call` and `webstudio mcp run` stderr lines as progress checkpoints; stdout remains JSON on both success and failure. On failure, parse stdout for `{ "ok": false, "error": { "code": "...", "message": "..." } }` before deciding what to fix.
- Run one-shot `webstudio mcp single-op-call` commands sequentially against a linked `.webstudio` folder. If a command returns `PROJECT_SESSION_BUSY`, another CLI/MCP process is updating the local session; wait a moment and retry sequentially.
- In delegated or non-streaming agent environments, do not batch many MCP calls silently and do not wrap many shortcut or `webstudio mcp single-op-call` commands in a shell loop. Treat each parent-visible checkpoint as the unit of work. If the parent asks for status within 30 seconds, run exactly one shortcut command such as `webstudio meta.index` or one explicit `webstudio mcp single-op-call` command, report that command/result, then wait for the parent to continue. Do not take a broad task such as creating a full design-system page as one execution unit. Call `workflow.next {"goal":"design-system-page"}`, complete exactly the returned bounded phase, and return: discovery, page creation, one dry-run JSX section, one committed JSX section, or one coverage batch. Phase commands do not include nextPhase in their own output; call `workflow.next` again with the next phase after the parent continues. For all-component design-system pages, checkpoint after discovery, checkpoint after page creation, then insert one root/template component before checkpointing again.
- For design-system or “use every component” tasks, start with compact `webstudio components.coverage-plan`, checkpoint, then request component coverage details with `webstudio components.coverage-plan '{"detail":"roots","offset":20}'` or `{"detail":"parts"}` only when needed. Do not pass `detail` to `list-pages`; use `list-pages {}` or `get-page-by-path` for page lookup.
- MCP tool shortcuts are only for MCP tools. If a shortcut is ambiguous with a real top-level command, the real top-level command wins; use `webstudio mcp single-op-call <tool> '<json>'` to force the MCP path.

::doc-section{field="implementationProcess"}

## LLM Implementation Process

Use this process for user requests that change Webstudio content, layout, styles, assets, pages, redirects, resources, or publishing state:

1. Discover capabilities with `webstudio man --json`, `webstudio schema api`, `webstudio schema mcp`, MCP `meta.index`, `meta.guide`, `meta.get_more_tools`, `components.list`, `components.summary`, `components.coverage-plan`, `components.search`, `components.get`, `templates.list`, and `templates.get`. From a shell, prefer shortcut calls such as `webstudio meta.index` and `webstudio components.search '{"brief":"button"}'` for these focused tool calls; use `webstudio mcp single-op-call` when you need the explicit MCP form. Read full resources such as `webstudio://project/tools` and `webstudio://project/components` only when needed. Do not write scripts to parse full MCP discovery JSON for normal lookup.
2. Inspect current project state with semantic reads such as `list-pages`, `get-page-by-path`, `list-instances`, `inspect-instance`, `get-styles`, `list-assets`, `list-breakpoints`, and `snapshot` only when needed.
3. Mutate the Webstudio project with semantic MCP write tools first. Prefer MCP `insert-fragment` for authored/styled sections, use `insert-component` only for one automatic component template, then `update-text`, `update-props`, `update-styles`, `upload-asset`, `create-page`, and page/project settings tools over raw patches.
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

::doc-section{field="valuesVsBindings"}

## Values vs Bindings

- Use direct value tools for fixed content. For visible text, use `update-text` with plain `text`. For static props such as `aria-label`, `alt`, `id`, `class`, `href`, or button labels stored as props, use `update-props` with the prop's direct type/value.
- Use `bind-props` only when the prop must stay dynamic: an expression, parameter, resource result, or action. Do not use `bind-props` just to set a fixed string.
- Direct prop string example: `{"updates":[{"instanceId":"button-id","name":"aria-label","type":"string","value":"Open menu"}]}`.
- Expression binding example: `{"bindings":[{"instanceId":"link-id","name":"href","binding":{"type":"expression","value":"currentPost.url"}}]}`.
- Page metadata fields such as `title`, `description`, `language`, `redirect`, `status`, and custom meta content store JavaScript expression source. For fixed text, pass a JavaScript string literal expression with JSON quoting, for example `JSON.stringify("Pricing | Acme")` in code or `"\"Pricing | Acme\""` in JSON. For computed values, pass JavaScript expression code such as `pageTitle ?? "Pricing | Acme"`.
- Page metadata update example: use `update-page` with `{"pageId":"page-id","values":{"title":"\"Pricing | Acme\"","meta":{"description":"\"Plans for teams\""}}}`.
- Resource URL, header, search-param, and body fields also store JavaScript expression source. For a fixed URL, use a string literal expression such as `"\"https://api.example.com/items\""`.
- Resource update example: use `update-resource` with `{"resourceId":"resource-id","values":{"url":"\"https://api.example.com/items\""}}`.

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
- Use direct values for static strings and bindings only for dynamic expressions/resources/actions.
- For expression-backed fields that need fixed text, encode the fixed text as a quoted JavaScript string literal expression.
- Confirm destructive commands with --confirm only when user requested deletion/unpublish/replacement.
- Use webstudio schema api for machine-readable top-level command metadata and webstudio schema mcp for MCP tool schemas.

## Known Gaps

{{knownCliGapIndex}}
