---
description: >-
  Connect AI agents and automation to a Webstudio Project through MCP or direct
  CLI tool calls.
icon: robot
---

<!-- Generated from the local Webstudio CLI with `webstudio man mcp --verbose`. Do not edit directly. -->

# Webstudio MCP

**Webstudio MCP v0.0.0-webstudio-version**

{% hint style="info" %}
This reference is generated from the Webstudio CLI source in the same Builder
revision. GitBook publishes it when that revision is successfully released.
Examples use an installed `webstudio` command. See [CLI](cli.md) for Node.js and
`npx` setup.
{% endhint %}

`webstudio mcp` starts a stdio MCP server for real MCP clients. Shell users can call MCP tools with the shortcut form `webstudio <tool> '<json>'`, for example `webstudio meta.index` or `webstudio insert-fragment '<json>' --dry-run`. `webstudio mcp single-op-call` is the explicit equivalent and prints the structured JSON result. `webstudio mcp run` runs multiple MCP tool calls from inline JSON or a normal JSON file in one shared CLI session. Do not manually type or pipe raw JSON-RPC frames into `webstudio mcp` from an interactive shell or PTY.

## Startup

If you are already working with a shell-capable agent, it can use the local CLI
directly. Native MCP client registration is optional. Give the editable Builder
share link only when the trusted agent asks for it. Treat the share link as a
credential: do not include it in committed files, screenshots, logs, or issue
reports.

1. Configure a project with `webstudio init --link <api-share-link> --json`.
2. Check capabilities with `webstudio permissions --json`.
3. Use shortcut calls such as `webstudio meta.index` and `webstudio insert-fragment '<json>' --dry-run` for individual MCP tool calls. Use the explicit equivalent `webstudio mcp single-op-call <tool> '<json>'` when you need to force the MCP path, or `webstudio mcp run '[{"tool":"components.find","input":{"brief":"button"}}]'` for bounded multi-call workflows. Use `webstudio mcp run .temp/mcp-calls.json` for large batches.
4. Start discovery with `meta.index`, then call focused tools with concrete JSON, for example `webstudio mcp single-op-call meta.guide '{"brief":"Create a design system page using every component"}'`.

Do not run `webstudio sync`, install an MCP server, change client configuration,
or restart the app for this local CLI workflow.

When the user explicitly wants persistent native MCP integration, run
`webstudio connect claude`, `webstudio connect codex`, `webstudio connect
cursor`, or `webstudio connect vscode`. This optional command changes client
configuration, so follow its client-specific reload or restart instruction.
Use `--print` to inspect the generated setup without changing configuration or
requiring project access. For Codex, `connect` registers and verifies the server
through the Codex CLI. Before changing client configuration, `connect` verifies
that the saved project endpoint is reachable and its credential is accepted.

Start MCP from the linked Webstudio project root. The lifecycle status line prints that absolute root; create local scripts, screenshots, and temporary artifacts under that root, for example `<project root>/.temp/script.mjs`. If the shell starts in a parent workspace, `cd` into the project root first or use absolute paths.

When developing inside the Webstudio monorepo, start the local CLI exactly as `node packages/cli/local.js mcp` from the repo root. Do not use `pnpm exec webstudio`, `pnpm --filter webstudio exec webstudio`, or a global `webstudio`: they can resolve an older binary.

While the server is running, stdout is reserved for MCP JSON-RPC messages. Do not print human text from the server process. The server advertises MCP `logging` capability and emits sparse `notifications/message` logs for ready state and tool lifecycle checkpoints such as `tool preview.start started`, `tool preview.start still running after 10000ms`, and `tool preview.start succeeded in 1234ms`; stderr also mirrors these sparse lifecycle fallback lines prefixed with `[webstudio mcp]`.

## One-Shot Tool Calls

Use the shortcut `webstudio <tool> '<json>'` when you are operating from a shell and need one MCP tool result. The explicit form `webstudio mcp single-op-call <tool> '<json>'` is equivalent and avoids writing temporary Node.js stdio client scripts.

Examples:

```sh
webstudio mcp single-op-call meta.index
webstudio mcp single-op-call meta.guide '{"brief":"Create a design system page using every component"}'
webstudio mcp single-op-call meta.get-more-tools '{"tools":["insert-fragment"]}'
webstudio mcp single-op-call components.list '{"source":"all"}'
webstudio mcp single-op-call components.coverage-plan
webstudio mcp single-op-call components.search '{"brief":"radix select"}'
webstudio mcp single-op-call components.get '{"component":"@webstudio-is/sdk-components-react-radix:Select"}'
webstudio mcp single-op-call templates.list
webstudio mcp single-op-call templates.get '{"component":"@webstudio-is/sdk-components-react-radix:Select"}'
webstudio mcp single-op-call insert-fragment --input-file .temp/insert-fragment.json
```

Shortcut equivalents:

```sh
webstudio meta.index
webstudio meta.guide '{"brief":"Create a design system page using every component"}'
webstudio meta.get-more-tools '{"tools":["insert-fragment"]}'
webstudio components.list '{"source":"all"}'
webstudio components.coverage-plan
webstudio components.search '{"brief":"radix select"}'
webstudio components.get '{"component":"@webstudio-is/sdk-components-react-radix:Select"}'
webstudio templates.list
webstudio templates.get '{"component":"@webstudio-is/sdk-components-react-radix:Select"}'
webstudio insert-fragment --input-file .temp/insert-fragment.json
```

### Tool name convention

MCP tool names are opaque strings, not JavaScript property access. A dot separates a namespace from its tool name, and every segment uses lowercase kebab-case. For example, `components.coverage-insert-next` is the `coverage-insert-next` tool in the `components` namespace. Pass the complete name as one CLI argument: `webstudio components.coverage-insert-next`. Batch `mcp run` calls also accept the underscore form advertised by MCP protocol discovery, such as `components_coverage_insert_next`. Unknown names return near matches and direct you to `meta.index`.

### Readable fragment inputs

Prefer `--input-file` for JSX so JSON and shell quoting do not obscure the fragment. For example, save this as `.temp/insert-fragment.json`:

```json
{
  "parentInstanceId": "root-id",
  "fragment": "<ws.element ws:tag='section' ws:style={css`padding: 32px; display: grid; gap: 16px;`}><ws.element ws:tag='h2'>Northstar Product OS</ws.element><ws.element ws:tag='p'>Reusable patterns for teams.</ws.element></ws.element>"
}
```

Then run `webstudio insert-fragment --input-file .temp/insert-fragment.json`. Single quotes inside the JSX keep the JSON valid and readable without backslash-escaped attributes.

Write and review larger fragments as JSX before placing them in the `fragment` field. Common patterns:

```tsx
<ws.element
  ws:tag="section"
  style={{ padding: 32, borderRadius: 16 }}
>
  <ws.element ws:tag="h2">Operations Console</ws.element>
  <ws.element ws:tag="p">
    React-style object styles become editable Webstudio styles.
  </ws.element>
</ws.element>

<ws.element
  ws:tag="section"
  ws:tokens={[token("accent", css`color: #0f766e;`)]}
>
  <ws.element
    ws:tag="button"
    onClick={new ActionValue(["event"], expression`console.log(event)`)}
  >
    Track launch
  </ws.element>
</ws.element>

<ws.element ws:tag="section">
  <radix.Switch>
    <radix.SwitchThumb />
  </radix.Switch>
</ws.element>
```

Rules:

- Inside the Webstudio monorepo, replace `webstudio` in the examples above with `node packages/cli/local.js`, for example `node packages/cli/local.js meta.index`.
- For a simple authored/styled section, run `meta.index`, then `meta.get-more-tools '{"tools":["insert-fragment"]}'`, then `insert-fragment`. Do not grep source files, dump full MCP resources, or write parser scripts first.
- In `insert-fragment` JSX, use ``ws:style={css`...`}`` for Webstudio-native CSS, or use React-style object syntax such as `style={{ padding: 24 }}` when that is simpler. Both forms create editable Webstudio style data.
- Do not access host globals or dynamic code APIs in JSX fragments, including `process`, `globalThis`, `eval`, `Function`, or `constructor`.
- Use Webstudio prop names such as `class` and `for`; do not use React aliases `className` or `htmlFor`.
- Use Webstudio actions for event/action props, for example `onClick={new ActionValue(["event"], expression\`console.log(event)\`)}`. Do not pass JavaScript functions such as `onClick={() => ...}`.
- Plain prop values must be JSON-compatible: `null`, strings, booleans, finite numbers, arrays, and plain objects. Do not pass `undefined`, `Symbol`, `BigInt`, `NaN`, `Infinity`, `Date`, `Map`, `Set`, class instances, or circular objects; omit the prop, use plain data, or use `expression`/`ActionValue` when the value is dynamic.
- Template-backed components used in JSX must include required child/part components explicitly under the same parent structure as the template, for example `<radix.Switch><radix.SwitchThumb /></radix.Switch>`. Use `insert-component` when you want one automatic registered component template.
- The positional input is JSON and defaults to `{}`.
- Use `--input-file` for large mutation payloads.
- Use `--dry-run` with local-capable mutation tools when you need a patch plan without committing. The computed transaction is returned in `meta.session.transaction`, and `meta.session.version` is its base build version. Copying a `.webstudio` folder is not an isolated project clone; `.webstudio/config.json` still points to the same remote project, so non-dry-run mutations can commit to that project.
- The command prints JSON to stdout for both success and failure. Success uses the same `structuredContent` shape MCP tools return: `{ "ok": true, "data": ..., "meta": ... }`. Failure prints `{ "ok": false, "error": { "code": "...", "message": "..." }, "meta": ... }` and exits nonzero.
- The command writes sparse progress to stderr, including start, success/failure, elapsed time, and committed status when the tool returns session metadata.
- Invalid argument types fail loudly with path-specific messages, for example `meta.guide input.brief must be a string when provided`.
- Run one-shot shortcut or `mcp single-op-call` commands sequentially against the same linked `.webstudio` folder. If you receive `PROJECT_SESSION_BUSY`, another CLI/MCP process is updating the local session; wait a moment and retry sequentially.
- To work with another previously linked project without changing the directory's default link, start MCP or a shell call with `--project <projectId>`, for example `webstudio mcp --project <projectId>` or `webstudio mcp single-op-call list-pages --project <projectId>`. Selected projects use isolated local session and checkpoint files.
- If you are a delegated agent and your parent cannot see live stderr/stdout, do not run a long sequence of shortcut or `mcp single-op-call` commands silently and do not wrap many calls in a shell loop. Treat each parent-visible checkpoint as the unit of work. If the parent asks for status within 30 seconds, run exactly one `webstudio <tool>` or `webstudio mcp single-op-call` command, report that command/result, then wait before the next MCP command. For all-component design-system pages, checkpoint after discovery, checkpoint after page creation, call `components.coverage-insert-next` once before checkpointing again, then finish with the `presentation-pass` workflow phase. Coverage alone is not completion; organize examples into styled sections/cards.

## Reporting CLI/MCP Issues

If a CLI/MCP tool gives a confusing error, crashes, hangs, produces invalid output, requires an undocumented workaround, or makes you inspect source code to understand normal usage, ask the user to report it in the Webstudio Discord `#help` channel: https://wstd.us/community.

Give the user a complete copy-paste report. Include only non-secret values: never include auth tokens, private URLs, cookies, API keys, passwords, or proprietary project data. Redact them as `<redacted>`.

Copy-paste template:

````md
Webstudio CLI/MCP issue report

What I was trying to do:
<short user goal, for example "Create a resource from an external API and render it in a collection">

What I expected:
<what should have happened>

What happened instead:
<exact error, confusing behavior, hang, missing docs, or workaround required>

Command/tool used:

```sh
<exact command or MCP tool call, with tokens/secrets redacted>
```

Structured output / error:

```json
<stdout JSON or MCP structuredContent, if available, with secrets redacted>
```

Stderr / lifecycle logs:

```txt
<stderr lines, timings, checkpoint messages, or stack trace, with secrets redacted>
```

Environment:

- CLI command path: <webstudio / node packages/cli/local.js / other>
- Webstudio CLI version: <from command output if known>
- OS: <macOS / Windows / Linux / unknown>
- Node version: <node -v if known>
- Project/session state: <linked project, local .webstudio session, preview, MCP server, or unknown>

Workaround tried:
<what the agent/user tried next, and whether it worked>

Why this should be improved:
<one sentence: better error message, docs, schema, tool behavior, etc.>
````

## Shared-Session Shell Runs

Use `webstudio mcp run '[{"tool":"components.find","input":{"brief":"button"}}]'` when you are operating from a shell and need several MCP tool calls to share one CLI session without hand-writing JSON-RPC. For large batches, pass a normal JSON file path such as `.temp/mcp-calls.json`. Do not use shell process substitution like `<(...)`; use inline JSON or a real file.

Use `mcp run` for long-lived tools such as `preview.start`. A one-shot `mcp single-op-call preview.start` cannot keep ownership of a preview server for a later screenshot or stop call. Put `preview.start`, `screenshot`, and `preview.stop` in one shared `mcp run` process, or use a real long-running MCP client.

Input shape:

```json
{
  "calls": [
    { "tool": "meta.index" },
    { "tool": "components.find", "input": { "brief": "radix select" } }
  ]
}
```

Rules:

- The command prints JSON to stdout for both success and failure. It stops at the first failed call and prints partial results in `{ "ok": false, "error": ..., "data": { "completedCalls": ..., "results": [...] }, "meta": ... }`, then exits nonzero.
- If a call returns `checkpoint.required`, read-only discovery and inspection remain available, but mutations and state-changing session tools return `CHECKPOINT_REQUIRED`. Stop and report the checkpoint to the parent/user. Only after the parent/user continues, call `checkpoint.ack {"reported":true,"continueAfterReport":true,"summary":"<what you reported>"}` before continuing mutations.
- For `mcp single-op-call`, checkpoint requirements persist across later one-shot CLI processes until you call `checkpoint.ack {"reported":true,"continueAfterReport":true,"summary":"<what you reported>"}`.
- Use this instead of manually sending JSON-RPC frames to `webstudio mcp` from a shell.

### Cross-project batches

Add `projects` to the same `mcp run` manifest to run focused reads, audits, or dry runs across independently linked project roots:

```json
{
  "concurrency": 2,
  "calls": [
    { "tool": "status" },
    { "tool": "audit", "input": {} },
    {
      "tool": "update-project-settings",
      "input": { "meta": { "siteName": "Reviewed" } },
      "dryRun": true
    }
  ],
  "projects": [
    { "id": "site-a", "root": "../site-a" },
    { "id": "site-b", "root": "../site-b" }
  ]
}
```

Project roots and an optional `progressFile` are resolved relative to the manifest file. Each project may provide its own `calls` instead of using the top-level calls. Each root must already be linked with its own `.webstudio/config.json`; the runner creates an independently authenticated ProjectSession and uses root-scoped session, audit, preview-data, and checkpoint paths without changing the process working directory.

Concurrency defaults to 2, is capped at 16, and can be set in the manifest or overridden with `--concurrency`. A failure is reported for that project while other projects continue. Progress is saved after every successful call; rerunning with the default `--resume` skips completed projects and starts failed projects after their last confirmed successful call. Reads and dry runs may be retried. A committed mutation interrupted after dispatch is marked `AMBIGUOUS_MUTATION_RESULT` and is never replayed automatically; inspect that project before deciding how to continue. Use `--no-resume` only to intentionally start the complete manifest over.

Committed mutation tools are rejected in a projects batch unless the command includes `--approve-mutations`. Review the complete manifest before granting approval. `--dry-run` applies to every call and does not require mutation approval. The final stdout object is compact: project counts, one status/error record per project, elapsed time, and the progress-file path rather than every tool result.

## Discovery

Use MCP itself after startup, or call the same tools with `webstudio mcp single-op-call`:

- `tools/list`: machine-readable available tools
- `resources/list`: available overview and full JSON resources
- `meta.index`: concise capability catalog
- `meta.guide`: workflow for a user goal; call with a string brief such as `{"brief":"Create a pricing page"}`
- `meta.get-more-tools`: detailed params, examples, namespaces, and local/server behavior; prefer exact names such as `{"tools":["insert-fragment"]}` when you know them
- `components.list`: compact registry metadata for visible components and templates; use a focused get tool for complete details
- `components.summary`: component counts by default; use `{"detail":"components","limit":20}` for paginated entries
- `components.coverage-plan`: compact paged plan for design-system coverage tasks that need every component; default returns counts plus the first root page, use `{"detail":"roots"}`, `{"detail":"parts"}`, or `{"detail":"full"}` for more
- `components.coverage-status`: page-specific covered/missing component report with `missingRoots` and `missingParts`
- `components.search`: focused component/template search by id, namespace, label, category, or content model
- `components.find`: compatibility alias for focused component search
- `components.get`: full metadata for one component id
- `templates.list`: compact metadata for template-backed insertions only
- `templates.get`: full registry item and payload metadata for one template

Component and template registry items use a shadcn-compatible top-level shape plus Webstudio-specific superset metadata in `meta`. Use `meta.runtime` for component ids, props, states, content model, and source identity; `meta.authoring` for composition and accessibility guidance; and `meta.builder` for template insertion details and expected project-data namespaces. These items are for Builder/MCP discovery and are not a published shadcn install registry yet.

Prefer the focused `components.*` tools over dumping `webstudio://project/components`. Do not write local scripts to parse full MCP discovery JSON for common component lookup.
For “use every component” or design-system pages, start with compact `components.coverage-plan`, checkpoint, then page through roots/parts instead of dumping the full catalog.

## Consumer Capabilities

MCP lets agents work on one configured Webstudio project at a time. In consumer
terms, agents can:

- Check which project they are connected to.
- Check what the share link is allowed to do.
- Inspect project metadata and the latest editable build.
- Read selected project data for audits and repair.
- Apply precise project changes against a known version.
- List, inspect, create, update, delete, duplicate, copy, and reorder pages.
- Set the home page.
- Preserve old page paths for redirects or history.
- Read and update page titles, descriptions, metadata, auth settings, and SEO fields.
- List, create, update, duplicate, move, and delete page folders.
- List, create, update, delete, duplicate, reorder, and reuse page templates.
- Create pages from reusable templates.
- Read and update project site settings.
- Read and update marketplace product metadata.
- List, create, update, delete, and replace redirects.
- List, create, update, and delete responsive breakpoints.
- List and inspect page elements.
- Insert registered components.
- Insert styled JSX fragments.
- Move, reparent, clone, duplicate, wrap, unwrap, convert, rename, retag, and delete elements.
- Fill grid cells.
- List and update text children.
- Update plain text and expression text.
- Update structured rich text.
- Add, update, delete, and bind element props.
- Bind props to expressions, resources, actions, and runtime system values.
- Read, add, update, delete, and replace local styles.
- Update selected style-source styles.
- List, create, update, attach, detach, extract, duplicate, rename, lock, unlock, reorder, clear, and delete design tokens and style sources.
- List, define, rename, delete, and rewrite CSS variables.
- List, create, update, and delete static data variables.
- Create string, number, boolean, and JSON variables. Arrays use JSON.
- Delete unused data variables.
- List, create, update, upsert, bind, and delete resources.
- Create HTTP resources.
- Create GraphQL resources.
- Create system resources.
- Use built-in system resources for sitemap, current date, and assets.
- List and inspect complete asset metadata; upload, download, update, move, duplicate, find usage for, replace, and delete assets.
- List, create, rename, move, recursively duplicate, and recursively delete nested asset folders.
- Publish to staging or production.
- Publish to selected domains.
- List publish builds.
- Check publish job status.
- Unpublish staging or production deployments.
- List, create, update, delete, and verify custom domains.
- Start and stop preview.
- Capture screenshots of generated pages.
- Compare screenshots against baselines.
- Install OCR support for richer visual checks.

Useful resources:

- `webstudio://project/status`: compact current ProjectSession status
- `webstudio://project/tools-overview`: small operation overview by capability area
- `webstudio://project/components-overview`: small component overview with ids, labels, namespaces, and categories
- `webstudio://project/tools`: full operation catalog; read only when focused metadata is insufficient
- `webstudio://project/components`: full component catalog with props, states, and content model composition constraints; read only when `components.summary`, `components.find`, and `components.get` are insufficient
- `webstudio://project/guide`: concise discovery guide
- `webstudio://project/expressions`: expression syntax, scope, supported methods, bindings, Collection iteration context, and verification
- `webstudio://project/accessibility-review`: evidence-based LLM accessibility-review workflow using project checks, preview, and screenshots

## MCP SDK Client Imports

When writing a local Node.js MCP client script, use the official MCP SDK package and these exact ESM imports:

Inside the Webstudio monorepo this package is available at the repo root. In another project, install it first with `pnpm add -D @modelcontextprotocol/sdk`.

```js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { LoggingMessageNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
```

Minimal stdio client for the local Webstudio CLI:

```js
const client = new Client({ name: "webstudio-agent", version: "1.0.0" });

client.setNotificationHandler(
  LoggingMessageNotificationSchema,
  (notification) => {
    console.error(`[mcp] ${notification.params.data}`);
  }
);

const transport = new StdioClientTransport({
  command: "node",
  args: ["packages/cli/local.js", "mcp"],
  cwd: process.cwd(),
  stderr: "inherit",
});

await client.connect(transport);

const index = await client.callTool({
  name: "meta.index",
  arguments: {},
});
console.log(JSON.stringify(index.structuredContent, null, 2));

await client.close();
```

Use `node packages/cli/local.js mcp` from the Webstudio monorepo root for local development, or `webstudio mcp` from a linked project where the CLI is installed. Keep stdout for JSON-RPC/structured results and surface MCP logging notifications or stderr lifecycle lines as progress.

## Core Rules

- stdout is reserved for MCP JSON-RPC while the server is running.
- Operate on the configured project only.
- Read ids before writing.
- Prefer semantic tools over `apply-patch`.
- Use `status` and `refresh` when cached namespaces may be stale. Pass `status {"verbose":true}` only when debugging full namespace arrays, freshness, compatibility, or diagnostic details.
- Read `meta.session.commitStatus` before interpreting durability. Read-only results report `not-applicable` and retain `committed:false` for compatibility; dry-run plans report `planned`; failed mutations report `failed`; no-op mutations report `unchanged`; durable mutations report `committed` with `meta.session.committed:true`.
- For visual/design work, verify the rendered result with vision before finishing.

## Vision Verification Loop

Vision-capable AI can use MCP to see what it is building:

1. Make focused page/content/style changes with semantic MCP tools.
2. Call preview.start once to keep the iterative generated site running. In shell-driven workflows, run preview.start, screenshot, and preview.stop inside one `webstudio mcp run` call so they share the same preview owner.
3. Read `preview.status.stale` before relying on generated output. When present, `renderedProjectVersion` identifies the last project version materialized into the preview; a stale preview refreshes automatically on the next managed screenshot or `preview.start` call.
4. `preview.start` and `webstudio preview` install generated app dependencies under `.webstudio/preview` and reuse them across regenerations.
5. Session previews download missing project assets into `.webstudio/assets`. If `PREVIEW_ASSET_DOWNLOAD_FAILED` occurs, restore network and project asset access, then retry `preview.start`.
6. Dependency installation honors `npm_config_cache`, including a caller-provided writable cache on Windows.
7. Do not add generated-preview dependencies to the repository root `package.json` or `pnpm-lock.yaml`.
8. If dependency installation fails, the error includes sanitized npm diagnostics. Check the reported npm and network configuration, then reinstall or update the Webstudio CLI if the problem persists.
9. After MCP mutations, path-based screenshots regenerate the current session in place, wait for its exact project version, and normally reload the route. The server and browser remain alive. From one-shot shell calls or another process, pass `baseUrl` with `path` to capture an already-running generated site without starting it. Use preview.stop only in the same long-running MCP server or `webstudio mcp run` process that started preview; a separate one-shot `single-op-call` process does not own another process's preview controller.
10. For multi-page work, capture each changed page by path through the same preview server, for example screenshot({ path: "/" }), screenshot({ path: "/pricing" }), and screenshot({ path: "/about" }). The screenshot tool navigates directly to the requested route; no browser click navigation is required.
11. For responsive work, call list-breakpoints first, then capture screenshots at viewport widths based on the Builder breakpoints plus a narrow mobile and desktop width.
12. Call screenshot with { path: "/" } or the changed page path and viewport such as { width: 375, height: 812 } and { width: 1440, height: 900 }. For an existing preview in another process, call screenshot with { baseUrl: "http://127.0.0.1:5177", path: "/" }. Use waitForSelector when the page has a reliable ready marker, waitUntil:"networkidle" for network-heavy pages, and waitForTimeout only for final visual settling.
13. An explicit occupied `port` fails immediately with `PREVIEW_PORT_IN_USE`. To capture a generated site already running in another process, pass its `baseUrl` with `path`; otherwise choose another port.
14. Automatic browser discovery checks system installations, configured browser paths, and Chromium installations in the Playwright browser cache.
15. The screenshot timeout bounds browser capture after the preview is ready. A timeout returns `SCREENSHOT_TIMEOUT`, resets the reusable browser session, and releases the shared preview lifecycle for cleanup.
16. When a baseline PNG exists, call screenshot.diff with baselinePath, currentPath, and outputDir for each page/viewport pair. Add expectedText when a specific visible phrase must be present; its assertions report pass/fail plus found and missing text. Add expectedVisual to set pass/fail limits for mismatch percentage, the number of changed regions, or an overall dominant color/brightness direction.
17. Read screenshot.diff textAnalysis: it reports OCR status plus text that appeared, disappeared, moved, changed content, or changed font/style geometry. If OCR is unavailable, expectedText assertions fail and textAnalysis reports why; ask the user for permission to install Tesseract, then call vision.install-ocr with { "confirm": true }, or rely on visual inspection.
18. Inspect every viewport PNG and any diff artifacts with vision, then compare layout, OCR text evidence, color, spacing, imagery, and responsive framing against the user intent.
19. If the screenshot does not match, apply another focused mutation and repeat screenshot verification.

Generated app setup:

- `preview.start` and `webstudio preview` install generated app dependencies under `.webstudio/preview` and reuse them across regenerations.
- Session previews download missing project assets into `.webstudio/assets`. If `PREVIEW_ASSET_DOWNLOAD_FAILED` occurs, restore network and project asset access, then retry `preview.start`.
- Dependency installation honors `npm_config_cache`, including a caller-provided writable cache on Windows.
- Do not add generated-preview dependencies to the repository root `package.json` or `pnpm-lock.yaml`.
- If dependency installation fails, the error includes sanitized npm diagnostics. Check the reported npm and network configuration, then reinstall or update the Webstudio CLI if the problem persists.

## MCP argument examples

Examples below show meaningful argument combinations. Tool schemas are the
source of truth. For tools with no required arguments, pass `{}`.

### meta.guide

```json
{
  "brief": "Create a pricing page and style the hero"
}
```

### verify-font-assets

```json
{
  "assetIds": [
    "asset-regular",
    "asset-bold"
  ]
}
```

### workflow.next

```json
{
  "goal": "design-system-page"
}
```

```json
{
  "goal": "design-system-page",
  "phase": "dry-run-section"
}
```

### meta.get-more-tools

```json
{
  "tools": [
    "insert-fragment"
  ]
}
```

```json
{
  "tools": [
    "insert-component"
  ]
}
```

```json
{
  "brief": "update-styles"
}
```

### components.list

```json
{
  "source": "all",
  "documentType": "html"
}
```

### components.coverage-plan

```json
{
  "documentType": "html"
}
```

```json
{
  "documentType": "xml",
  "detail": "roots"
}
```

```json
{
  "detail": "full"
}
```

```json
{
  "detail": "roots",
  "offset": 0,
  "limit": 20
}
```

```json
{
  "detail": "parts",
  "namespace": "@webstudio-is/sdk-components-react-radix"
}
```

### components.coverage-status

```json
{
  "pagePath": "/design-system"
}
```

### components.coverage-insert-next

```json
{
  "pagePath": "/design-system",
  "parentInstanceId": "root-instance-id"
}
```

### components.find

```json
{
  "brief": "radix tabs dialog select"
}
```

### components.search

```json
{
  "brief": "radix tabs dialog select"
}
```

### components.get

```json
{
  "component": "@webstudio-is/sdk-components-react-radix:Select"
}
```

### templates.list

```json
{
  "documentType": "html"
}
```

### templates.get

```json
{
  "component": "@webstudio-is/sdk-components-react-radix:Select"
}
```

### refresh

```json
{
  "namespaces": [
    "pages",
    "instances",
    "styles"
  ]
}
```

### import

```json
{
  "to": "https://p-destination-project-id.wstd.dev/?authToken=destination-token"
}
```

### download-asset

```json
{
  "assetId": "asset-id"
}
```

### upload-asset

```json
{
  "asset": {
    "name": "Rajdhani-SemiBold.woff2",
    "type": "font",
    "format": "woff2",
    "meta": {
      "family": "Rajdhani",
      "style": "normal",
      "weight": 600
    }
  },
  "assetsDir": ".webstudio/assets"
}
```

```json
{
  "asset": {
    "name": "hero.png",
    "type": "image",
    "format": "png",
    "folderId": "folder-id",
    "meta": {
      "width": 1200,
      "height": 630
    }
  },
  "assetsDir": ".webstudio/assets"
}
```

```json
{
  "asset": {
    "name": "hero.png",
    "type": "image",
    "format": "png",
    "meta": {
      "width": 1200,
      "height": 630
    },
    "force": true
  },
  "assetsDir": ".webstudio/assets"
}
```

### upload-assets

```json
{
  "assets": [
    {
      "name": "hero.png",
      "type": "image",
      "format": "png",
      "folderId": "folder-id",
      "meta": {
        "width": 1200,
        "height": 630
      }
    }
  ],
  "assetsDir": ".webstudio/assets"
}
```

### create-asset-folder

```json
{
  "name": "Marketing"
}
```

```json
{
  "name": "Photos",
  "parentId": "marketing-folder-id"
}
```

### update-asset-folder

```json
{
  "folderId": "folder-id",
  "values": {
    "name": "Brand"
  }
}
```

```json
{
  "folderId": "folder-id",
  "values": {
    "parentId": null
  }
}
```

### duplicate-asset-folder

```json
{
  "folderId": "folder-id"
}
```

```json
{
  "folderId": "folder-id",
  "parentId": "target-folder-id"
}
```

### delete-asset-folder

```json
{
  "folderId": "folder-id"
}
```

### get-asset

```json
{
  "assetId": "asset-id"
}
```

### duplicate-asset

```json
{
  "assetId": "asset-id"
}
```

```json
{
  "assetId": "asset-id",
  "folderId": "target-folder-id"
}
```

### preview.start

```json
{
  "source": "session"
}
```

### status

```json
{
  "verbose": true
}
```

### list-pages

```json
{
  "limit": 20
}
```

### get-page-by-path

```json
{
  "path": "/pricing"
}
```

### list-instances

```json
{
  "pagePath": "/",
  "maxDepth": 3
}
```

### inspect-instance

```json
{
  "instanceId": "instance-id",
  "include": [
    "props",
    "styles",
    "children"
  ]
}
```

### search-project

```json
{
  "query": "pricing"
}
```

```json
{
  "query": "api.example.com",
  "scopes": [
    "resources"
  ]
}
```

### audit

```json
{
  "scopes": [
    "accessibility",
    "seo"
  ]
}
```

```json
{
  "pagePath": "/pricing",
  "severities": [
    "error",
    "warning"
  ]
}
```

```json
{
  "scopes": [
    "accessibility"
  ],
  "verbose": true
}
```

### report-issue

```json
{
  "trigger": "user-requested",
  "category": "schema-or-docs-mismatch",
  "deduplicationKey": "update-props-input-contract",
  "title": "fix: Clarify the update-props input contract",
  "agent": {
    "client": "Codex",
    "provider": "OpenAI",
    "model": "gpt-5.6-sol",
    "reasoningEffort": "medium"
  },
  "report": {
    "userStory": "As a Webstudio user, I want routine MCP edits to complete without corrective retries.",
    "summary": "A documented operation required a corrected retry.",
    "attemptedWorkflow": [
      "Inspect the target component.",
      "Attempt the update with the advertised tool."
    ],
    "expectedBehavior": "The documented input should be accepted.",
    "actualResult": "The initial call returned BAD_REQUEST.",
    "recoveryAttempts": [
      "Inspect the schema and retry with corrected input nesting."
    ],
    "userImpact": "The edit required extra tool calls.",
    "technicalContext": "The update-props input shape was ambiguous.",
    "acceptanceCriteria": [
      "The exposed schema matches runtime validation.",
      "A regression test covers the workflow."
    ]
  }
}
```

### insert-component

```json
{
  "parentInstanceId": "parent-id",
  "component": "@webstudio-is/sdk-components-react-radix:Switch"
}
```

### extract-slot

```json
{
  "instanceSelector": [
    "header-section-id",
    "body-id"
  ],
  "label": "Site header"
}
```

```json
{
  "instanceSelector": [
    "header-section-id",
    "page-wrapper-id",
    "body-id"
  ],
  "label": "Site header"
}
```

### insert-collection

```json
{
  "parentInstanceId": "parent-id",
  "data": {
    "type": "expression",
    "value": "Posts.data.items"
  },
  "itemFragment": "<ws.element ws:tag='article'><ws.element ws:tag='h2'>{expression`collectionItem.title ?? 'Untitled'`}</ws.element></ws.element>"
}
```

```json
{
  "parentInstanceId": "parent-id",
  "data": {
    "type": "json",
    "value": [
      {
        "name": "Starter"
      },
      {
        "name": "Pro"
      }
    ]
  },
  "itemFragment": "<ws.element ws:tag='div'>{expression`collectionItem.name`}</ws.element>"
}
```

### insert-fragment

```json
{
  "parentInstanceId": "parent-id",
  "fragment": "<ws.element ws:tag='section' ws:style={css`padding: 32px; display: grid; gap: 16px;`}><ws.element ws:tag='h2'>Northstar Product OS</ws.element><ws.element ws:tag='p'>Reusable patterns for teams.</ws.element></ws.element>"
}
```

```json
{
  "parentInstanceId": "parent-id",
  "fragment": "<ws.element ws:tag='section' style={{ padding: 32, borderRadius: 16 }}><ws.element ws:tag='h2'>Operations Console</ws.element><ws.element ws:tag='p'>Semantic section with React-style object styles converted into editable Webstudio styles.</ws.element></ws.element>"
}
```

```json
{
  "parentInstanceId": "parent-id",
  "fragment": "<ws.element ws:tag='section' ws:tokens={[token('accent', css`color: #0f766e;`)]} ws:style={css`display: grid; gap: 12px;`}><ws.element ws:tag='h2'>Token Example</ws.element><ws.element ws:tag='button' onClick={new ActionValue(['event'], expression`console.log(event)`)}>Track launch</ws.element></ws.element>"
}
```

```json
{
  "parentInstanceId": "parent-id",
  "fragment": "<ws.element ws:tag='section'><radix.Switch><radix.SwitchThumb /></radix.Switch></ws.element>"
}
```

### insert-fragment-verified

```json
{
  "parentInstanceId": "parent-id",
  "pagePath": "/pricing",
  "fragment": "<ws.element ws:tag='section'><ws.element ws:tag='h2'>Pricing</ws.element></ws.element>"
}
```

### update-text

```json
{
  "instanceId": "instance-id",
  "childIndex": 0,
  "text": "Launch faster",
  "mode": "text"
}
```

```json
{
  "instanceId": "instance-id",
  "childIndex": 0,
  "text": "user.name",
  "mode": "expression"
}
```

### replace-text

```json
{
  "find": "Start free",
  "replace": "Get started",
  "match": "exact",
  "pagePath": "/pricing",
  "limit": 20
}
```

### replace-prop-text

```json
{
  "find": "old.example.com",
  "replace": "www.example.com",
  "match": "substring",
  "names": [
    "href",
    "code"
  ],
  "limit": 20
}
```

### update-page

```json
{
  "pageId": "page-id",
  "values": {
    "title": "Pricing",
    "meta": {
      "description": "Pricing plans"
    }
  }
}
```

### update-props

```json
{
  "updates": [
    {
      "instanceId": "button-id",
      "name": "aria-label",
      "type": "string",
      "value": "Open menu"
    },
    {
      "instanceId": "textarea-id",
      "name": "placeholder",
      "type": "string",
      "value": "Describe your project"
    }
  ]
}
```

### bind-props

```json
{
  "bindings": [
    {
      "instanceId": "link-id",
      "name": "href",
      "binding": {
        "type": "expression",
        "value": "currentPost.url"
      }
    }
  ]
}
```

### list-css-variables

```json
{
  "withUsage": true
}
```

### define-css-variable

```json
{
  "vars": {
    "--color-primary": "#2d3748",
    "--color-accent": "#e53e3e",
    "--space-card": "1.5rem"
  },
  "overwrite": true
}
```

### delete-css-variable

```json
{
  "names": [
    "--color-primary",
    "--color-accent",
    "--space-card"
  ],
  "force": true
}
```

### create-variable

```json
{
  "scopeInstanceId": "body-id",
  "name": "title",
  "value": {
    "type": "string",
    "value": "Hello"
  }
}
```

```json
{
  "scopeInstanceId": "body-id",
  "name": "count",
  "value": {
    "type": "number",
    "value": 3
  }
}
```

```json
{
  "scopeInstanceId": "body-id",
  "name": "featured",
  "value": {
    "type": "boolean",
    "value": true
  }
}
```

```json
{
  "scopeInstanceId": "body-id",
  "name": "tags",
  "value": {
    "type": "json",
    "value": [
      "news",
      "product"
    ]
  }
}
```

```json
{
  "scopeInstanceId": "body-id",
  "name": "filters",
  "value": {
    "type": "json",
    "value": {
      "tag": "news",
      "page": 1
    }
  }
}
```

### update-variable

```json
{
  "dataSourceId": "variable-id",
  "values": {
    "value": {
      "type": "json",
      "value": [
        "news",
        "product"
      ]
    }
  }
}
```

### create-resource

```json
{
  "resource": {
    "name": "Posts",
    "method": "get",
    "url": "https://api.example.com/posts",
    "headers": []
  }
}
```

```json
{
  "resource": {
    "name": "Filtered Posts",
    "method": "get",
    "url": "https://api.example.com/posts",
    "searchParams": [
      {
        "name": "tag",
        "value": "filters.tag"
      },
      {
        "name": "source",
        "value": {
          "type": "literal",
          "value": "website"
        }
      },
      {
        "name": "page",
        "value": "(filters.page ?? 1).toString()"
      }
    ],
    "headers": [
      {
        "name": "Authorization",
        "value": "\"Bearer \" + auth.token"
      }
    ]
  },
  "scopeInstanceId": "body-id",
  "dataSourceName": "posts"
}
```

```json
{
  "resource": {
    "name": "Post GraphQL",
    "control": "graphql",
    "method": "post",
    "url": "https://api.example.com/graphql",
    "headers": [
      {
        "name": "Content-Type",
        "value": {
          "type": "literal",
          "value": "application/json"
        }
      }
    ],
    "body": "{ query: \"query Post($slug: String!) { post(slug: $slug) { title } }\", variables: { slug: system.params.slug } }"
  },
  "scopeInstanceId": "body-id",
  "dataSourceName": "post",
  "exposeAsDataSource": true
}
```

```json
{
  "resource": {
    "name": "Current Date",
    "control": "system",
    "method": "get",
    "url": "/$resources/current-date",
    "headers": []
  },
  "scopeInstanceId": "body-id",
  "dataSourceName": "currentDate"
}
```

### update-resource

```json
{
  "resourceId": "resource-id",
  "values": {
    "url": "https://api.example.com/posts"
  }
}
```

```json
{
  "resourceId": "resource-id",
  "values": {
    "method": "post"
  },
  "exposeAsDataSource": false
}
```

### get-assets-resource

```json
{
  "resourceId": "resource-id"
}
```

### create-assets-resource

```json
{
  "name": "All assets",
  "scopeInstanceId": "body-id",
  "dataSourceName": "assets"
}
```

```json
{
  "name": "Published posts",
  "scopeInstanceId": "body-id",
  "dataSourceName": "posts",
  "query": {
    "result": "many",
    "where": {
      "all": [
        {
          "field": [
            "extension"
          ],
          "operator": "eq",
          "value": {
            "type": "literal",
            "value": "md"
          }
        },
        {
          "field": [
            "folderId"
          ],
          "operator": "eq",
          "value": {
            "type": "literal",
            "value": "folder-id"
          }
        },
        {
          "field": [
            "properties",
            "draft"
          ],
          "operator": "ne",
          "value": {
            "type": "literal",
            "value": true
          }
        }
      ]
    },
    "sort": [
      {
        "field": [
          "properties",
          "publishedAt"
        ],
        "direction": "desc"
      },
      {
        "field": [
          "id"
        ],
        "direction": "asc"
      }
    ],
    "limit": {
      "type": "literal",
      "value": 20
    },
    "offset": {
      "type": "literal",
      "value": 0
    },
    "output": {
      "mode": "fields",
      "includeMetadata": false,
      "fields": [
        [
          "properties",
          "title"
        ],
        [
          "properties",
          "slug"
        ],
        [
          "properties",
          "publishedAt"
        ],
        [
          "properties",
          "excerpt"
        ]
      ]
    },
    "content": {
      "mode": "none"
    }
  }
}
```

```json
{
  "name": "Post by slug",
  "scopeInstanceId": "body-id",
  "dataSourceName": "post",
  "query": {
    "result": "one",
    "where": {
      "all": [
        {
          "field": [
            "extension"
          ],
          "operator": "eq",
          "value": {
            "type": "literal",
            "value": "md"
          }
        },
        {
          "field": [
            "folderId"
          ],
          "operator": "eq",
          "value": {
            "type": "literal",
            "value": "folder-id"
          }
        },
        {
          "field": [
            "properties",
            "slug"
          ],
          "operator": "eq",
          "value": "system.params.slug"
        },
        {
          "field": [
            "properties",
            "draft"
          ],
          "operator": "ne",
          "value": {
            "type": "literal",
            "value": true
          }
        }
      ]
    },
    "output": {
      "mode": "fields",
      "includeMetadata": false,
      "fields": [
        [
          "properties",
          "title"
        ],
        [
          "properties",
          "publishedAt"
        ],
        [
          "properties",
          "excerpt"
        ],
        [
          "properties",
          "featureImage"
        ]
      ]
    },
    "content": {
      "mode": "markdown-body-ref"
    }
  }
}
```

### update-assets-resource

```json
{
  "resourceId": "resource-id",
  "values": {
    "query": {
      "limit": "50"
    }
  }
}
```

```json
{
  "resourceId": "resource-id",
  "values": {
    "query": null
  }
}
```

### validate-asset-query

```json
{
  "query": {
    "where": {
      "all": [
        {
          "field": [
            "properties",
            "slug"
          ],
          "operator": "eq",
          "value": "hello-world"
        }
      ]
    },
    "limit": 1
  }
}
```

### preview-asset-query

```json
{
  "query": {
    "result": "one",
    "where": {
      "all": [
        {
          "field": [
            "extension"
          ],
          "operator": "eq",
          "value": "md"
        },
        {
          "field": [
            "properties",
            "slug"
          ],
          "operator": "eq",
          "value": "hello-world"
        }
      ]
    },
    "output": {
      "mode": "fields",
      "includeMetadata": false,
      "fields": [
        [
          "properties",
          "title"
        ]
      ]
    },
    "content": {
      "mode": "markdown-body-ref",
      "maxBytes": 1048576
    }
  }
}
```

### update-asset

```json
{
  "assetId": "font-asset-id",
  "values": {
    "meta": {
      "family": "Rajdhani",
      "style": "normal",
      "weight": 600
    }
  }
}
```

```json
{
  "assetId": "asset-id",
  "values": {
    "description": "Team collaborating around a whiteboard"
  }
}
```

```json
{
  "assetId": "asset-id",
  "values": {
    "filename": "hero",
    "folderId": "folder-id"
  }
}
```

```json
{
  "assetId": "asset-id",
  "values": {
    "folderId": null
  }
}
```

### list-assets

```json
{
  "verbose": true
}
```

### replace-asset

```json
{
  "fromAssetId": "old-asset-id",
  "toAssetId": "new-asset-id"
}
```

### delete-asset

```json
{
  "assetIds": [
    "asset-id"
  ]
}
```

```json
{
  "assetIdPrefixes": [
    "generated-prefix"
  ]
}
```

### set-image-descriptions

```json
{
  "updates": [
    {
      "assetId": "hero-asset-id",
      "description": "Team collaborating around a whiteboard"
    },
    {
      "assetId": "background-texture-id",
      "decorative": true
    }
  ]
}
```

### replace-resource-text

```json
{
  "find": "api.old.example.com",
  "replace": "api.example.com",
  "fields": [
    "url"
  ],
  "limit": 20
}
```

### update-styles

```json
{
  "updates": [
    {
      "instanceId": "instance-id",
      "property": "color",
      "value": {
        "type": "keyword",
        "value": "red"
      }
    }
  ]
}
```

### delete-styles

```json
{
  "deletions": [
    {
      "instanceId": "instance-id",
      "property": "box-shadow"
    }
  ]
}
```

### apply-patch

```json
{
  "baseVersion": 12,
  "transactions": [
    {
      "id": "patch-transaction-label",
      "payload": [
        {
          "namespace": "pages",
          "patches": [
            {
              "op": "replace",
              "path": [
                "meta",
                "siteName"
              ],
              "value": "Site name"
            }
          ]
        }
      ]
    }
  ]
}
```

### publish

```json
{
  "target": "production"
}
```

### create-domain

```json
{
  "domain": "www.example.com"
}
```

### screenshot

```json
{
  "path": "/",
  "output": "screenshots/home.png",
  "viewport": {
    "width": 1440,
    "height": 900
  },
  "waitUntil": "load",
  "waitForTimeout": 250
}
```

```json
{
  "path": "/pricing",
  "output": "screenshots/pricing.png",
  "viewport": {
    "width": 1440,
    "height": 900
  },
  "waitUntil": "load",
  "waitForTimeout": 250
}
```

```json
{
  "url": "https://example.com",
  "output": "current.png",
  "viewport": {
    "width": 1440,
    "height": 900
  },
  "browser": "auto"
}
```

### screenshot.responsive

```json
{
  "path": "/pricing",
  "viewports": [
    {
      "width": 1440,
      "height": 900
    },
    {
      "width": 390,
      "height": 844
    }
  ],
  "source": "session"
}
```

### verify-page-responsive

```json
{
  "path": "/pricing",
  "viewports": [
    {
      "width": 1440,
      "height": 900
    },
    {
      "width": 390,
      "height": 844
    }
  ],
  "source": "session"
}
```

### screenshot.diff

```json
{
  "baselinePath": "baseline.png",
  "currentPath": "current.png",
  "outputDir": "visual-diff",
  "threshold": 0.1,
  "ignoreTopNormalizedY": 0,
  "expectedText": [
    "Pricing",
    "Start free"
  ],
  "expectedVisual": {
    "maxMismatchPercentage": 2,
    "maxChangedRegions": 3,
    "dominantColorChange": {
      "channel": "luminance",
      "direction": "increase",
      "minMagnitude": 10
    }
  }
}
```

### vision.install-ocr

```json
{
  "confirm": true
}
```

## Screenshot Verification

Inside a long-running MCP server, call preview.start once, then use screenshot({ path, viewport }) for fast repeated checks across multiple pages. Iterative mode is the default: after MCP mutations, path screenshots regenerate changed files and reload the requested route while keeping the server and browser alive. Use mode: "production" only for release-like verification. From one-shot shell calls or another process, use screenshot({ baseUrl, path, viewport }) to capture an already-running preview/site without generating, building, starting, or restarting preview. Use path values such as "/", "/pricing", or "/about" to capture specific generated routes. For responsive work, read list-breakpoints and capture one familiar device viewport inside each Builder breakpoint range before using vision. Screenshot waits for load by default, then fonts and two layout frames; pass waitForSelector for app readiness, waitUntil:"networkidle" for network-heavy pages, and waitForTimeout for final settling. When a baseline exists, use screenshot.diff for changed regions, OCR textAnalysis, and diff artifacts on each baseline/current screenshot pair. Outside MCP, use `webstudio screenshot --path /pricing --output pricing.png` for one temporary generated preview capture, or keep `webstudio preview` running and pass its absolute URL to `webstudio screenshot` for repeated captures.

## Related

- [CLI](cli.md) – Install and use the Webstudio command-line interface
- [Content Engine](foundations/content-engine.md) – Build a file-based site with Markdown and Assets queries
- [Commands and search](foundations/commands-and-search.md) – Run Builder commands from the keyboard
- [Share links](foundations/share-links.md) – Grant the access used to link a Project
- [Publishing and custom domains](foundations/publishing-and-custom-domains.md) – Publish the completed Project
