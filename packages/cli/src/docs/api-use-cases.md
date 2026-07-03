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

- webstudio schema api --json
- webstudio man api --json
- webstudio man llm --json
- webstudio man mcp --json
- MCP tool: meta.index {}
- MCP tool: meta.guide {"brief":"Create a pricing page"}
- MCP tool: meta.get_more_tools {"brief":"update-styles"}

Notes:

- Use `tools/list` for machine-readable MCP tool schemas.
- Use `resources/list` and `resources/read` for longer MCP resources such as `webstudio://project/tools` and `webstudio://project/guide`.

## Inspect and refresh MCP session cache

Commands:

- MCP tool: status {}
- MCP tool: refresh {"namespaces":["pages","instances","styles"]}
- MCP tool: reset-session {}

Notes:

- Use status before a task to understand the cached ProjectSession state.
- Use refresh when project data may have changed outside the current MCP session.
- Use reset-session when local cached state is corrupt or incompatible.

## Visually verify rendered work with AI vision

Commands:

- MCP tool: preview.start {"host":"127.0.0.1","port":5173}
- MCP tool: preview.status {}
- MCP tool: screenshot {"path":"/","output":"current.png","viewport":{"width":1440,"height":900},"waitUntil":"load","waitForTimeout":250}
- MCP tool: screenshot.diff {"baselinePath":"before.png","currentPath":"current.png","outputDir":".webstudio/screenshots"}
- MCP tool: vision.install-ocr {"confirm":true}

Notes:

- Use this after page/content/style mutations and after generated project files are current so a vision-capable AI can see what was actually built.
- Use waitForSelector when the rendered app has a reliable ready marker, waitUntil:"networkidle" for network-heavy pages, and waitForTimeout only for final visual settling.
- For a fresh checkout, copied fixture, or newly generated app, run npm install or pnpm install in the generated project before preview.start or webstudio preview.
- If preview fails with a missing generated-app command/package such as react-router or vite, install the generated app dependencies and retry.
- When a baseline exists, use screenshot.diff to get changed regions, OCR textAnalysis, and diff artifact paths before deciding whether the result matches.
- If screenshot.diff reports OCR unavailable and the user agrees to install it, call vision.install-ocr {"confirm":true}; otherwise continue with pixel diff and visual inspection.
- Compare the PNG, OCR text evidence, and diff artifacts against the user's intent for layout, typography, colors, spacing, imagery, and responsive framing; then iterate with focused mutations.
- Root CLI equivalent: webstudio preview --template ssg, then webstudio screenshot <url> --output current.png.

## List pages

Commands:

- MCP tool: list-pages {"includeFolders":true}

## Read page by id

Commands:

- MCP tool: get-page {"pageId":"<pageId>"}

## Read page by path

Commands:

- MCP tool: get-page-by-path {"path":"/pricing"}

## Create page

Commands:

- MCP tool: create-page {"name":"Pricing","path":"/pricing"}

## Update page settings/metadata

Commands:

- MCP tool: update-page {"pageId":"<pageId>","values":{"title":"\"Pricing\"","meta":{"description":"\"Plans\"","status":"200"}}}
- MCP tool: update-page {"pageId":"<pageId>","values":{"meta":{"auth":{"login":"<login>","password":"<password>"}}}}

Notes:

- Page title and metadata text fields are expression-backed. For fixed text, send a quoted JavaScript string literal expression such as `"\"Pricing\""`.

## Read project settings

Commands:

- MCP tool: get-project-settings {}

## Update project settings

Commands:

- MCP tool: update-project-settings {"settings":"project-settings.json contents"}

## List redirects

Commands:

- MCP tool: list-redirects {}

## Create redirect

Commands:

- MCP tool: create-redirect {"oldPath":"/old","newPath":"/new","status":301}

## Update redirect

Commands:

- MCP tool: update-redirect {"oldPath":"/old","newPath":"/newer","status":302}
- MCP tool: update-redirect {"oldPath":"/old","status":null}

## Delete redirect

Commands:

- MCP tool: delete-redirect {"oldPath":"/old"}

## List breakpoints

Commands:

- MCP tool: list-breakpoints {}

## Create breakpoint

Commands:

- MCP tool: create-breakpoint {"breakpointId":"tablet","label":"Tablet","maxWidth":991}

## Update breakpoint

Commands:

- MCP tool: update-breakpoint {"breakpointId":"tablet","label":"Tablet","maxWidth":1023}
- MCP tool: update-breakpoint {"breakpointId":"tablet","condition":null,"minWidth":768}
- MCP tool: update-breakpoint {"breakpointId":"tablet","minWidth":null,"maxWidth":null,"condition":"(hover: hover)"}

## Delete breakpoint

Commands:

- MCP tool: delete-breakpoint {"breakpointId":"tablet","confirm":true}

## Duplicate page

Commands:

- MCP tool: duplicate-page {"pageId":"<pageId>","name":"Pricing Copy","path":"/pricing-copy"}

## List page templates

Commands:

- MCP tool: list-page-templates {}

## Create page from template

Commands:

- MCP tool: create-page-from-template {"templateId":"<templateId>","name":"Landing","path":"/landing"}

## Delete page

Commands:

- MCP tool: delete-page {"pageId":"<pageId>"}

## List folders

Commands:

- MCP tool: list-folders {"includePages":true}

## Create folder

Commands:

- MCP tool: create-folder {"name":"Blog","slug":"blog"}

## Update folder

Commands:

- MCP tool: update-folder {"folderId":"<folderId>","name":"Blog","slug":"blog"}

## Delete folder

Commands:

- MCP tool: delete-folder {"folderId":"<folderId>"}

## List element instances

Commands:

- MCP tool: list-instances {"pagePath":"/","maxDepth":3}

## Inspect one element instance

Commands:

- MCP tool: inspect-instance {"instanceId":"<instanceId>","include":["props","styles","children"]}

## Append/prepend/replace child elements

Commands:

- MCP tool: append-instance {"parentInstanceId":"<instanceId>","children":"children.json contents"}

## Move elements

Commands:

- MCP tool: move-instance {"moves":"moves.json contents"}

## Clone element subtree

Commands:

- MCP tool: clone-instance {"sourceInstanceId":"<instanceId>","parentInstanceId":"<targetParentId>"}

## Delete element subtree

Commands:

- MCP tool: delete-instance {"instanceId":"<instanceId>"}

## List text/expression children

Commands:

- MCP tool: list-texts {"pagePath":"/"}

## Update text child

Commands:

- MCP tool: update-text {"instanceId":"<instanceId>","childIndex":0,"text":"Launch faster"}

## Update props

Commands:

- MCP tool: update-props {"updates":"props.json contents"}

Notes:

- Use this for fixed prop values such as `aria-label`, `alt`, `id`, static `href`, and other direct string/number/boolean/json prop values.
- Do not use bindings just to set static text.

## Delete props

Commands:

- MCP tool: delete-props {"deletions":"props.json contents"}

## Bind props to expressions/resources/actions

Commands:

- MCP tool: bind-props {"bindings":"bindings.json contents"}

Notes:

- Use this only when the prop should remain dynamic: expression, parameter, resource, or action binding.
- For a fixed string value, use `update-props` with `type:"string"` and a direct `value` instead.

## Read styles

Commands:

- MCP tool: get-styles {"instanceId":"<instanceId>","includeTokens":true}

## Update local styles

Commands:

- MCP tool: update-styles {"updates":"styles.json contents"}

## Delete local styles

Commands:

- MCP tool: delete-styles {"deletions":"styles.json contents"}

## Replace matching style values

Commands:

- MCP tool: replace-styles {"replacements":"replace.json contents"}

## List design tokens

Commands:

- MCP tool: list-design-tokens {"withUsage":true}

## Create design tokens

Commands:

- MCP tool: create-design-token {"tokens":"tokens.json contents"}

## Update design token styles

Commands:

- MCP tool: update-design-token-styles {"styleSourceId":"<tokenId>","updates":"styles.json contents"}

## Delete design token styles

Commands:

- MCP tool: delete-design-token-styles {"styleSourceId":"<tokenId>","deletions":"styles.json contents"}

## Attach design token to instances

Commands:

- MCP tool: attach-design-token {"styleSourceId":"<tokenId>","instanceIds":"instances.json contents"}

## Detach design token from instances

Commands:

- MCP tool: detach-design-token {"styleSourceId":"<tokenId>","instanceIds":"instances.json contents"}

## Extract design token from local styles

Commands:

- MCP tool: extract-design-token {"token":"token.json contents"}

## List CSS variables

Commands:

- MCP tool: list-css-variables {"withUsage":true}

## Define CSS variables

Commands:

- MCP tool: define-css-variable {"variables":"vars.json contents"}

## Delete CSS variables

Commands:

- MCP tool: delete-css-variable {"names":"names.json contents","confirm":true}

## Rewrite CSS variable references

Commands:

- MCP tool: rewrite-css-variable-refs {"variables":"variables.json contents"}

## List data variables

Commands:

- MCP tool: list-variables {}

## Create data variable

Commands:

- MCP tool: create-variable {"scopeInstanceId":"<instanceId>","name":"title","value":{"type":"string","value":"Hello"}}

## Update data variable

Commands:

- MCP tool: update-variable {"variableId":"<variableId>","value":{"type":"json","value":{"count":1}}}

## Delete data variable

Commands:

- MCP tool: delete-variable {"variableId":"<variableId>"}

## List resources

Commands:

- MCP tool: list-resources {}

## Create resource

Commands:

- MCP tool: create-resource {"name":"Posts","method":"get","url":"\"https://api.example.com/posts\""}

## Update resource

Commands:

- MCP tool: update-resource {"resourceId":"<resourceId>","values":{"url":"\"https://api.example.com/posts\""}}

## Delete resource

Commands:

- MCP tool: delete-resource {"resourceId":"<resourceId>"}

## List assets

Commands:

- MCP tool: list-assets {"withUsage":true}

## Upload one asset

Commands:

- MCP tool: upload-asset {"asset":"asset.json contents","assetsDir":".webstudio/assets"}

## Upload asset batch

Commands:

- MCP tool: upload-assets {"assets":"assets.json contents","assetsDir":".webstudio/assets"}

## Find asset usage

Commands:

- MCP tool: find-asset-usage {"assetId":"<assetId>"}

## Replace asset references

Commands:

- MCP tool: replace-asset {"fromAssetId":"<oldAssetId>","toAssetId":"<newAssetId>","confirm":true}

## Delete assets

Commands:

- MCP tool: delete-asset {"assetId":"<assetId>","confirm":true}

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

- MCP tool: snapshot {"include":["marketplaceProduct"]}
- MCP tool: apply-patch {"baseVersion":"<version>","transactions":"patch.json contents"}

Patch namespaces:

- marketplaceProduct

## Search and inspect safely

Commands:

- MCP tool: list-instances {"pagePath":"/","maxDepth":5}
- MCP tool: inspect-instance {"instanceId":"<instanceId>","include":["props","styles","children"]}
- MCP tool: list-texts {"pagePath":"/"}
- MCP tool: list-assets {"withUsage":true}
- MCP tool: find-asset-usage {"assetId":"<assetId>"}
- MCP tool: snapshot {"include":["pages","instances","props","resources","assets"]}

Notes:

- Use this for finding elements by label, type, href/resource patterns, HTML snippets, missing accessibility metadata, or asset usage.

## Refactor targeted content

Commands:

- MCP tool: list-instances {"pagePath":"/"}
- MCP tool: list-texts {"pagePath":"/"}
- MCP tool: update-text {"instanceId":"<instanceId>","childIndex":0,"text":"Launch faster"}
- MCP tool: update-props {"updates":"props.json contents"}
- MCP tool: update-page {"pageId":"<pageId>","values":{"title":"\"Pricing\"","meta":{"description":"\"Plans\""}}}
- MCP tool: update-resource {"resourceId":"<resourceId>","values":{"url":"\"https://api.example.com/posts\""}}
- MCP tool: replace-asset {"fromAssetId":"<oldAssetId>","toAssetId":"<newAssetId>","confirm":true}
- MCP tool: replace-styles {"replacements":"replace.json contents"}
- MCP tool: rewrite-css-variable-refs {"variables":"variables.json contents"}

Notes:

- Use focused reads first, then mutate only matching instances, props, metadata, resource URLs, assets, or style references.

## Optimize existing project

Commands:

- MCP tool: list-pages {"includeFolders":true}
- MCP tool: update-page {"pageId":"<pageId>","values":{"title":"\"Pricing\"","meta":{"description":"\"Plans\""}}}
- MCP tool: update-props {"updates":"props.json contents"}
- MCP tool: list-breakpoints {}
- MCP tool: update-breakpoint {"breakpointId":"tablet","maxWidth":1023}
- MCP tool: get-styles {"instanceId":"<instanceId>","includeTokens":true}
- MCP tool: update-styles {"updates":"styles.json contents"}
- MCP tool: attach-design-token {"styleSourceId":"<tokenId>","instanceIds":"instances.json contents"}
- MCP tool: update-project-settings {"settings":"project-settings.json contents"}

Notes:

- Use this for SEO metadata, accessibility labels, responsive behavior, token consistency, and project settings.

## Connect external data

Commands:

- MCP tool: create-variable {"scopeInstanceId":"<instanceId>","name":"title","value":{"type":"string","value":"Hello"}}
- MCP tool: create-resource {"name":"Posts","method":"get","url":"\"https://api.example.com/posts\""}
- MCP tool: update-resource {"resourceId":"<resourceId>","values":{"url":"\"https://api.example.com/posts\""}}
- MCP tool: bind-props {"bindings":"bindings.json contents"}
- MCP tool: append-instance {"parentInstanceId":"<instanceId>","children":"children.json contents"}

Notes:

- Use this for CMS sections, blog listings, Ghost/headless CMS pages, n8n-style integrations, and API URLs built from variables.

## Support dynamic runtime behavior

Commands:

- MCP tool: append-instance {"parentInstanceId":"<instanceId>","children":"children.json contents"}
- MCP tool: update-props {"updates":"props.json contents"}
- MCP tool: bind-props {"bindings":"bindings.json contents"}
- MCP tool: create-resource {"name":"Seats","method":"get","url":"\"https://api.example.com/seats\""}
- MCP tool: snapshot {"include":["instances","props","resources"]}
- MCP tool: apply-patch {"baseVersion":"<version>","transactions":"patch.json contents"}

Notes:

- Use existing scripts/resources for behavior, then move presentational structure into editable Webstudio instances where possible.
- There is no dedicated semantic command yet for converting script-generated UI into editable Webstudio structure.

## Build authenticated pages

Commands:

- MCP tool: create-page {"name":"Account","path":"/account"}
- MCP tool: update-page {"pageId":"<pageId>","values":{"meta":{"auth":{"login":"<login>","password":"<password>"}}}}
- MCP tool: create-resource {"name":"Session","method":"get","url":"\"https://api.example.com/session\""}
- MCP tool: create-variable {"scopeInstanceId":"<instanceId>","name":"user","value":{"type":"json","value":{}}}
- MCP tool: update-props {"updates":"props.json contents"}
- MCP tool: bind-props {"bindings":"bindings.json contents"}

Notes:

- Basic auth is semantic today. Provider-specific Supabase/Firebase setup still requires manual resources, props, embeds, or patches.

## Generate from design input

Commands:

- MCP tool: create-page {"name":"Landing","path":"/landing"}
- MCP tool: create-design-token {"tokens":"tokens.json contents"}
- MCP tool: define-css-variable {"variables":"vars.json contents"}
- MCP tool: append-instance {"parentInstanceId":"<instanceId>","children":"children.json contents"}
- MCP tool: update-styles {"updates":"styles.json contents"}
- MCP tool: preview.start {"host":"127.0.0.1","port":5173}
- MCP tool: screenshot {"path":"/","output":"current.png","viewport":{"width":1440,"height":900},"waitUntil":"load","waitForTimeout":250}

Notes:

- Use this after external design interpretation. There is no dedicated import command for Figma, screenshots, Inception output, or design.md yet.

## Cross-project maintenance

Commands:

- webstudio init --link <api-share-link> --json
- webstudio permissions --json
- webstudio mcp

Notes:

- Public API and CLI intentionally operate on one configured project at a time. Use an external script to loop over projects.

# Known CLI Gaps

## General project search and audit

Missing:
No single semantic command searches across instance labels, props, hrefs, resource URLs, HTML embeds, asset references, and missing accessibility metadata.

Current fallback:
Use focused MCP reads such as list-instances, list-texts, list-assets, find-asset-usage, and snapshot.

Suggested commands:

- search-project
- audit-accessibility
- find-prop-usage

## Save and manage page templates

Missing:
CLI can list page templates and create pages from existing templates, but cannot save a page as a template or update/delete templates semantically.

Current fallback:
Use MCP snapshot and apply-patch only when the template data model is understood.

Suggested commands:

- create-page-template
- update-page-template
- delete-page-template

## Semantic marketplace metadata

Missing:
Marketplace metadata is only available through MCP snapshot/apply-patch, not dedicated semantic commands.

Current fallback:
Use MCP snapshot --include marketplaceProduct and apply-patch.

Suggested commands:

- get-marketplace
- update-marketplace

## Provider-specific authenticated pages

Missing:
CLI supports page basic auth and generic resources/props/embeds, but not guided Supabase/Firebase auth setup.

Current fallback:
Create the page, resources, variables, props, and embeds manually with existing MCP semantic tools.

Suggested commands:

- setup-auth-page

## Dynamic script/runtime integration helpers

Missing:
CLI can manipulate props/resources/embeds, but has no semantic workflow for converting script-generated UI into editable Webstudio structures.

Current fallback:
Use MCP append-instance, props, resources, and raw patch where necessary.

Suggested commands:

- integrate-runtime-ui

## Generate from design input

Missing:
No command imports Figma, screenshots, Inception output, or design.md and turns it into pages/tokens/layout.

Current fallback:
Use external generation, then apply semantic CLI commands or apply-patch.

Suggested commands:

- generate-from-design

## Built-in cross-project maintenance

Missing:
Public API and CLI intentionally operate on one configured project at a time; there is no built-in multi-project discovery or loop runner.

Current fallback:
Run the CLI from an external script that reconfigures one project/session at a time.

Suggested commands:

- none
