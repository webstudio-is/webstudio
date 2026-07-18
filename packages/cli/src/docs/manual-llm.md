# Webstudio CLI Manual for LLMs

Use this order. Stop only when a command returns ok:false.

If you are inside the Webstudio monorepo, the first command discovery should use
the local CLI exactly as `node packages/cli/local.js ...` from the repo root. Do
not use `packages/cli/bin.js` for local source-tree work; it is the packaged
build entry and may use stale built output. Do not use `pnpm exec webstudio`,
`pnpm --filter webstudio exec webstudio`, or a global `webstudio`: they can
resolve an older binary.

For delegated design-system or “use every component” tasks, skip the generic warm-up sequence and start with exactly one MCP command: `webstudio workflow.next '{"goal":"design-system-page"}'`. Report that returned checkpoint to the parent/user and stop until continued.

## Connect an MCP client

When the user asks to connect the current folder to Webstudio, run the command
for the agent client you are currently using:

- Claude Code: `webstudio connect claude`
- Codex: `webstudio connect codex`
- Cursor: `webstudio connect cursor`
- VS Code or GitHub Copilot: `webstudio connect vscode`

Run the command from the linked project root. If the folder is not linked, ask
for an editable Builder share link and run
`webstudio init --link <share-link> --json`, followed by `webstudio sync`, then
retry `webstudio connect <client>`. Treat the share link as a credential and do
not include it in committed files, logs, screenshots, or issue reports.

`connect` verifies project access before changing client configuration. For
Claude Code, Cursor, and VS Code it safely merges the `webstudio` server into
the client's project configuration. For Codex it runs both `codex mcp add` and
`codex mcp get webstudio`; do not repeat those commands separately. Follow the
reload, restart, or approval instruction printed by `connect`, then verify the
loaded MCP connection by asking the client to use Webstudio MCP and list the
project pages. Use `--print` only to inspect the generated setup without
changing configuration or requiring project access.

## Always

1. webstudio permissions --json
2. For bounded shell workflows, call MCP tools directly through the CLI shortcut, for example `webstudio meta.index` or `webstudio insert-fragment '<json>' --dry-run`. The explicit form `webstudio mcp single-op-call <tool> '<json>'` is equivalent and useful when you need to make the MCP boundary obvious. Use `webstudio mcp run '[{"tool":"components.find","input":{"brief":"button"}}]'` for multiple calls in one shared CLI session. Use a normal JSON file path for large batches. Use long-running `webstudio mcp` only when your environment is a real MCP client. Do not manually send raw JSON-RPC to `webstudio mcp` from a shell or PTY.
3. Read MCP `meta.index`, for example `webstudio meta.index`.
4. Use focused MCP calls with concrete JSON: `webstudio meta.guide '{"brief":"Create a design system page using every component"}'`, `webstudio meta.get_more_tools '{"tools":["insert-fragment"]}'`, `webstudio components.list '{"source":"all"}'`, `webstudio components.coverage-plan`, `webstudio components.search '{"brief":"radix select"}'`, `webstudio components.get '{"component":"@webstudio-is/sdk-components-react-radix:Select"}'`, `webstudio templates.list`, and `webstudio templates.get '{"component":"@webstudio-is/sdk-components-react-radix:Select"}'`.
5. Read overview resources `webstudio://project/tools-overview` or `webstudio://project/components-overview` when useful. Read full resources `webstudio://project/tools` or `webstudio://project/components` only when focused tools are insufficient.
6. Pick focused MCP read tool.
7. Pick semantic MCP write tool.

Use `webstudio schema mcp` for a compact MCP tool overview. Add `--verbose` only when exact input schemas for all tools are truly needed; otherwise prefer focused `meta.get_more_tools` and `components.*` calls.

Run these commands from the linked project root. Use the MCP startup status line's absolute root for local files; write temporary scripts and artifacts under `<project root>/.temp`, not under a parent workspace.

Monorepo quick path for a simple styled section:

```sh
node packages/cli/local.js mcp single-op-call meta.index
node packages/cli/local.js mcp single-op-call meta.get_more_tools '{"tools":["insert-fragment"]}'
node packages/cli/local.js mcp single-op-call insert-fragment '{"parentInstanceId":"parent-id","fragment":"<ws.element ws:tag=\"section\" ws:style={css`padding: 32px; display: grid; gap: 12px;`}><ws.element ws:tag="h2">Launch Kit</ws.element><ws.element ws:tag="p">A focused section created with Webstudio JSX.</ws.element><ws.element ws:tag="button">Get started</ws.element></ws.element>"}' --dry-run
```

The same local shortcut form is shorter and preferred for simple shell steps:

```sh
node packages/cli/local.js meta.index
node packages/cli/local.js meta.get_more_tools '{"tools":["insert-fragment"]}'
node packages/cli/local.js insert-fragment '{"parentInstanceId":"parent-id","fragment":"<ws.element ws:tag=\"section\" ws:style={css`padding: 32px; display: grid; gap: 12px;`}><ws.element ws:tag="h2">Launch Kit</ws.element><ws.element ws:tag="p">A focused section created with Webstudio JSX.</ws.element><ws.element ws:tag="button">Get started</ws.element></ws.element>"}' --dry-run
```

For this simple path, do not grep source files, dump full MCP resources, or write parser scripts first. Use `list-pages`, `get-page-by-path`, or `list-instances` only to get the target `parentInstanceId`.

When authoring JSX for `insert-fragment`, use Webstudio component helpers and Webstudio style syntax. Use `ws:style={css\`...\`}`for Webstudio-native CSS, or use React-style object syntax such as`style={{ padding: 24 }}` when that is simpler. Both forms create editable Webstudio style data.

When the task says another user will edit a page in Content mode, use a Content Block (`ws:block`) around every editable region. Content-mode users can edit text and supported props only in descendants of that block; content outside it is read-only. Put reusable insertable options in the block's `ws:block-template` child. Do not put intended editor content inside that template container: templates are protected source material, while an inserted template copy becomes an editable direct child of the Content Block. Verify this structure before handoff.

Do not access host globals or dynamic code APIs in JSX fragments, including `process`, `globalThis`, `eval`, `Function`, or `constructor`. JSX fragments are declarative project data; use the built-in Webstudio helpers instead.

Use Webstudio prop names in JSX: `class`, `for`, `aria-label`, and other HTML/Webstudio names. Do not use React-only aliases such as `className` or `htmlFor`; the runtime rejects them with the Webstudio prop name to use.

Use Webstudio actions for event/action props. Do not pass JavaScript functions such as `onClick={() => ...}`; the runtime rejects them because functions cannot be persisted as Webstudio project data.

```tsx
<ws.element
  ws:tag="button"
  onClick={new ActionValue(["event"], expression`console.log(event)`)}
>
  Open
</ws.element>
```

Plain JSX prop values must be JSON-compatible: `null`, strings, booleans, finite numbers, arrays, and plain objects. Do not pass `undefined`, `Symbol`, `BigInt`, `NaN`, `Infinity`, `Date`, `Map`, `Set`, class instances, or circular objects; omit the prop, use plain data, or use `expression`/`ActionValue` when the value is dynamic.

If a component has a registered template with required parts, JSX must include those parts explicitly under the same parent structure as the template, for example `<radix.Switch><radix.SwitchThumb /></radix.Switch>`. Use `insert-component` when you want Webstudio to apply one component template automatically.

## Animation Components

Before creating animation examples, inspect the exact components with focused discovery:

```sh
webstudio components.get '{"component":"@webstudio-is/sdk-components-animation:AnimateChildren"}'
webstudio components.get '{"component":"@webstudio-is/sdk-components-animation:AnimateText"}'
webstudio components.get '{"component":"@webstudio-is/sdk-components-animation:StaggerAnimation"}'
webstudio components.get '{"component":"@webstudio-is/sdk-components-animation:VideoAnimation"}'
```

Use Animation Group (`AnimateChildren`) as the controller. Put normal instances directly inside it, or put Text Animation, Stagger Animation, or Video Animation directly inside it. Text, Stagger, and Video are helper components with `contentModel.category: "none"` and should not be used as standalone section roots.

Define timing and CSS changes on the Animation Group `action` prop. Use `type:"view"` for viewport entry/exit progress and `type:"scroll"` for scroll-progress timelines. For in animations, keep the canvas styles as the final state and use `fill:"backwards"` with keyframes that describe the starting state. For out animations, use `fill:"forwards"` with keyframes that describe the ending state.

Text Animation settings: `slidingWindow` defaults to `5`, `easing` defaults to `linear`, and `splitBy` defaults to `char`. Use `splitBy:"space"` for word-by-word animation. The parent Animation Group keyframes provide the actual opacity, translate, scale, or other styles.

Stagger Animation settings: `slidingWindow` defaults to `1` and `easing` defaults to `linear`. It applies parent Animation Group progress across its direct children. Use `slidingWindow:0` for instant sequential steps, `1` for one child at a time, and values above `1` for overlapping waves.

Video Animation settings: `timeline` is a boolean. Prefer `insert-component` for Video Animation so the Video child template is inserted, then configure the Video child asset/source. Use short, seek-friendly videos for smooth scroll-linked playback.

Use JSX fragments for authored animation structures when you need styled, editable examples. Put the final visual state in `ws:style` and put the starting or ending animated state in the Animation Group `action` keyframes. Include an explicit `offset` on every keyframe: use `offset: 0` for starting-state keyframes with `fill:"backwards"` and `offset: 1` for ending-state keyframes with `fill:"forwards"`.

```tsx
<animation.AnimateChildren
  action={{
    type: "view",
    axis: "block",
    animations: [
      {
        name: "Fade up on entry",
        timing: {
          fill: "backwards",
          rangeStart: ["entry", { type: "unit", value: 0, unit: "%" }],
          rangeEnd: ["entry", { type: "unit", value: 100, unit: "%" }],
        },
        keyframes: [
          {
            offset: 0,
            styles: {
              opacity: { type: "unit", value: 0, unit: "number" },
              translate: {
                type: "tuple",
                value: [
                  { type: "unit", value: 0, unit: "number" },
                  { type: "unit", value: 24, unit: "px" },
                ],
              },
            },
          },
        ],
      },
    ],
  }}
>
  <ws.element
    ws:tag="section"
    ws:style={css`
      display: grid;
      gap: 16px;
      padding: 48px;
      border-radius: 24px;
      background: #111827;
      color: white;
    `}
  >
    <ws.element ws:tag="h2">Launch metrics</ws.element>
    <ws.element ws:tag="p">
      A polished card that fades up as it enters the viewport.
    </ws.element>
  </ws.element>
</animation.AnimateChildren>
```

For Text Animation, keep `animation.AnimateText` as the direct child of Animation Group and place the text-containing element inside it:

```tsx
<animation.AnimateChildren
  action={{
    type: "view",
    animations: [
      {
        name: "Parallax In",
        timing: {
          fill: "backwards",
          rangeStart: ["cover", { type: "unit", value: 0, unit: "%" }],
          rangeEnd: ["cover", { type: "unit", value: 70, unit: "%" }],
        },
        keyframes: [
          {
            offset: 0,
            styles: {
              translate: {
                type: "tuple",
                value: [
                  { type: "unit", value: 0, unit: "number" },
                  { type: "unit", value: 100, unit: "px" },
                ],
              },
            },
          },
        ],
      },
      {
        name: "Opacity In",
        timing: {
          fill: "backwards",
          rangeStart: ["cover", { type: "unit", value: 0, unit: "%" }],
          rangeEnd: ["cover", { type: "unit", value: 70, unit: "%" }],
        },
        keyframes: [
          {
            offset: 0,
            styles: {
              opacity: { type: "unit", value: 0, unit: "number" },
            },
          },
        ],
      },
      {
        name: "Scale In",
        timing: {
          fill: "backwards",
          rangeStart: ["cover", { type: "unit", value: 0, unit: "%" }],
          rangeEnd: ["cover", { type: "unit", value: 70, unit: "%" }],
        },
        keyframes: [
          {
            offset: 0,
            styles: {
              scale: {
                type: "tuple",
                value: [
                  { type: "unit", value: 5, unit: "number" },
                  { type: "unit", value: 5, unit: "number" },
                ],
              },
            },
          },
        ],
      },
      {
        name: "Parallax Out",
        timing: {
          fill: "forwards",
          rangeStart: ["cover", { type: "unit", value: 50, unit: "%" }],
          rangeEnd: ["cover", { type: "unit", value: 100, unit: "%" }],
        },
        keyframes: [
          {
            offset: 1,
            styles: {
              translate: {
                type: "tuple",
                value: [
                  { type: "unit", value: 0, unit: "number" },
                  { type: "unit", value: -100, unit: "px" },
                ],
              },
              scale: {
                type: "tuple",
                value: [
                  { type: "unit", value: 5, unit: "number" },
                  { type: "unit", value: 5, unit: "number" },
                ],
              },
              opacity: { type: "unit", value: 0, unit: "number" },
            },
          },
        ],
      },
    ],
    insetStart: { type: "unit", value: 5, unit: "%" },
    insetEnd: { type: "unit", value: 5, unit: "%" },
    isPinned: true,
  }}
>
  <animation.AnimateText
    splitBy="space"
    slidingWindow={5}
    easing="easeOutQuart"
  >
    <ws.element ws:tag="h2">Animate words with controlled rhythm</ws.element>
  </animation.AnimateText>
</animation.AnimateChildren>
```

For Stagger Animation, put the repeated cards or rows directly inside `animation.StaggerAnimation`:

```tsx
<animation.AnimateChildren
  action={{
    type: "view",
    animations: [
      {
        timing: {
          fill: "backwards",
          rangeStart: ["contain", { type: "unit", value: 0, unit: "%" }],
          rangeEnd: ["contain", { type: "unit", value: 30, unit: "%" }],
        },
        keyframes: [
          {
            offset: 0,
            styles: {
              opacity: { type: "unit", value: 0, unit: "number" },
            },
          },
        ],
      },
    ],
  }}
>
  <animation.StaggerAnimation>
    <ws.element
      ws:tag="article"
      ws:style={css`
        padding: 20px;
        border: 1px solid #d1d5db;
        border-radius: 16px;
      `}
    >
      Plan
    </ws.element>
    <ws.element
      ws:tag="article"
      ws:style={css`
        padding: 20px;
        border: 1px solid #d1d5db;
        border-radius: 16px;
      `}
    >
      Build
    </ws.element>
    <ws.element
      ws:tag="article"
      ws:style={css`
        padding: 20px;
        border: 1px solid #d1d5db;
        border-radius: 16px;
      `}
    >
      Launch
    </ws.element>
  </animation.StaggerAnimation>
</animation.AnimateChildren>
```

For Video Animation, use the registered template via `insert-component` when possible. If you author JSX, include the Video child explicitly:

```tsx
<animation.AnimateChildren
  action={{
    type: "view",
    animations: [
      {
        name: "Video progress",
        timing: {
          fill: "both",
          rangeStart: ["cover", { type: "unit", value: 0, unit: "%" }],
          rangeEnd: ["cover", { type: "unit", value: 100, unit: "%" }],
        },
        keyframes: [{ offset: 0, styles: {} }],
      },
    ],
  }}
>
  <animation.VideoAnimation timeline={true}>
    <$.Video
      preload="auto"
      autoPlay={true}
      muted={true}
      playsInline={true}
      crossOrigin="anonymous"
    />
  </animation.VideoAnimation>
</animation.AnimateChildren>
```

## Command Surface Boundary

- Use top-level `webstudio ...` shell commands for setup, sync/import/build/preview/screenshot, permissions, publish/domains, schema, registry inspection, man, and starting MCP.
- Use MCP tools for Builder project data manipulation: pages, instances/components, props, text, styles, tokens, variables, resources, assets, breakpoints, redirects, and raw patches.
- From a shell, call MCP tools with the shortcut form `webstudio <tool> '<json>'`, for example `webstudio insert-fragment '<json>' --dry-run`. The explicit equivalent is `webstudio mcp single-op-call <tool> '<json>'`. Use `--input-file` for large payloads.
- Inside the Webstudio monorepo, call the local CLI as its own command: `node packages/cli/local.js ...`. Do not wrap the CLI call in `pwd && ...`, command substitution, `pnpm exec webstudio`, `pnpm --filter webstudio exec webstudio`, or a global `webstudio`.
- For experiments, pass `--dry-run` to local-capable mutation calls. Read the computed transaction from `meta.session.transaction` and its base build version from `meta.session.version`. Copying a `.webstudio` folder is not an isolated project clone; `.webstudio/config.json` still points to the same remote project, so non-dry-run mutations can commit to that project.
- For bounded multi-step shell work, run inline JSON with `webstudio mcp run '[{"tool":"components.find","input":{"brief":"button"}}]'`; this reuses one CLI session without raw JSON-RPC. For large batches, write `{ "calls": [{ "tool": "..." }] }` to a normal JSON file and run `webstudio mcp run .temp/mcp-calls.json`.
- Use JSON strings for `brief` fields. Never pass boolean flags such as `{"brief":true}`.
- Treat `webstudio mcp single-op-call` and `webstudio mcp run` stderr lines as progress checkpoints; stdout remains JSON on both success and failure. On failure, parse stdout for `{ "ok": false, "error": { "code": "...", "message": "..." } }` before deciding what to fix.
- If a CLI/MCP tool crashes, hangs, gives a confusing error, needs an undocumented workaround, or forces source-code inspection for normal usage, ask the user to report it in Discord `#help` at https://wstd.us/community. Give them a complete copy-paste report with the goal, expected behavior, actual error, exact command/tool call, stdout JSON, stderr/lifecycle logs, environment, workaround, and secrets redacted.
- Run one-shot `webstudio mcp single-op-call` commands sequentially against a linked `.webstudio` folder. If a command returns `PROJECT_SESSION_BUSY`, another CLI/MCP process is updating the local session; wait a moment and retry sequentially.
- In delegated or non-streaming agent environments, do not batch many MCP calls silently and do not wrap many shortcut or `webstudio mcp single-op-call` commands in a shell loop. Treat each parent-visible checkpoint as the unit of work. If the parent asks for status within 30 seconds, run exactly one shortcut command such as `webstudio meta.index` or one explicit `webstudio mcp single-op-call` command, report that command/result, then wait for the parent to continue. Do not take a broad task such as creating a full design-system page as one execution unit. Call `workflow.next {"goal":"design-system-page"}`, report the returned phase/checkpoint, wait until the parent continues, call `checkpoint.ack {"reported":true,"continueAfterReport":true,"summary":"<what you reported>"}`, complete exactly that bounded phase, and return: discovery, page creation, one dry-run JSX section, one committed JSX section, one `components.coverage-insert-next` call, or one presentation pass. Phase commands do not include nextPhase in their own output. After the parent continues, acknowledge the previous checkpoint first, then call `workflow.next` with the next phase. For all-component design-system pages, checkpoint after workflow planning, discovery, page creation, call `components.coverage-insert-next` once before checkpointing again, then finish with `workflow.next {"goal":"design-system-page","phase":"presentation-pass"}`. Coverage 72/72 is necessary but not sufficient: the page must be organized into styled, real-world examples, not raw unstyled component dumps.
- For design-system or “use every component” tasks, start with compact `webstudio components.coverage-plan`, checkpoint, then request component coverage details with `webstudio components.coverage-plan '{"detail":"roots","offset":20}'` or `{"detail":"parts"}` only when needed. Do not pass `detail` to `list-pages`; use `list-pages {}` or `get-page-by-path` for page lookup.
- MCP tool shortcuts are only for MCP tools. If a shortcut is ambiguous with a real top-level command, the real top-level command wins; use `webstudio mcp single-op-call <tool> '<json>'` to force the MCP path.

::doc-section{field="implementationProcess"}

## LLM Implementation Process

Use this process for user requests that change Webstudio content, layout, styles, assets, pages, redirects, resources, or publishing state:

1. Discover capabilities with `webstudio man --json`, `webstudio schema api`, `webstudio schema mcp`, MCP `meta.index`, `meta.guide`, `meta.get_more_tools`, `components.list`, `components.summary`, `components.coverage-plan`, `components.search`, `components.get`, `templates.list`, and `templates.get`. From a shell, prefer shortcut calls such as `webstudio meta.index` and `webstudio components.search '{"brief":"button"}'` for these focused tool calls; use `webstudio mcp single-op-call` when you need the explicit MCP form. Read full resources such as `webstudio://project/tools` and `webstudio://project/components` only when needed. Do not write scripts to parse full MCP discovery JSON for normal lookup.
2. Inspect current project state with semantic reads such as `get-project-settings`, `list-pages`, `get-page-by-path`, `list-instances`, `inspect-instance`, `get-styles`, `list-assets`, `list-breakpoints`, and `snapshot` only when needed. Before changing a project, read `get-project-settings` and follow any non-empty `meta.agentInstructions`. These are shared project instructions, not a place for secrets.
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

Before authoring unfamiliar expressions, read `webstudio://project/expressions` with MCP `resources/read` or `webstudio mcp read-resource webstudio://project/expressions`. It documents the supported expression subset, method allowlist, scope, Collection context, and validation limits.

- Use direct value tools for fixed content. For one visible text child, use `update-text` with plain `text`. For a bounded multi-instance literal replacement, use `replace-text` with `find`, `replace`, `pagePath` or `pageId`, and `limit`; it does not change expression children. Use `replace-prop-text` for bounded changes inside static string props, optionally limited to prop names or instance ids; it never changes dynamic bindings. For static props such as `aria-label`, `alt`, `id`, `class`, `href`, or button labels stored as props, use `update-props` with the prop's direct type/value.
- Use `bind-props` only when the prop must stay dynamic: an expression, resource result, action, or existing scoped runtime context such as `system`. Do not use `bind-props` just to set a fixed string.
- Direct prop string example: `{"updates":[{"instanceId":"button-id","name":"aria-label","type":"string","value":"Open menu"}]}`.
- Expression binding example: `{"bindings":[{"instanceId":"link-id","name":"href","binding":{"type":"expression","value":"currentPost.url"}}]}`.
- Page metadata fields such as `title`, `description`, `language`, `redirect`, and custom meta content accept plain fixed text. For computed values, pass JavaScript expression code such as `pageTitle ?? "Pricing | Acme"`.
- Page `status` accepts a fixed HTTP status code as a number from 200 through 599, for example `302`. For a dynamic status, pass JavaScript expression code such as `system.status`.
- Page metadata update example: use `update-page` with `{"pageId":"page-id","values":{"title":"Pricing | Acme","meta":{"description":"Plans for teams"}}}`.
- Draft a page with `update-page` and `{"pageId":"page-id","values":{"isDraft":true}}`. It remains editable and previewable but is omitted from every publish target, including staging, and from sitemap output.
- Stage a draft page for a future publish with `{"pageId":"page-id","values":{"isDraft":false}}`. This clears draft state but does not deploy the site. The home page and `/*` catch-all page cannot be drafts.
- Resource `url` accepts plain fixed URLs and paths. For computed URLs, pass JavaScript expression code such as `"https://api.example.com/items?tag=" + filters.tag`. Resource header values, search parameter values, and text bodies accept expressions for dynamic values; for fixed text, use `{ "type": "literal", "value": "application/json" }`.
- Resource update example: use `update-resource` with `{"resourceId":"resource-id","values":{"url":"https://api.example.com/items"}}`.
- Data variable values support `string`, `number`, `boolean`, `string[]`, and `json`. Use `string[]` only for arrays where every item is a string; use `json` for objects, mixed arrays, filters, and nested data.
- Parameters are internal scoped runtime values from pages, collections, or components. They are not a public authoring surface: do not create, update, or delete parameter records. Public tools should preserve existing parameter records and may reference documented context values such as `system` in expressions where they are already in scope.
- Use scoped resources for read data. A GET resource created with `scopeInstanceId`/`dataSourceName` defaults to `exposeAsDataSource:true`, becomes a scoped resource data variable, is generated into the page resource `data` map, and may be loaded while rendering the page. Read the loaded resource result from its wrapper, usually `.data`.
- Use prop-bound resources for actions. A resource created without `scopeInstanceId` and bound to a component prop such as Form `action` with `bind-props` and `binding.type: "resource"` becomes an action resource in the page resource `action` map. Use this for POST, PUT, DELETE, webhooks, GraphQL submissions, and anything that should run only from an explicit form/action flow.
- POST, PUT, and DELETE resources default to `exposeAsDataSource:false`, even with a scope. Set `exposeAsDataSource:true` only for an intentional render-time read such as a GraphQL POST query; provide `scopeInstanceId` and inspect the returned warning. Set it to `false` during `update-resource` to detach existing render-time exposure.
- For dynamic resource query parameters prefer `searchParams`, for example `{"name":"tag","value":"filters.tag"}`. Use `{"type":"literal","value":"website"}` for fixed request text. Header values can be expressions such as `"\"Bearer \" + auth.token"`. Body can be an object expression, including GraphQL payloads such as `{ query: "...", variables: { slug: system.params.slug } }`.
- Resource methods are `get`, `post`, `put`, and `delete`. Optional resource controls are `graphql` and `system`. Use `control:"graphql"` for GraphQL POST resources with query bodies. Use `control:"system"` for built-in local resource URLs such as `"/$resources/current-date"` and for resources reading the built-in `system` parameter. The built-in system fields are `system.origin`, `system.pathname`, `system.params`, and `system.search`; do not use `system.path`.
- Whenever an array or object from a resource or data variable should render repeated UI, call `insert-collection` with the complete iterable and one repeated-item JSX root. The command creates the Collection, private item parameters, iterable binding, and descendant item bindings atomically. Use `collectionItem` and `collectionItemKey` expressions in the item JSX. Wrap multiple repeated siblings in one Element, and give repeated Radix items stable unique `value` bindings.
- Expressions are single JavaScript expressions, not statements or functions. Functions, arrow functions, classes, `new`, `this`, `await`, imports, arbitrary calls, increment/decrement, and assignment outside actions are unsupported. Prefer optional chaining, nullish coalescing, ternaries, property/index access, operators, and the documented string/array methods.

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
- Use plain fixed text where documented. Only encode a quoted JavaScript string literal when a field is explicitly documented as an expression-only value.
- Confirm destructive commands with --confirm only when user requested deletion/unpublish/replacement.
- Use webstudio schema api for machine-readable top-level command metadata and webstudio schema mcp for MCP tool schemas.

## Known Gaps

{{knownCliGapIndex}}
