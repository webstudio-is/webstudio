# CLI API Use Cases

## Link/configure one project

Commands:

- webstudio init --link <api-share-link> --json

Notes:

- Writes local project id and global origin/token config.

## Import synced project bundle into another project

Commands:

- webstudio sync
- webstudio import --to <destination-share-link>
- MCP tool: import {"to":"<destination-share-link>"}

Notes:

- Imports local `.webstudio/data.json` into the destination project.
- Destination share link must allow build/import access.
- Use `--skip-assets` only when asset rows and files should not be imported.

## Identify current token

Commands:

- MCP tool: whoami {}

## Check token permissions

Commands:

- webstudio permissions --json

## Inspect project/build/version

Commands:

- MCP tool: inspect {}
- MCP tool: snapshot {"include":["pages","instances","styles"]}

## Discover CLI/API capabilities

Commands:

- webstudio schema api
- webstudio schema mcp
- webstudio man --json
- webstudio man llm --json
- MCP tool: meta.index {}
- MCP tool: meta.guide {"brief":"Create a pricing page"}
- MCP tool: meta.get_more_tools {"brief":"update-styles"}
- webstudio mcp list-resources
- webstudio mcp read-resource webstudio://project/guide
- webstudio mcp read-resource webstudio://project/expressions

Notes:

- Use `webstudio schema mcp` for a compact machine-readable MCP tool overview. Add `--verbose` or use focused `meta.get_more_tools` calls only when exact input schemas are needed.
- Use focused MCP tools for discovery first: `meta.index`, `meta.guide`, `meta.get_more_tools`, `components.list`, `components.summary`, `components.search`, `components.get`, `templates.list`, and `templates.get`. Protocol clients can use `resources/list` and `resources/read`; shell agents can use `webstudio mcp list-resources` and `webstudio mcp read-resource <uri>`. Read longer resources such as `webstudio://project/tools` and `webstudio://project/components` only when focused tools are insufficient.
- `components.summary` returns counts by default; request `{"detail":"components","limit":20}` for paginated entries. Registry list tools return compact metadata, while `components.get` and `templates.get` return focused full details.
- Read `webstudio://project/expressions` before authoring unfamiliar computed text, prop bindings, resource expressions, actions, or Collection item bindings.
- From a shell, call one MCP tool with the shortcut form `webstudio <tool> '<json>'`, for example `webstudio components.summary`. The explicit equivalent is `webstudio mcp single-op-call <tool> '<json>'`. Use `--input-file` for large payloads.

## Inspect external shadcn registry items

Commands:

- webstudio registry inspect --source https://example.com/r/registry.json --item button --json
- webstudio registry inspect --source ./registry.json --item dialog --json
- webstudio registry inspect --source https://example.com/r/button.json --json

Notes:

- Reads a local or remote registry item without installing files or changing the configured Webstudio project.
- Returns the item name, description, package and registry dependencies, file paths/targets, available docs, and a read-only compatibility report.
- The report explicitly says whether installation or editable-component conversion is supported, lists declared requirements and manual steps, and says when arbitrary source code was not analyzed.
- This is an inspection step only. It does not install files or change the configured project.

## Understand what MCP can do

Commands:

- webstudio man mcp
- MCP tool: meta.index {}
- MCP tool: meta.guide {"brief":"What can Webstudio MCP do?"}

MCP lets agents work on one configured Webstudio project. Agents can:

- Inspect the linked project, token permissions, and latest editable build.
- Read selected project data for audits, migrations, and repair.
- Search labels, text, props, resource URLs, asset metadata, and styles.
- Audit accessibility, security, SEO, performance settings, unused assets, ineffective Collection styles, and unused or duplicate style data.
- Create and edit pages, folders, redirects, breakpoints, and page templates.
- Create pages from reusable templates.
- Update page metadata, SEO fields, auth settings, and marketplace metadata.
- Insert components and styled JSX sections.
- Create data-driven lists, grids, cards, and similar repeated UI from array or object data in one Collection operation.
- Move, copy, wrap, unwrap, convert, rename, retag, and delete elements.
- Update text, rich text, props, bindings, and actions.
- Create and update local styles, design tokens, style sources, and CSS variables.
- Create static data variables and JSON variables.
- Create HTTP, GraphQL, and system resources.
- Use system resources for sitemap, current date, and assets.
- Bind resources to rendered data or form/action props.
- Upload, replace, delete, and inspect asset usage.
- Publish, unpublish, inspect publish jobs, and manage custom domains.
- Start preview, capture screenshots, compare screenshot diffs, and use OCR when installed.

## Inspect and refresh MCP session cache

Commands:

- MCP tool: status {}
- MCP tool: status {"verbose":true}
- MCP tool: refresh {"namespaces":["pages","instances","styles"]}
- MCP tool: reset-session {}

Notes:

- Use status before a task to understand the cached ProjectSession state.
- Use status with `{"verbose":true}` only when debugging full namespaces, freshness, compatibility, or diagnostics.
- Use refresh when project data may have changed outside the current MCP session.
- Use reset-session when local cached state is corrupt or incompatible.

## Visually verify rendered work with AI vision

Commands:

- MCP tool: preview.start {"host":"127.0.0.1","port":5173}
- MCP tool: preview.status {}
- MCP tool: preview.stop {}
- MCP tool: screenshot {"path":"/","output":".webstudio/screenshots/home-current.png","viewport":{"width":1440,"height":900},"waitUntil":"load","waitForTimeout":250}
- MCP tool: screenshot {"path":"/pricing","output":".webstudio/screenshots/pricing-current.png","viewport":{"width":1440,"height":900},"waitUntil":"load","waitForTimeout":250}
- MCP tool: screenshot {"baseUrl":"http://127.0.0.1:5177","path":"/pricing","output":".webstudio/screenshots/pricing-current.png","viewport":{"width":1440,"height":900},"waitUntil":"load","waitForTimeout":250}
- MCP tool: screenshot.diff {"baselinePath":".webstudio/screenshots/home-before.png","currentPath":".webstudio/screenshots/home-current.png","outputDir":".webstudio/screenshots/diff"}
- MCP tool: screenshot.diff {"baselinePath":".webstudio/screenshots/home-before.png","currentPath":".webstudio/screenshots/home-current.png","outputDir":".webstudio/screenshots/diff","expectedText":["Pricing","Start free"]}
- MCP tool: screenshot.diff {"baselinePath":".webstudio/screenshots/home-before.png","currentPath":".webstudio/screenshots/home-current.png","outputDir":".webstudio/screenshots/diff","expectedVisual":{"maxMismatchPercentage":2,"maxChangedRegions":3,"dominantColorChange":{"channel":"luminance","direction":"increase","minMagnitude":10}}}
- MCP tool: screenshot.diff {"baselinePath":".webstudio/screenshots/pricing-before.png","currentPath":".webstudio/screenshots/pricing-current.png","outputDir":".webstudio/screenshots/diff"}
- MCP tool: vision.install-ocr {"confirm":true}

Notes:

- Use this after page/content/style mutations and after generated project files are current so a vision-capable AI can see the production-like generated site.
- For multi-page work, capture every changed page by `path` through the same preview server; no click navigation is required.
- After MCP mutations, path screenshots regenerate/restart preview as needed before capture; when preview is fresh, repeated path screenshots reuse the running server.
- Do not call `preview.start` through one-shot `webstudio mcp single-op-call`: it is long-lived. From a shell, use `webstudio mcp run` with preview.start, screenshot, and preview.stop in one shared process, or use a real long-running MCP client.
- From one-shot shell calls or another process, pass `baseUrl` with `path` to capture an already-running preview/site without generating, building, starting, or restarting preview.
- Use preview.stop only in the same long-running MCP server or `webstudio mcp run` process that started preview. A separate one-shot `single-op-call` process does not own another process's preview controller.
- Use waitForSelector when the rendered app has a reliable ready marker, waitUntil:"networkidle" for network-heavy pages, and waitForTimeout only for final visual settling.
- Preview installs generated app dependencies under `.webstudio/preview` and reuses them across regenerations.
- Do not add generated-preview dependencies to the repository root `package.json` or `pnpm-lock.yaml`.
- If dependency installation fails, check npm and network configuration, then reinstall or update the Webstudio CLI if the problem persists.
- When a baseline exists, use screenshot.diff once per baseline/current page or viewport pair to get changed regions, OCR textAnalysis, and diff artifact paths before deciding whether the result matches. Pass expectedText for explicit pass/fail current-screen text assertions with found and missing text. Pass expectedVisual for pass/fail limits on pixel mismatch percentage, changed-region count, or the overall dominant color/brightness direction.
- If screenshot.diff reports OCR unavailable and the user agrees to install it, call vision.install-ocr {"confirm":true}; otherwise continue with pixel diff and visual inspection.
- Compare the PNG, OCR text evidence, and diff artifacts against the user's intent for layout, typography, colors, spacing, imagery, and responsive framing; then iterate with focused mutations.
- Root CLI equivalent: `webstudio screenshot --path /pricing --output pricing.png` generates a temporary production preview, captures that route, and stops the server. For repeated captures, keep `webstudio preview` running and pass its absolute URL to `webstudio screenshot`.

## List pages

Commands:

- MCP tool: list-pages {}
- MCP tool: list-folders {}

## Read page by id

Commands:

- MCP tool: get-page {"pageId":"<pageId>"}

## Read page by path

Commands:

- MCP tool: get-page-by-path {"path":"/pricing"}

## Create page

Commands:

- MCP tool: create-page {"name":"Pricing","path":"/pricing"}
- MCP tool: create-page {"name":"Pricing","path":"/pricing","title":"Pricing","meta":{"description":"Plans for teams"}}

Notes:

- `name`, `path`, page `title`, and metadata text fields accept plain fixed values.
- For computed page titles or metadata, send JavaScript expression code such as `pageTitle ?? "Pricing"`.

## Update page settings/metadata

Commands:

- MCP tool: update-page {"pageId":"<pageId>","values":{"title":"Pricing","meta":{"description":"Plans","status":"200"}}}
- MCP tool: update-page {"pageId":"<pageId>","values":{"meta":{"auth":{"method":"basic","login":"<login>","password":"<password>"}}}}

Notes:

- Page `title` and metadata text fields accept plain fixed values.
- For computed page titles or metadata, send JavaScript expression code such as `pageTitle ?? "Pricing"`.

## Read project settings

Commands:

- MCP tool: get-project-settings {}

Notes:

- Read `meta.agentInstructions` before making project changes. It contains the project's own guidance for AI agents.
- Agent instructions are shared project guidance. Do not store credentials or other secrets there.

## Update project settings

Commands:

- MCP tool: update-project-settings {"meta":{"siteName":"Acme"}}
- MCP tool: update-project-settings {"meta":{"agentInstructions":"Use existing design tokens and keep product copy concise."}}

## Read marketplace product

Commands:

- MCP tool: get-marketplace-product {}

## Update marketplace product

Commands:

- MCP tool: update-marketplace-product {"category":"pageTemplates","name":"Acme Template","thumbnailAssetId":"asset-id","author":"Acme Studio","email":"hello@example.com","website":"https://example.com","issues":"","description":"Reusable template project for Acme landing pages."}

## List redirects

Commands:

- MCP tool: list-redirects {}

## Create redirect

Commands:

- MCP tool: create-redirect {"old":"/old","new":"/new","status":301}

## Update redirect

Commands:

- MCP tool: update-redirect {"old":"/old","values":{"new":"/newer","status":302}}
- MCP tool: update-redirect {"old":"/old","values":{"status":null}}

## Delete redirect

Commands:

- MCP tool: delete-redirect {"old":"/old"}

## Set redirects

Commands:

- MCP tool: set-redirects {"redirects":[{"old":"/old","new":"/new","status":"301"}]}

## List breakpoints

Commands:

- MCP tool: list-breakpoints {}

## Create breakpoint

Commands:

- MCP tool: create-breakpoint {"label":"Tablet","maxWidth":991}

## Update breakpoint

Commands:

- MCP tool: update-breakpoint {"breakpointId":"tablet","values":{"label":"Tablet","maxWidth":1023}}
- MCP tool: update-breakpoint {"breakpointId":"tablet","values":{"condition":null,"minWidth":768}}
- MCP tool: update-breakpoint {"breakpointId":"tablet","values":{"minWidth":null,"maxWidth":null,"condition":"(hover: hover)"}}

## Delete breakpoint

Commands:

- MCP tool: delete-breakpoint {"breakpointId":"tablet"}

## Duplicate page

Commands:

- MCP tool: duplicate-page {"pageId":"<pageId>","name":"Pricing Copy","path":"/pricing-copy"}
- MCP tool: duplicate-page {"pageId":"<pageId>","name":"Paris","path":"/paris","substitutions":{"text":{"London":"Paris"},"variables":{"city":{"type":"string","value":"Paris"}}}}
- webstudio duplicate-page --page <pageId> --name Paris --path /paris --substitutions '{"text":{"London":"Paris"},"variables":{"city":{"type":"string","value":"Paris"}}}' --json

Notes:

- Text substitutions replace exact fixed text only in the duplicated page's text children, string props, title, and metadata.
- Variable substitutions are keyed by copied source-variable name and use typed variable values. The operation rejects missing or ambiguous names without committing a partial duplicate.
- Existing expressions and cloned variable/resource references keep their remapped ids.

## List page templates

Commands:

- MCP tool: list-page-templates {}

## Create page template

Commands:

- MCP tool: create-page-template {"name":"Landing Template","title":"Landing"}

## Update page template

Commands:

- MCP tool: update-page-template {"templateId":"<templateId>","values":{"name":"Article Template","meta":{"description":"Reusable article layout"}}}

## Delete page template

Commands:

- MCP tool: delete-page-template {"templateId":"<templateId>"}

## Duplicate page template

Commands:

- MCP tool: duplicate-page-template {"templateId":"<templateId>"}

## Reorder page template

Commands:

- MCP tool: reorder-page-template {"sourceTemplateId":"<sourceTemplateId>","targetTemplateId":"<targetTemplateId>","position":"before"}

## Create page from template

Commands:

- MCP tool: create-page-from-template {"templateId":"<templateId>","name":"Landing","path":"/landing"}

## Delete page

Commands:

- MCP tool: delete-page {"pageId":"<pageId>"}

## List folders

Commands:

- MCP tool: list-folders {}
- MCP tool: list-pages {}

## Create folder

Commands:

- MCP tool: create-folder {"name":"Blog","slug":"blog"}

## Update folder

Commands:

- MCP tool: update-folder {"folderId":"<folderId>","values":{"name":"Blog","slug":"blog"}}

## Delete folder

Commands:

- MCP tool: delete-folder {"folderId":"<folderId>"}

## List element instances

Commands:

- MCP tool: list-instances {"pagePath":"/","maxDepth":3}

## Inspect one element instance

Commands:

- MCP tool: inspect-instance {"instanceId":"<instanceId>","include":["props","styles","children"]}

## Insert authored JSX or one component template

Commands:

- MCP tool: insert-fragment {"parentInstanceId":"<instanceId>","fragment":"<ws.element ws:tag=\"section\" ws:style={css`padding: 32px;`}><ws.element ws:tag=\"h2\">Product OS</ws.element><radix.Switch><radix.SwitchThumb /></radix.Switch></ws.element>"}
- MCP tool: insert-component {"parentInstanceId":"<instanceId>","component":"@webstudio-is/sdk-components-react-radix:Switch"}
- MCP tool: insert-component {"parentInstanceId":"<instanceId>","component":"Form"}

Notes:

- Use MCP `insert-fragment` as the default way to author styled component trees. It converts JSX to a structured fragment before mutation.
- Use only exact component ids returned by `components.search`, `components.get`, or `templates.get`. Never derive or guess component ids.
- The `ws:` namespace contains specific Webstudio core components; it is not HTML-tag shorthand. Use `<ws.element ws:tag="div">` for a native `div` and `<ws.element ws:tag="form">` for a native form, never `<ws.div>` or `<ws.form>`.
- For Webstudio's complete form structure, discover the Form component and insert its automatic template with `insert-component` using component `"Form"`.
- MCP receives JSX as a JSON string because MCP arguments are JSON. The CLI converts it locally before the runtime mutation, so the project session receives structured Webstudio data, not JSX source.
- In `insert-fragment` JSX, use `ws:style={css\`...\`}`for Webstudio-native CSS, or use React-style object syntax such as`style={{ padding: 24 }}` when that is simpler. Both forms create editable Webstudio style data.
- Do not access host globals or dynamic code APIs in JSX fragments, including `process`, `globalThis`, `eval`, `Function`, or `constructor`.
- Use Webstudio prop names such as `class` and `for`; do not use React aliases `className` or `htmlFor`.
- Use Webstudio actions for event/action props, for example `onClick={new ActionValue(["event"], expression\`console.log(event)\`)}`. Do not pass JavaScript functions such as `onClick={() => ...}`.
- Plain prop values must be JSON-compatible: `null`, strings, booleans, finite numbers, arrays, and plain objects. Do not pass `undefined`, `Symbol`, `BigInt`, `NaN`, `Infinity`, `Date`, `Map`, `Set`, class instances, or circular objects; omit the prop, use plain data, or use `expression`/`ActionValue` when the value is dynamic.
- Template-backed components used in JSX must include required child/part components explicitly under the same parent structure as the template, for example `<radix.Switch><radix.SwitchThumb /></radix.Switch>`.
- Webstudio applies a registered template automatically when using `insert-component`, so composed components such as Switch include required child parts and styles.
- Use `components.list`, `components.summary`, `components.search`, `components.get`, `templates.list`, and `templates.get` to discover known registry items, component ids, props, templates, insertability, and content model. Read `webstudio://project/components` only when those focused tools are insufficient.
- Component/template registry items use a shadcn-compatible top-level shape plus Webstudio-specific superset metadata in `meta`. They are for Builder/MCP discovery, not a published shadcn install registry yet.
- Known components with `contentModel.category: "none"` are not standalone-insertable; insert their root component template instead so required providers/parents are included.
- Unknown custom component ids are a low-level extension mechanism, not a discovery fallback. Agents must not synthesize them.

## Make a region editable in Content mode

Commands:

- MCP tool: insert-component {"parentInstanceId":"<instanceId>","component":"ws:block"}
- MCP tool: inspect-instance {"instanceId":"<instanceId>","include":["children"]}

Notes:

- When a page will be handed to a Content-mode editor, wrap every region they should be able to edit in a Content Block (`ws:block`). Content-mode editors can edit text and supported props only in Content Block descendants. Content outside those blocks remains read-only, even when it looks like ordinary editable text.
- Put reusable insertable options inside the Content Block's `ws:block-template` child. A template is source material, not editor content: editors cannot edit or delete it directly. When an editor inserts a template, its copy becomes a direct child of the Content Block and is editable.
- Before handing off a page, verify with `inspect-instance` that the intended text, images, and links are inside a Content Block, and that templates include all required styling because Content-mode editors cannot use the Style panel.

## Move elements

Commands:

- MCP tool: move-instance {"moves":"moves.json contents"}

Notes:

- Use `position: "end"` to append an instance. Repeating this for A and then B preserves the final order A, B.
- A numeric `insertIndex` addresses the target parent's children before the moved instance is removed. Use it for exact placement; do not calculate the last index to append.
- Moves in one `moves` array are applied sequentially in array order.

## Clone element subtree

Commands:

- MCP tool: clone-instance {"sourceInstanceId":"<instanceId>","targetParentInstanceId":"<targetParentId>"}

## Delete element subtree

Commands:

- MCP tool: delete-instance {"instanceIds":["<instanceId>"]}

## List text/expression children

Commands:

- MCP tool: list-texts {"pagePath":"/"}

## Update text child

Commands:

- MCP tool: update-text {"instanceId":"<instanceId>","childIndex":0,"text":"Launch faster"}

## Replace bounded literal text

Commands:

- MCP tool: replace-text {"find":"Start free","replace":"Get started","match":"exact","pagePath":"/pricing","limit":20}

Notes:

- This changes only literal text children, never expression children. Scope it to pagePath or pageId and set a limit before a broad replacement.

## Replace bounded static prop text

Commands:

- MCP tool: replace-prop-text {"find":"old.example.com","replace":"www.example.com","match":"substring","names":["href","code"],"limit":20}

Notes:

- This changes only static string props such as href, alt, aria-label, title, and HTML embed code. It never changes expressions, resources, actions, assets, or other dynamic bindings. Use names or instanceIds and a limit to narrow the change.

## Replace bounded resource text

Commands:

- MCP tool: replace-resource-text {"find":"api.old.example.com","replace":"api.example.com","fields":["url"],"limit":20}

Notes:

- This changes resource names and fixed URL literals only. It skips dynamic URL expressions, headers, search parameters, request bodies, and GraphQL query code.

## Update props

Commands:

- MCP tool: update-props {"updates":"props.json contents"}
- MCP tool: replace-prop-text {"find":"Old label","replace":"New label","names":["aria-label","title"],"limit":20}

Notes:

- Use this for fixed prop values such as `aria-label`, `alt`, `id`, static `href`, and other direct string/number/boolean/json prop values.

## Add JSON-LD structured data

Commands:

- MCP tool: components.get {"component":"JsonLd"}
- MCP tool: insert-component {"parentInstanceId":"<headSlotInstanceId>","component":"JsonLd"}
- MCP tool: update-props {"updates":[{"instanceId":"<jsonLdInstanceId>","name":"code","type":"string","value":"{\"@context\":\"https://schema.org\",\"@type\":\"Organization\",\"name\":\"Acme\"}"}]}
- MCP tool: audit {"scopes":["seo"],"pagePath":"/"}

Notes:

- Prefer placing `JsonLd` inside `HeadSlot`.
- Store `code` as a JSON object or array encoded as a compact string. The Builder formats it for editing.
- The semantic prop update rejects malformed JSON and structurally invalid fixed JSON-LD with a precise JSON path.
- The SEO audit also warns about a missing top-level `@context`, unknown or superseded Schema.org terms, properties unsupported by the supplied type, and incompatible primitive value types.
- Schema.org vocabulary findings are warnings because custom vocabularies and extensions remain valid. Dynamic JSON-LD is marked as skipped for rendered validation.
- Do not use bindings just to set static text.

## Delete props

Commands:

- MCP tool: delete-props {"deletions":"props.json contents"}

## Bind props to expressions/resources/actions

Commands:

- MCP tool: bind-props {"bindings":"bindings.json contents"}

Notes:

- Use this only when the prop should remain dynamic: expression, resource, action, or an existing scoped runtime context value such as `system`.
- For a fixed string value, use `update-props` with `type:"string"` and a direct `value` instead.

## Read styles

Commands:

- MCP tool: get-styles {"instanceIds":["<instanceId>"],"includeTokens":true}

## Update local styles

Commands:

- MCP tool: update-styles {"updates":"styles.json contents"}

## Delete local styles

Commands:

- MCP tool: delete-styles {"deletions":"styles.json contents"}

## Replace matching style values

Commands:

- MCP tool: replace-styles {"property":"color","fromValue":{"type":"keyword","value":"red"},"toValue":{"type":"keyword","value":"blue"}}

## List design tokens

Commands:

- MCP tool: list-design-tokens {}
- MCP tool: list-design-tokens {"withUsage":true}
- MCP tool: list-design-tokens {"verbose":true}

Notes:

- The default response is compact and includes token id, name, declaration count, and optional usage count.
- Use `verbose:true` only when you need the full inline style declarations.

## Create design tokens

Commands:

- MCP tool: create-design-token {"tokens":"tokens.json contents"}

## Update design token styles

Commands:

- MCP tool: update-design-token-styles {"designTokenId":"<tokenId>","updates":"styles.json contents"}

## Delete design token styles

Commands:

- MCP tool: delete-design-token-styles {"designTokenId":"<tokenId>","deletions":"styles.json contents"}

## Attach design token to instances

Commands:

- MCP tool: attach-design-token {"designTokenId":"<tokenId>","instanceIds":"instances.json contents"}

## Detach design token from instances

Commands:

- MCP tool: detach-design-token {"designTokenId":"<tokenId>","instanceIds":"instances.json contents"}

## Extract design token from local styles

Commands:

- MCP tool: extract-design-token {"instanceIds":["<instanceId>"],"name":"Brand Primary","removeLocalProps":["color"]}

## List CSS variables

Commands:

- MCP tool: list-css-variables {"withUsage":true}

## Define CSS variables

Commands:

- MCP tool: define-css-variable {"vars":"vars.json contents"}

## Delete CSS variables

Commands:

- MCP tool: delete-css-variable {"names":"names.json contents","force":true}

## Rewrite CSS variable references

Commands:

- MCP tool: rewrite-css-variable-refs {"map":"variables.json contents"}

## List data variables

Commands:

- MCP tool: list-variables {}
- MCP tool: list-variables {"scopeInstanceId":"<instanceId>"}

Notes:

- Data variables live in the internal `dataSources` namespace.
- For raw `snapshot`, request the public `variables` namespace rather than the internal `dataSources` name. Raw patch payloads still use `dataSources` when applying direct changes.
- Scope variables to the instance where they should become available. Descendants can use them in expressions, and nested variables with the same name mask outer variables.

## Create data variable

Commands:

- MCP tool: create-variable {"scopeInstanceId":"<instanceId>","name":"title","value":{"type":"string","value":"Hello"}}
- MCP tool: create-variable {"scopeInstanceId":"<instanceId>","name":"count","value":{"type":"number","value":3}}
- MCP tool: create-variable {"scopeInstanceId":"<instanceId>","name":"featured","value":{"type":"boolean","value":true}}
- MCP tool: create-variable {"scopeInstanceId":"<instanceId>","name":"tags","value":{"type":"string[]","value":["news","product"]}}
- MCP tool: create-variable {"scopeInstanceId":"<instanceId>","name":"filters","value":{"type":"json","value":{"tag":"news"}}}

Notes:

- Data variable values support `string`, `number`, `boolean`, `string[]`, and `json`.
- Parameters are internal scoped runtime values provided by pages, collections, or components. They are not a public authoring surface: do not create, update, or delete parameter records. Use data variables/resources for user-authored data, and reference documented context values such as `system` only where they are already in scope.

## Update data variable

Commands:

- MCP tool: update-variable {"dataSourceId":"<variableId>","values":{"value":{"type":"json","value":{"count":1}}}}

## Delete data variable

Commands:

- MCP tool: delete-variable {"dataSourceId":"<variableId>"}

## List resources

Commands:

- MCP tool: list-resources {}
- MCP tool: list-resources {"scopeInstanceId":"<instanceId>"}

## Create resource

Commands:

- MCP tool: create-resource {"resource":{"name":"Posts","method":"get","url":"https://api.example.com/posts","headers":[]}}
- MCP tool: create-resource {"resource":{"name":"Posts","method":"get","url":"\"https://api.example.com/posts?tag=\" + filters.tag","headers":[]},"scopeInstanceId":"<instanceId>","dataSourceName":"posts"}
- MCP tool: create-resource {"resource":{"name":"Filtered Posts","method":"get","url":"https://api.example.com/posts","searchParams":[{"name":"tag","value":"filters.tag"},{"name":"source","value":{"type":"literal","value":"website"}}],"headers":[{"name":"Authorization","value":"\"Bearer \" + auth.token"}]},"scopeInstanceId":"<instanceId>","dataSourceName":"posts"}
- MCP tool: create-resource {"resource":{"name":"Post GraphQL","control":"graphql","method":"post","url":"https://api.example.com/graphql","headers":[{"name":"Content-Type","value":{"type":"literal","value":"application/json"}}],"body":"{ query: \"query Post($slug: String!) { post(slug: $slug) { title } }\", variables: { slug: system.params.slug } }"},"scopeInstanceId":"<instanceId>","dataSourceName":"post"}
- MCP tool: create-resource {"resource":{"name":"Current Date","control":"system","method":"get","url":"/$resources/current-date","headers":[]},"scopeInstanceId":"<instanceId>","dataSourceName":"currentDate"}

Notes:

- Resource `url` accepts plain fixed URLs and paths such as `https://api.example.com/posts` and `/$resources/current-date`.
- Resource `url` can also be a JavaScript expression when it is computed, such as `"https://api.example.com/posts?tag=" + filters.tag`.
- Header values, search parameter values, and body accept expressions for dynamic values. For fixed text, use `{"type":"literal","value":"application/json"}`; Webstudio stores the required string expression for you.
- Search parameter values, header values, and body expressions can read scoped variables and documented runtime context values such as `system` when they are available at the resource scope.
- Add `scopeInstanceId` and `dataSourceName` when the resource result should be exposed as a scoped read data variable. Scoped resources are generated into the page resource `data` map and may be loaded during page rendering. Use this for read-oriented resources such as GET CMS/API data.
- For submit/write/action resources, create the resource without `scopeInstanceId`, then bind a component prop such as a Form `action` with `bind-props` and `binding.type: "resource"`. Prop-bound resources are generated into the page resource `action` map instead of the read `data` map. Use this for POST, PUT, DELETE, webhooks, GraphQL submissions, and other explicit action flows.
- Resource `method` can be `get`, `post`, `put`, or `delete`. Use GET for read data, POST for creates/GraphQL/webhooks/form submissions, PUT for full updates or replacements, and DELETE for deletion actions.
- Optional `control` values are `graphql` and `system`. Use `graphql` for GraphQL-style requests, usually POST with a query body. Use `system` for built-in resources such as `"/$resources/sitemap.xml"`, `"/$resources/current-date"`, and `"/$resources/assets"` and when the resource should use the built-in `system` parameter. System fields are `system.origin`, `system.pathname`, `system.params`, and `system.search`.

## Update resource

Commands:

- MCP tool: update-resource {"resourceId":"<resourceId>","values":{"url":"https://api.example.com/posts"}}
- MCP tool: replace-resource-text {"find":"api.old.example.com","replace":"api.example.com","fields":["url"],"limit":20}

## Delete resource

Commands:

- MCP tool: delete-resource {"resourceId":"<resourceId>"}

## List assets

Commands:

- MCP tool: list-assets {"withUsage":true}

Notes:

- Image asset descriptions are the default alt text for asset-backed Image components.
- To generate missing descriptions, inspect the image in its rendered page or asset source, write a concise description of its purpose, and save it on the asset rather than duplicating it on each Image instance.

## Update asset metadata

Commands:

- MCP tool: update-asset {"assetId":"<assetId>","values":{"description":"Team collaborating around a whiteboard"}}

Notes:

- Use an empty description only when the image is intentionally decorative.
- Updating an image asset description updates the default alt text wherever that asset is used with an asset-backed alt prop.

## Generate missing image descriptions with an agent

Commands:

- MCP tool: audit {"scopes":["accessibility"],"verbose":true}
- MCP tool: set-image-descriptions {"updates":[{"assetId":"hero-id","description":"Team collaborating around a whiteboard"},{"assetId":"texture-id","decorative":true}]}
- MCP tool: audit {"scopes":["accessibility"]}

Notes:

- Start from `missing-image-description` findings. Inspect each image in its rendered page context before writing text.
- The vision-capable agent generates the wording; the CLI validates and stores it but does not contain its own vision model.
- Use `decorative:true` only when the image adds no information. This intentionally stores an empty description so later audits do not report it as missing.
- Re-run the accessibility audit after the update. Asset-backed Image components use the saved asset description as their default alt text.

## Manage fonts

Commands:

- MCP tool: list-fonts {"includeSystem":true}
- MCP tool: list-assets {"type":"font"}
- MCP tool: upload-asset {"asset":{"name":"acme-sans.woff2","type":"font","format":"woff2","meta":{"family":"Acme Sans","style":"normal","weight":400}},"assetsDir":".webstudio/assets"}
- MCP tool: update-styles {"updates":"styles.json contents"}

Notes:

- Use `list-fonts` to discover uploaded families and system stacks. Upload/delete fonts through the existing asset tools, then apply a family with a `font-family` style declaration.

## Upload one asset

Commands:

- MCP tool: upload-asset {"asset":{"name":"image.png","type":"image","format":"png","meta":{"width":1200,"height":630}},"assetsDir":".webstudio/assets"}

## Upload asset batch

Commands:

- MCP tool: upload-assets {"assets":[{"name":"image.png","type":"image","format":"png","meta":{"width":1200,"height":630}}],"assetsDir":".webstudio/assets"}

## Find asset usage

Commands:

- MCP tool: find-asset-usage {"assetId":"<assetId>"}

## Replace asset references

Commands:

- MCP tool: replace-asset {"fromAssetId":"<oldAssetId>","toAssetId":"<newAssetId>"}

## Delete assets

Commands:

- MCP tool: delete-asset {"assetIdsOrPrefixes":["<assetId>"],"force":true}

## Publish project

Commands:

- webstudio publish deploy --target production --json

## List publishes

Commands:

- webstudio publish list --json

## Check publish job

Commands:

- webstudio publish status --job <buildId> --json

## Unpublish

Commands:

- webstudio publish unpublish --target production --confirm --json

## List domains

Commands:

- webstudio domains list --json

## Create domain

Commands:

- webstudio domains create --domain example.com --json

## Update domain

Commands:

- webstudio domains update --domain-id <domainId> --domain www.example.com --json

## Delete domain

Commands:

- webstudio domains delete --domain-id <domainId> --confirm --json

## Verify domain

Commands:

- webstudio domains verify --domain-id <domainId> --json

## Make arbitrary store-level changes

Commands:

- MCP tool: inspect {}
- MCP tool: snapshot {"include":["<namespace>"]}
- MCP tool: apply-patch {"baseVersion":"<version>","transactions":"patch.json contents"}

Notes:

- Use only when no semantic command exists.

## Manage marketplace metadata

Commands:

- MCP tool: get-marketplace-product {}
- MCP tool: update-marketplace-product {"category":"pageTemplates","name":"Acme Template","thumbnailAssetId":"asset-id","author":"Acme Studio","email":"hello@example.com","website":"https://example.com","issues":"","description":"Reusable template project for Acme landing pages."}

Patch namespaces:

- marketplaceProduct

## Search and inspect safely

Commands:

- MCP tool: search-project {"query":"pricing"}
- MCP tool: search-project {"query":"api.example.com","scopes":["resources"]}
- MCP tool: list-instances {"pagePath":"/","maxDepth":5}
- MCP tool: inspect-instance {"instanceId":"<instanceId>","include":["props","styles","children"]}
- MCP tool: list-texts {"pagePath":"/"}
- MCP tool: list-assets {"withUsage":true}
- MCP tool: find-asset-usage {"assetId":"<assetId>"}
- MCP tool: snapshot {"include":["pages","instances","props","resources","assets"]}

Notes:

- Use `search-project` for query-driven lookup across labels, text, prop values, resource URLs, asset metadata, and styles. Use `audit` for project health findings.

## Audit project quality

Commands:

- webstudio audit --json
- webstudio audit --scopes accessibility --scopes seo --json
- webstudio audit --page-path /pricing --json
- webstudio audit --scopes accessibility --verbose --json
- webstudio audit --rendered --page-path /pricing --json
- webstudio audit --rendered --route-example post=/blog/hello --json
- webstudio audit --rendered --image-domain images.example.com --json
- MCP tool: audit {}
- MCP tool: audit {"scopes":["accessibility","security"],"severities":["error","warning"]}
- MCP tool: audit {"scopes":["accessibility"],"verbose":true}
- MCP tool: audit {"scopes":["craft"],"verbose":true}
- MCP tool: audit {"rendered":true,"verbose":true}

Notes:

- With no scopes, `audit` checks accessibility, security, SEO, performance settings, unused assets, ineffective Collection styles, non-GET resources exposed as render-time data, and unused or duplicate style data.
- Craft is opt-in and read-only. Run `audit` with `scopes:["craft"]` to detect whether the project is not using Craft, partially compatible, or compatible with the versioned Craft 1.2 profile. `profileStatuses` includes the University-doc provenance and the smallest safe next action. The audit never installs Craft or changes a non-Craft project.
- The `performance` scope reports disabled atomic CSS generation. A rendered audit also measures broken, eager below-fold, and oversized images, browser-marked render-blocking resources, and legacy font formats.
- Rendered image and resource metrics run only when the selected scopes include `performance`; responsive layout dimensions remain available whenever `rendered:true` is requested.
- Compact findings include stable ids, severity, message, and location. Use `--verbose` or `{"verbose":true}` for evidence, explanation, suggested remediation, skipped-check details, and manual-check workflows.
- `summary` counts all findings before severity filtering and pagination.
- `contractVersion` identifies the audit response contract. Handle a new value before assuming existing fields retain the same meaning.
- Expression-, resource-, and parameter-backed values that cannot be checked reliably appear in `skippedChecks`; they are not treated as passing or failing.
- Page filters apply to page-owned accessibility, security, and SEO checks. Asset and style usage remain project-wide to avoid false unused findings.
- Continue paginated results with `cursor`. Restart the audit if the project version changes.
- Verbose skipped-check and manual-check details are included on the first findings page only; their total counts remain available on every page.
- `manualChecks` describes responsive, hierarchy, and contrast checks that require preview screenshots and vision.
- Focused audits return only manual checks relevant to their selected scopes.
- In a long-lived MCP session, `{"rendered":true}` reuses preview and screenshot
  tools to capture every static page at mobile, desktop, and Builder breakpoint
  edges. Compact output reports rendered check/issue/failure counts; verbose
  output includes screenshot paths and measured layout dimensions.
- Dynamic route templates are skipped unless `--route-example <pageId>=<path>`
  (or MCP `routeExamples`) supplies a concrete path. The path must not contain
  unresolved `:` or `*` parameters.
- Plans above 120 captures return a short-lived confirmation token. Review the
  unchanged plan, then rerun with `--confirm-large-run` and
  `--confirmation-token`.
- Detailed rendered evidence is stored in a versioned manifest under
  `.webstudio/audits`; compact output includes its path and screenshot count.
- Rendered checks also report broken images, eager images below the fold, and
  image sources more than 2x their rendered dimensions in both axes, including
  Webstudio instance ids and measured dimensions when available.
- Rendered checks include sanitized Resource Timing evidence and report
  browser-marked render-blocking resources plus legacy `.ttf`, `.otf`, and
  `.woff` fonts without applying a universal transfer-size threshold.
- Fix findings through semantic mutation commands, then rerun `audit` to confirm their deterministic finding ids disappeared.

## Verify dynamic bindings

Commands:

- webstudio verify-bindings --json
- MCP tool: verify-bindings {"pagePath":"/pricing"}
- MCP tool: verify-bindings {"instanceId":"<instanceId>","limit":50}

Notes:

- Statically checks persisted text expressions, expression/action/resource/parameter props, resource expressions, and page metadata.
- Findings distinguish invalid syntax, unknown or out-of-scope variables, stale internal data-source ids, and missing resource or parameter references.
- Page and instance filters can be combined when the instance belongs to the selected page. Continue findings with `cursor`.
- This operation does not resolve rendered values or execute external resources. Preview representative loading, empty, error, and populated states after static findings are fixed.

## Refactor targeted content

Commands:

- MCP tool: list-instances {"pagePath":"/"}
- MCP tool: list-texts {"pagePath":"/"}
- MCP tool: update-text {"instanceId":"<instanceId>","childIndex":0,"text":"Launch faster"}
- MCP tool: replace-text {"find":"Old headline","replace":"New headline","match":"exact","pagePath":"/pricing","limit":20}
- MCP tool: update-props {"updates":"props.json contents"}
- MCP tool: update-page {"pageId":"<pageId>","values":{"title":"Pricing","meta":{"description":"Plans"}}}
- MCP tool: update-resource {"resourceId":"<resourceId>","values":{"url":"https://api.example.com/posts"}}
- MCP tool: replace-asset {"fromAssetId":"<oldAssetId>","toAssetId":"<newAssetId>"}
- MCP tool: replace-styles {"property":"color","fromValue":{"type":"keyword","value":"red"},"toValue":{"type":"keyword","value":"blue"}}
- MCP tool: rewrite-css-variable-refs {"map":"variables.json contents"}

Notes:

- Use focused reads first, then mutate only matching instances, props, metadata, resource URLs, assets, or style references. Use `replace-text` for bounded literal text changes, `replace-prop-text` for bounded static prop text, `replace-resource-text` for fixed resource names/URLs, and `update-text` for one known child or expressions.

## Optimize existing project

Commands:

- MCP tool: list-pages {}
- MCP tool: list-folders {}
- MCP tool: update-page {"pageId":"<pageId>","values":{"title":"Pricing","meta":{"description":"Plans"}}}
- MCP tool: update-props {"updates":"props.json contents"}
- MCP tool: list-breakpoints {}
- MCP tool: update-breakpoint {"breakpointId":"tablet","values":{"maxWidth":1023}}
- MCP tool: get-styles {"instanceIds":["<instanceId>"],"includeTokens":true}
- MCP tool: update-styles {"updates":"styles.json contents"}
- MCP tool: attach-design-token {"designTokenId":"<tokenId>","instanceIds":"instances.json contents"}
- MCP tool: update-project-settings {"meta":{"siteName":"Acme"}}

Notes:

- Use this for SEO metadata, accessibility labels, responsive behavior, token consistency, and project settings.

## Connect external data

Commands:

- MCP tool: create-variable {"scopeInstanceId":"<instanceId>","name":"title","value":{"type":"string","value":"Hello"}}
- MCP tool: create-variable {"scopeInstanceId":"<instanceId>","name":"tags","value":{"type":"string[]","value":["news","product"]}}
- MCP tool: create-variable {"scopeInstanceId":"<instanceId>","name":"filters","value":{"type":"json","value":{"tag":"news"}}}
- MCP tool: create-resource {"resource":{"name":"Posts","method":"get","url":"https://api.example.com/posts","searchParams":[{"name":"tag","value":"filters.tag"},{"name":"source","value":{"type":"literal","value":"website"}}],"headers":[]},"scopeInstanceId":"<instanceId>","dataSourceName":"posts"}
- MCP tool: create-resource {"resource":{"name":"Post GraphQL","control":"graphql","method":"post","url":"https://api.example.com/graphql","headers":[{"name":"Content-Type","value":{"type":"literal","value":"application/json"}}],"body":"{ query: \"query Post($slug: String!) { post(slug: $slug) { title } }\", variables: { slug: system.params.slug } }"},"scopeInstanceId":"<instanceId>","dataSourceName":"post"}
- MCP tool: create-resource {"resource":{"name":"Current Date","control":"system","method":"get","url":"/$resources/current-date","headers":[]},"scopeInstanceId":"<instanceId>","dataSourceName":"currentDate"}
- MCP tool: update-resource {"resourceId":"<resourceId>","values":{"url":"https://api.example.com/posts"}}
- MCP tool: bind-props {"bindings":"bindings.json contents"}
- MCP tool: insert-fragment {"parentInstanceId":"<instanceId>","fragment":"<ws.collection>{/_ collection content _/}</ws.collection>"}

Notes:

- Use this for CMS sections, blog listings, Ghost/headless CMS pages, n8n-style integrations, and API URLs built from variables.
- For read data, expose GET resources as scoped data variables with `scopeInstanceId`/`dataSourceName` and read the loaded result from the resource result wrapper, usually `.data`.
- For writes, webhooks, GraphQL submissions, and deletes, prefer unscoped resources bound to Form `action` props so they become action resources instead of auto-loaded read resources.
- Use direct props for fixed values and prop bindings only when a prop must read a data variable, resource, action, or documented runtime context value such as `system`.

## Render an array or object as repeated content

Commands:

- MCP tool: insert-collection {"parentInstanceId":"<instanceId>","data":{"type":"expression","value":"posts.data.items"},"itemFragment":"<ws.element ws:tag=\"article\"><ws.element ws:tag=\"h2\">{expression`collectionItem.title`}</ws.element></ws.element>"}
- MCP tool: inspect-instance {"instanceId":"<collectionId>","include":["props","bindings","children"]}

Notes:

- Use Collection whenever an array or object from a resource or data variable should render a list, grid, cards, table rows, options, tabs, or other repeated UI.
- Pass `insert-collection` the complete array or object. Do not pass the resource response wrapper or one indexed item. External resource arrays are commonly nested under the scoped resource result's `data` field or deeper.
- Pass one repeated-item Webstudio JSX root. The command creates the Collection, its private current-item/current-key parameters, the iterable binding, and descendant item bindings atomically.
- Collection renders the item root once for every entry. Use `expression` values such as `collectionItem.title` in descendant text and props. Object iteration also exposes `collectionItemKey`.
- Wrap multiple repeated sibling instances in one Element inside Collection.
- For repeated Radix items such as accordion items, tabs, or menu options, bind a stable unique id or slug to every required `value` prop.
- See the [Collection documentation](https://docs.webstudio.is/university/core-components/collection) for the equivalent Builder workflow.

## Support dynamic runtime behavior

Commands:

- MCP tool: integrate-runtime-ui {"parentInstanceId":"<instanceId>","resources":[{"resource":{"name":"Seats","method":"get","url":"https://api.example.com/seats","headers":[]},"dataSourceName":"Seats","exposeAsDataSource":true}],"structure":{"type":"collection","data":{"type":"expression","value":"Seats.data"},"itemFragment":{"children":[{"type":"id","value":"seat"}],"instances":[{"type":"instance","id":"seat","component":"Text","children":[{"type":"expression","value":"collectionItem.label"}]}],"props":[],"dataSources":[],"resources":[],"styleSources":[],"styleSourceSelections":[],"styles":[],"breakpoints":[],"assets":[]}},"retainedBehavior":[{"instanceId":"<scriptInstanceId>","responsibility":"Seat selection behavior"}]}
- MCP tool: update-props {"updates":"props.json contents"}
- MCP tool: bind-props {"bindings":"bindings.json contents"}
- MCP tool: create-resource {"resource":{"name":"Seats","method":"get","url":"https://api.example.com/seats","headers":[]}}
- MCP tool: snapshot {"include":["instances","props","resources"]}
- MCP tool: apply-patch {"baseVersion":"<version>","transactions":"patch.json contents"}

Notes:

- Use `integrate-runtime-ui` to create variables/resources, insert one editable fragment or Collection, and add safe data bindings in one transaction.
- List existing script-owned responsibilities under `retainedBehavior`. The operation preserves those instances and never evaluates or accepts replacement script bodies.
- `unsupportedConversions` records behavior that cannot be represented safely. Dry-run returns the complete transaction and the same retained/unsupported report without changing the project.
- New actions and HtmlEmbed scripts are intentionally rejected. Create normal editable components and data bindings; keep opaque runtime behavior in existing script instances.

## Build authenticated pages

Commands:

- MCP tool: meta.guide {"brief":"Build a Supabase-authenticated account page"}
- MCP tool: create-page {"name":"Account","path":"/account"}
- MCP tool: update-page {"pageId":"<pageId>","values":{"meta":{"auth":{"method":"basic","login":"<login>","password":"<password>"}}}}
- MCP tool: create-resource {"resource":{"name":"Session","method":"get","url":"https://api.example.com/session","headers":[]}}
- MCP tool: create-variable {"scopeInstanceId":"<instanceId>","name":"user","value":{"type":"json","value":{}}}
- MCP tool: update-props {"updates":"props.json contents"}
- MCP tool: bind-props {"bindings":"bindings.json contents"}

Notes:

- Inspect and reuse the project's existing auth convention before authoring. Do
  not add a second provider or session model implicitly.
- Model signed-out, loading, signed-in, and failed-auth states explicitly.
- Never store credentials, service-role keys, refresh tokens, private session
  values, or authenticated response bodies in project data, command output,
  screenshots, agent instructions, or error reports. Privileged provider calls
  and authorization enforcement belong server-side.
- Basic auth is semantic today. Provider-specific Supabase/Firebase setup still
  uses the existing resource, variable, prop, binding, and embed tools; there is
  no provider-specific installer.

## Generate from design input

Commands:

- MCP tool: meta.guide {"brief":"Recreate this Figma design as a responsive page"}
- MCP tool: create-page {"name":"Landing","path":"/landing"}
- MCP tool: create-design-token {"tokens":"tokens.json contents"}
- MCP tool: define-css-variable {"vars":"vars.json contents"}
- MCP tool: list-breakpoints {}
- MCP tool: insert-fragment {"parentInstanceId":"<instanceId>","fragment":"<ws.element ws:tag=\"section\"><ws.element ws:tag=\"p\">Section copy</ws.element></ws.element>"}
- MCP tool: update-styles {"updates":[{"instanceId":"<instanceId>","breakpointId":"<breakpointId-from-list-breakpoints>","property":"padding-left","value":{"type":"unit","unit":"px","value":24}}]}
- MCP tool: preview.start {"host":"127.0.0.1","port":5173}
- MCP tool: screenshot {"path":"/landing","output":"landing-desktop.png","viewport":{"width":1440,"height":900},"waitUntil":"load","waitForTimeout":250}
- MCP tool: screenshot {"path":"/landing","output":"landing-mobile.png","viewport":{"width":390,"height":844},"waitUntil":"load","waitForTimeout":250}
- MCP tool: screenshot {"baseUrl":"http://127.0.0.1:5177","path":"/landing","output":"landing-desktop.png","viewport":{"width":1440,"height":900},"waitUntil":"load","waitForTimeout":250}

Notes:

- Use this after the agent can inspect the supplied design. There is no direct
  Figma, screenshot, Inception, or `design.md` import command.
- Inspect and reuse existing variables, tokens, styles, components, assets, and
  page patterns before authoring. Build semantic editable structure rather than
  flattening the design into an image or absolute-positioned approximation.
- Verify one familiar viewport inside every distinct Builder breakpoint range,
  then run rendered audit and inspect the screenshots before completion.

## Cross-project maintenance

Commands:

- webstudio mcp run .temp/projects.json
- webstudio mcp run .temp/projects.json --dry-run
- webstudio mcp run .temp/projects.json --approve-mutations --concurrency 2

Notes:

- Put shared `calls` and a `projects` array of independently linked project roots in the existing `mcp run` manifest. Project roots are relative to the manifest file.
- Each project uses its own config, authentication, ProjectSession storage, checkpoint, and failure boundary. Confirmed successful calls are checkpointed. Reads can resume automatically; a mutation interrupted after dispatch is reported as ambiguous and is not replayed automatically, preventing silent duplicate writes.
- Focus the manifest on bounded reads or audits first. Use per-call `dryRun`, global `--dry-run`, or explicitly approve committed mutations with `--approve-mutations` after reviewing the manifest.

# Known CLI Gaps

## Provider-specific authenticated pages

Missing:
CLI supports page basic auth and generic resources/props/embeds, but not guided Supabase/Firebase auth setup.

Current fallback:
Call `meta.guide` with the provider-authenticated page goal, then create the
page, resources, variables, props, bindings, and embeds with existing semantic
tools.

Suggested commands:

- setup-auth-page

## Generate from design input

Missing:
No command imports Figma, screenshots, Inception output, or design.md and turns it into pages/tokens/layout.

Current fallback:
Call `meta.guide` with the design-input goal, let the agent inspect the supplied
design, then use semantic page, token, asset, fragment, style, preview,
screenshot, and audit tools. Use `apply-patch` only when no semantic operation
fits.

Suggested commands:

- generate-from-design

## Built-in cross-project maintenance

Missing:
Public API and CLI intentionally operate on one configured project at a time; there is no built-in multi-project discovery or loop runner.

Current fallback:
Run the CLI from an external script that reconfigures one project/session at a time.

Suggested commands:

- none
