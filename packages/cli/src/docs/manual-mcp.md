# Webstudio MCP Manual

`webstudio mcp` starts a stdio MCP server for real MCP clients. Shell users can call MCP tools with the shortcut form `webstudio <tool> '<json>'`, for example `webstudio meta.index` or `webstudio insert-fragment '<json>' --dry-run`. `webstudio mcp single-op-call` is the explicit equivalent and prints the structured JSON result. `webstudio mcp run` runs multiple MCP tool calls from inline JSON or a normal JSON file in one shared CLI session. Do not manually type or pipe raw JSON-RPC frames into `webstudio mcp` from an interactive shell or PTY.

## Startup

1. Configure a project with `webstudio init --link <api-share-link> --json`.
2. Generate the client configuration with `webstudio connect claude`,
   `webstudio connect codex`, `webstudio connect cursor`, or
   `webstudio connect vscode`. Use `--print` to preview file-based config.
3. Check capabilities with `webstudio permissions --json`.
4. For shell-driven agents, use shortcut calls such as `webstudio meta.index` and `webstudio insert-fragment '<json>' --dry-run` for individual MCP tool calls. Use the explicit equivalent `webstudio mcp single-op-call <tool> '<json>'` when you need to force the MCP path, or `webstudio mcp run '[{"tool":"components.find","input":{"brief":"button"}}]'` for bounded multi-call workflows. Use `webstudio mcp run .temp/mcp-calls.json` for large batches.
5. For MCP clients, start the server with `webstudio mcp`.
6. Start discovery with `meta.index`, then call focused tools with concrete JSON, for example `webstudio mcp single-op-call meta.guide '{"brief":"Create a design system page using every component"}'`.

Start MCP from the linked Webstudio project root. The lifecycle status line prints that absolute root; create local scripts, screenshots, and temporary artifacts under that root, for example `<project root>/.temp/script.mjs`. If the shell starts in a parent workspace, `cd` into the project root first or use absolute paths.

When developing inside the Webstudio monorepo, start the local CLI exactly as `node packages/cli/local.js mcp` from the repo root. Do not use `pnpm exec webstudio`, `pnpm --filter webstudio exec webstudio`, or a global `webstudio`: they can resolve an older binary.

While the server is running, stdout is reserved for MCP JSON-RPC messages. Do not print human text from the server process. The server advertises MCP `logging` capability and emits sparse `notifications/message` logs for ready state and tool lifecycle checkpoints such as `tool preview.start started`, `tool preview.start still running after 10000ms`, and `tool preview.start succeeded in 1234ms`; stderr also mirrors these sparse lifecycle fallback lines prefixed with `[webstudio mcp]`.

## One-Shot Tool Calls

Use the shortcut `webstudio <tool> '<json>'` when you are operating from a shell and need one MCP tool result. The explicit form `webstudio mcp single-op-call <tool> '<json>'` is equivalent and avoids writing temporary Node.js stdio client scripts.

Examples:

```sh
webstudio mcp single-op-call meta.index
webstudio mcp single-op-call meta.guide '{"brief":"Create a design system page using every component"}'
webstudio mcp single-op-call meta.get_more_tools '{"tools":["insert-fragment"]}'
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
webstudio meta.get_more_tools '{"tools":["insert-fragment"]}'
webstudio components.list '{"source":"all"}'
webstudio components.coverage-plan
webstudio components.search '{"brief":"radix select"}'
webstudio components.get '{"component":"@webstudio-is/sdk-components-react-radix:Select"}'
webstudio templates.list
webstudio templates.get '{"component":"@webstudio-is/sdk-components-react-radix:Select"}'
webstudio insert-fragment --input-file .temp/insert-fragment.json
```

Rules:

- Inside the Webstudio monorepo, replace `webstudio` in the examples above with `node packages/cli/local.js`, for example `node packages/cli/local.js meta.index`.
- For a simple authored/styled section, run `meta.index`, then `meta.get_more_tools '{"tools":["insert-fragment"]}'`, then `insert-fragment`. Do not grep source files, dump full MCP resources, or write parser scripts first.
- In `insert-fragment` JSX, use `ws:style={css\`...\`}`for Webstudio-native CSS, or use React-style object syntax such as`style={{ padding: 24 }}` when that is simpler. Both forms create editable Webstudio style data.
- Prefer JSX for authored/styled content. Common `insert-fragment` inputs:

```jsonl
{"parentInstanceId":"root-id","fragment":"<ws.element ws:tag=\"section\" ws:style={css`padding: 32px; display: grid; gap: 16px;`}><ws.element ws:tag="h2">Northstar Product OS</ws.element><ws.element ws:tag="p">Reusable patterns for teams.</ws.element></ws.element>"}
{"parentInstanceId":"root-id","fragment":"<ws.element ws:tag=\"section\" style={{ padding: 32, borderRadius: 16 }}><ws.element ws:tag="h2">Operations Console</ws.element><ws.element ws:tag="p">React-style object styles become editable Webstudio styles.</ws.element></ws.element>"}
{"parentInstanceId":"root-id","fragment":"<ws.element ws:tag=\"section\" ws:tokens={[token(\"accent\", css`color: #0f766e;`)]}><ws.element ws:tag="button" onClick={new ActionValue([\"event\"], expression`console.log(event)`)}>Track launch</ws.element></ws.element>"}
{"parentInstanceId":"root-id","fragment":"<ws.element ws:tag=\"section\"><radix.Switch><radix.SwitchThumb /></radix.Switch></ws.element>"}
```

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
- If a call returns `checkpoint.required`, `mcp run` stops immediately before later calls and prints partial results with `CHECKPOINT_REQUIRED`. Stop now and report the checkpoint to the parent/user. Only after the parent/user continues, call `checkpoint.ack {"reported":true,"continueAfterReport":true,"summary":"<what you reported>"}` before continuing.
- For `mcp single-op-call`, checkpoint requirements persist across later one-shot CLI processes until you call `checkpoint.ack {"reported":true,"continueAfterReport":true,"summary":"<what you reported>"}`.
- Use this instead of manually sending JSON-RPC frames to `webstudio mcp` from a shell.

## Discovery

Use MCP itself after startup, or call the same tools with `webstudio mcp single-op-call`:

- `tools/list`: machine-readable available tools
- `resources/list`: available overview and full JSON resources
- `meta.index`: concise capability catalog
- `meta.guide`: workflow for a user goal; call with a string brief such as `{"brief":"Create a pricing page"}`
- `meta.get_more_tools`: detailed params, examples, namespaces, and local/server behavior; prefer exact names such as `{"tools":["insert-fragment"]}` when you know them
- `components.list`: shadcn-compatible registry items for visible components and templates
- `components.summary`: compact structured component catalog with insertability and template hints
- `components.coverage-plan`: compact paged plan for design-system coverage tasks that need every component; default returns counts plus the first root page, use `{"detail":"roots"}`, `{"detail":"parts"}`, or `{"detail":"full"}` for more
- `components.coverage-status`: page-specific covered/missing component report with `missingRoots` and `missingParts`
- `components.search`: focused component/template search by id, namespace, label, category, or content model
- `components.find`: compatibility alias for focused component search
- `components.get`: full metadata for one component id
- `templates.list`: shadcn-compatible registry items for template-backed insertions only
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
- Create string, number, boolean, string list, and JSON variables.
- Delete unused data variables.
- List, create, update, upsert, bind, and delete resources.
- Create HTTP resources.
- Create GraphQL resources.
- Create system resources.
- Use built-in system resources for sitemap, current date, and assets.
- List, upload, add, update, find usage for, replace, and delete assets.
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

::doc-section{field="rules"}

## Core Rules

- stdout is reserved for MCP JSON-RPC while the server is running.
- Operate on the configured project only.
- Read ids before writing.
- Prefer semantic tools over `apply-patch`.
- Use `status` and `refresh` when cached namespaces may be stale. Pass `status {"verbose":true}` only when debugging full namespace arrays, freshness, compatibility, or diagnostic details.
- A mutation is durable only when `meta.session.committed` is true.
- For visual/design work, verify the rendered result with vision before finishing.

## Vision Verification Loop

Vision-capable AI can use MCP to see what it is building:

{{mcpVisionVerificationLoopMarkdown}}

Generated app setup:

{{mcpGeneratedAppDependencyNotes}}

## MCP Argument Examples

MCP tools receive JSON argument objects:

{{mcpArgumentExampleIndex}}

## Screenshot Verification

{{screenshotVerificationSummary}}
