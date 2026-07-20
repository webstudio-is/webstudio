import { serverOnlyRouterOperationMetadata } from "./__generated__/server-only-router-operation-metadata";
import { localOnlyOperationInputs } from "./local-operation-inputs";
import { publicRuntimeOperationContracts } from "./runtime-contracts";

export type PublicApiOperationDocumentation = {
  command: string;
  description: string;
  requiredOptions?: readonly string[];
  examples: readonly string[];
};

const curatedPublicApiOperationDocumentation = [
  {
    command: "whoami",
    description: "Identify the configured API share-link token",
    examples: ["webstudio whoami --json"],
  },
  {
    command: "permissions",
    description:
      "Show API, role, publish, and domain capabilities for the configured share-link token",
    examples: ["webstudio permissions --json"],
  },
  {
    command: "inspect",
    description: "Show project metadata and latest dev build version",
    examples: ["webstudio inspect --json"],
  },
  {
    command: "snapshot",
    description: "Read selected raw build namespaces",
    examples: [
      "webstudio snapshot --include pages,instances,props,styles --json",
    ],
  },
  {
    command: "apply-patch",
    description:
      "Apply Builder build patch transactions to the configured project",
    requiredOptions: ["base-version", "input", "json"],
    examples: [
      "webstudio apply-patch --base-version 42 --input patch.json --json",
    ],
  },
  {
    command: "list-pages",
    description: "List site pages",
    examples: [
      "webstudio list-pages --json",
      "webstudio list-pages --cursor 50 --json",
    ],
  },
  {
    command: "get-page",
    description: "Show one page by page id",
    requiredOptions: ["page", "json"],
    examples: ["webstudio get-page --page page-id --json"],
  },
  {
    command: "get-page-by-path",
    description: "Show one page by URL path",
    requiredOptions: ["path", "json"],
    examples: ["webstudio get-page-by-path --path /pricing --json"],
  },
  {
    command: "create-page",
    description: "Create a page in the configured project",
    requiredOptions: ["name", "path", "json"],
    examples: ["webstudio create-page --name Pricing --path /pricing --json"],
  },
  {
    command: "update-page",
    description: "Update page settings and metadata",
    requiredOptions: ["page", "json"],
    examples: [
      'webstudio update-page --page page-id --title "\\"Pricing\\"" --description "\\"Pricing plans\\"" --json',
    ],
  },
  {
    command: "get-project-settings",
    description: "Show project site metadata, compiler settings, and redirects",
    examples: ["webstudio get-project-settings --json"],
  },
  {
    command: "update-project-settings",
    description: "Update project site metadata and compiler settings from JSON",
    requiredOptions: ["input", "json"],
    examples: [
      "webstudio update-project-settings --input project-settings.json --json",
    ],
  },
  {
    command: "get-marketplace-product",
    description: "Show marketplace product metadata for the configured project",
    examples: ["webstudio get-marketplace-product --json"],
  },
  {
    command: "update-marketplace-product",
    description:
      "Update marketplace product metadata from JSON for the configured project",
    requiredOptions: ["input", "json"],
    examples: [
      "webstudio update-marketplace-product --input marketplace-product.json --json",
    ],
  },
  {
    command: "list-redirects",
    description: "List project redirects",
    examples: ["webstudio list-redirects --json"],
  },
  {
    command: "create-redirect",
    description: "Create a project redirect",
    requiredOptions: ["old", "new", "json"],
    examples: [
      "webstudio create-redirect --old /old --new /new --status 301 --json",
    ],
  },
  {
    command: "update-redirect",
    description: "Update a project redirect selected by its old path",
    requiredOptions: ["old", "json"],
    examples: [
      "webstudio update-redirect --old /old --new /newer --status 302 --json",
      "webstudio update-redirect --old /old --clear-status --json",
    ],
  },
  {
    command: "delete-redirect",
    description: "Delete a project redirect selected by its old path",
    requiredOptions: ["old", "json"],
    examples: ["webstudio delete-redirect --old /old --json"],
  },
  {
    command: "set-redirects",
    description:
      "Replace all project redirects from JSON. Prefer create/update/delete for single redirect edits.",
    requiredOptions: ["input", "json"],
    examples: ["webstudio set-redirects --input redirects.json --json"],
  },
  {
    command: "list-breakpoints",
    description: "List responsive and custom-condition breakpoints",
    examples: ["webstudio list-breakpoints --json"],
  },
  {
    command: "create-breakpoint",
    description:
      "Create a breakpoint with width limits or a custom media condition",
    requiredOptions: ["label", "json"],
    examples: [
      "webstudio create-breakpoint --label Tablet --max-width 991 --json",
    ],
  },
  {
    command: "update-breakpoint",
    description: "Update breakpoint label, width limits, or media condition",
    requiredOptions: ["breakpoint", "json"],
    examples: [
      "webstudio update-breakpoint --breakpoint tablet --label Tablet --max-width 1023 --json",
      "webstudio update-breakpoint --breakpoint tablet --clear-condition --min-width 768 --json",
      "webstudio update-breakpoint --breakpoint tablet --clear-min-width --clear-max-width --condition '(hover: hover)' --json",
    ],
  },
  {
    command: "delete-breakpoint",
    description:
      "Delete a breakpoint and all style declarations assigned to it",
    requiredOptions: ["breakpoint", "confirm", "json"],
    examples: [
      "webstudio delete-breakpoint --breakpoint tablet --confirm --json",
    ],
  },
  {
    command: "delete-page",
    description: "Delete a page and its page content",
    requiredOptions: ["page", "json"],
    examples: ["webstudio delete-page --page page-id --json"],
  },
  {
    command: "duplicate-page",
    description:
      "Duplicate a page and optionally substitute copied fixed text and variable values atomically",
    requiredOptions: ["page", "json"],
    examples: [
      'webstudio duplicate-page --page page-id --name "Pricing Copy" --path /pricing-copy --json',
      `webstudio duplicate-page --page page-id --name Paris --path /paris --substitutions '{"text":{"London":"Paris"},"variables":{"city":{"type":"string","value":"Paris"}}}' --json`,
    ],
  },
  {
    command: "list-page-templates",
    description: "List reusable page templates in the configured project",
    examples: ["webstudio list-page-templates --json"],
  },
  {
    command: "create-page-template",
    description: "Create an empty reusable page template",
    requiredOptions: ["name", "json"],
    examples: [
      'webstudio create-page-template --name "Landing Template" --title "\\"Landing\\"" --json',
    ],
  },
  {
    command: "update-page-template",
    description: "Update reusable page template settings and metadata",
    requiredOptions: ["template", "json"],
    examples: [
      'webstudio update-page-template --template template-id --name "Article Template" --description "\\"Reusable article layout\\"" --json',
    ],
  },
  {
    command: "delete-page-template",
    description: "Delete a reusable page template and its content",
    requiredOptions: ["template", "confirm", "json"],
    examples: [
      "webstudio delete-page-template --template template-id --confirm --json",
    ],
  },
  {
    command: "duplicate-page-template",
    description: "Duplicate a reusable page template and its content",
    requiredOptions: ["template", "json"],
    examples: [
      "webstudio duplicate-page-template --template template-id --json",
    ],
  },
  {
    command: "reorder-page-template",
    description: "Reorder reusable page templates",
    requiredOptions: ["source-template", "target-template", "position", "json"],
    examples: [
      "webstudio reorder-page-template --source-template template-a --target-template template-b --position before --json",
    ],
  },
  {
    command: "create-page-from-template",
    description: "Create a page by copying a reusable page template",
    requiredOptions: ["template", "name", "path", "json"],
    examples: [
      'webstudio create-page-from-template --template template-id --name "Landing" --path /landing --json',
    ],
  },
  {
    command: "list-folders",
    description: "List page folders",
    examples: [
      "webstudio list-folders --json",
      "webstudio list-folders --cursor 50 --json",
    ],
  },
  {
    command: "create-folder",
    description: "Create a page folder in the configured project",
    requiredOptions: ["name", "slug", "json"],
    examples: ["webstudio create-folder --name Blog --slug blog --json"],
  },
  {
    command: "update-folder",
    description: "Update page folder settings",
    requiredOptions: ["folder", "json"],
    examples: [
      "webstudio update-folder --folder folder-id --name Blog --slug blog --json",
    ],
  },
  {
    command: "delete-folder",
    description: "Delete a folder with its child folders and pages",
    requiredOptions: ["folder", "json"],
    examples: ["webstudio delete-folder --folder folder-id --json"],
  },
  {
    command: "list-instances",
    description:
      "List element instances in the build tree, including parent id and index when known",
    examples: ["webstudio list-instances --path / --max-depth 2 --json"],
  },
  {
    command: "inspect-instance",
    description:
      "Show details for one element instance, optionally including ancestors",
    requiredOptions: ["instance", "json"],
    examples: [
      "webstudio inspect-instance --instance instance-id --include props,styles,children,ancestors --json",
    ],
  },
  {
    command: "search-project",
    description:
      "Search instance labels, text, props including href and embeds, resource URLs, assets, and styles",
    examples: [
      'MCP tool: search-project {"query":"pricing"}',
      'MCP tool: search-project {"query":"api.example.com","scopes":["resources"]}',
    ],
  },
  {
    command: "audit",
    description:
      "Audit project accessibility, security, SEO, assets, styles, and optional Craft compatibility with structured severity, evidence, remediation, skipped checks, and visual follow-ups",
    examples: [
      "webstudio audit --json",
      "webstudio audit --scopes accessibility,seo --json",
      "webstudio audit --scopes accessibility --verbose --json",
      "webstudio audit --page-path /pricing --json",
      'MCP tool: audit {"severities":["error","warning"]}',
      'MCP tool: audit {"scopes":["accessibility"],"verbose":true}',
      'MCP tool: audit {"scopes":["craft"],"verbose":true}',
    ],
  },
  {
    command: "verify-bindings",
    description:
      "Statically verify persisted text, prop, resource, parameter, action, and page metadata bindings without resolving rendered values or executing external resources",
    examples: [
      "webstudio verify-bindings --json",
      'MCP tool: verify-bindings {"pagePath":"/pricing"}',
      'MCP tool: verify-bindings {"instanceId":"instance-id","limit":50}',
    ],
  },
  {
    command: "insert-component",
    description:
      "Insert a component by id; Webstudio uses its registered template automatically when available.",
    examples: [
      'MCP tool: insert-component {"parentInstanceId":"parent-id","component":"Box"}',
    ],
  },
  {
    command: "insert-fragment",
    description:
      "Insert authored/styled Webstudio JSX with components, text, props, tokens, and styles. The CLI converts the JSX string to structured Webstudio data before mutation.",
    examples: [
      'MCP tool: insert-fragment {"parentInstanceId":"parent-id","fragment":"<ws.element ws:tag=\\"section\\" />"}',
    ],
  },
  {
    command: "attach-slot",
    description:
      "Attach another Slot occurrence that references the same shared content; use this for headers, footers, and other content edited once across pages",
    examples: [
      'MCP tool: attach-slot {"sourceSlotId":"slot-id","parentInstanceId":"parent-id"}',
    ],
  },
  {
    command: "extract-slot",
    description:
      "Convert an existing instance subtree into shared Slot content without cloning it. instanceSelector is a leaf-to-root occurrence path: start with the instance to extract, then its direct parent, then each successive ancestor toward the page root. Use the id and parentId relationships returned by list-instances. The first example extracts a section directly under Body; the second extracts a section nested in a page wrapper.",
    examples: [
      'MCP tool: extract-slot {"instanceSelector":["header-section-id","body-id"],"label":"Site header"}',
      'MCP tool: extract-slot {"instanceSelector":["header-section-id","page-wrapper-id","body-id"],"label":"Site header"}',
    ],
  },
  {
    command: "move-instance",
    description: "Move element instances to another parent or position",
    examples: [
      'MCP tool: move-instance {"moves":[{"instanceId":"instance-id","parentInstanceId":"parent-id","insertIndex":0}]}',
    ],
  },
  {
    command: "clone-instance",
    description: "Clone an element instance subtree",
    requiredOptions: ["source", "json"],
    examples: [
      "webstudio clone-instance --source instance-id --parent parent-id --json",
    ],
  },
  {
    command: "delete-instance",
    description: "Delete element instance subtrees",
    requiredOptions: ["instance", "json"],
    examples: ["webstudio delete-instance --instance instance-id --json"],
  },
  {
    command: "update-props",
    description:
      'Create or update direct element prop values; match value to type, for example textarea placeholder uses { "name": "placeholder", "type": "string", "value": "..." }. Use this for fixed strings, numbers, booleans, JSON, assets, and pages. Parameters are internal scoped runtime values, not a public authoring surface. Editor tokens are limited to content-mode props',
    requiredOptions: ["input", "json"],
    examples: ["webstudio update-props --input props.json --json"],
  },
  {
    command: "delete-props",
    description:
      "Delete element props by instance and prop name; editor tokens are limited to content-mode props",
    requiredOptions: ["input", "json"],
    examples: ["webstudio delete-props --input props.json --json"],
  },
  {
    command: "bind-props",
    description:
      "Bind element props to dynamic expressions, resources, actions, or existing scoped runtime context such as system. Do not create parameter records, and do not use bindings for fixed string values; use update-props instead",
    requiredOptions: ["input", "json"],
    examples: ["webstudio bind-props --input bindings.json --json"],
  },
  {
    command: "list-texts",
    description: "List text and expression children",
    examples: ["webstudio list-texts --contains headline --json"],
  },
  {
    command: "update-text",
    description:
      'Update a text or expression child on an element instance; mode must be "text" or "expression" when provided, never "replace"; editor tokens are limited to content-mode text',
    requiredOptions: ["instance", "child-index", "text", "json"],
    examples: [
      'webstudio update-text --instance instance-id --child-index 0 --text "Launch faster" --mode text --json',
      'webstudio update-text --instance instance-id --child-index 0 --text "user.name" --mode expression --json',
    ],
  },
  {
    command: "replace-text",
    description:
      "Replace bounded literal text children across a page or project; use a separate command instead of an update-text replace mode",
    examples: [
      'MCP tool: replace-text {"find":"Start free","replace":"Get started","match":"exact","pagePath":"/pricing","limit":20}',
    ],
  },
  {
    command: "replace-prop-text",
    description:
      "Replace bounded text inside static string props such as href and HTML embed code without changing dynamic bindings",
    examples: [
      'MCP tool: replace-prop-text {"find":"old.example.com","replace":"www.example.com","match":"substring","names":["href","code"],"limit":20}',
    ],
  },
  {
    command: "replace-resource-text",
    description:
      "Replace bounded resource names and fixed URLs without changing dynamic request expressions",
    examples: [
      'MCP tool: replace-resource-text {"find":"api.old.example.com","replace":"api.example.com","fields":["url"],"limit":20}',
    ],
  },
  {
    command: "get-styles",
    description: "List style declarations",
    examples: ["webstudio get-styles --instance instance-id --json"],
  },
  {
    command: "update-styles",
    description: "Create or update local style declarations",
    requiredOptions: ["input", "json"],
    examples: ["webstudio update-styles --input styles.json --json"],
  },
  {
    command: "delete-styles",
    description: "Delete local style declarations",
    requiredOptions: ["input", "json"],
    examples: ["webstudio delete-styles --input styles.json --json"],
  },
  {
    command: "replace-styles",
    description: "Replace matching local style values",
    requiredOptions: ["input", "json"],
    examples: ["webstudio replace-styles --input replace.json --json"],
  },
  {
    command: "list-design-tokens",
    description:
      "List compact reusable style token summaries; include full styles only when explicitly requested",
    examples: [
      "webstudio list-design-tokens --with-usage --json",
      "webstudio list-design-tokens --include-styles --json",
    ],
  },
  {
    command: "create-design-token",
    description: "Create reusable style tokens",
    requiredOptions: ["input", "json"],
    examples: ["webstudio create-design-token --input tokens.json --json"],
  },
  {
    command: "import-design-tokens",
    description:
      "Import DTCG and Figma Variables as design tokens or CSS variables; mapping keys are token types such as color or dimension, not token paths",
    requiredOptions: ["input", "json"],
    examples: [
      "webstudio import-design-tokens --input brand-tokens.json --json",
    ],
  },
  {
    command: "update-design-token-styles",
    description: "Create or update declarations on a reusable style token",
    requiredOptions: ["design-token", "input", "json"],
    examples: [
      "webstudio update-design-token-styles --design-token token-id --input styles.json --json",
    ],
  },
  {
    command: "delete-design-token-styles",
    description: "Delete declarations from a reusable style token",
    requiredOptions: ["design-token", "input", "json"],
    examples: [
      "webstudio delete-design-token-styles --design-token token-id --input styles.json --json",
    ],
  },
  {
    command: "attach-design-token",
    description: "Attach a reusable style token to element instances",
    requiredOptions: ["design-token", "input", "json"],
    examples: [
      "webstudio attach-design-token --design-token token-id --input instances.json --json",
    ],
  },
  {
    command: "detach-design-token",
    description: "Detach a reusable style token from element instances",
    requiredOptions: ["design-token", "input", "json"],
    examples: [
      "webstudio detach-design-token --design-token token-id --input instances.json --json",
    ],
  },
  {
    command: "extract-design-token",
    description: "Create a reusable style token from local instance styles",
    requiredOptions: ["input", "json"],
    examples: ["webstudio extract-design-token --input token.json --json"],
  },
  {
    command: "list-css-variables",
    description: "List CSS custom property definitions",
    examples: ["webstudio list-css-variables --with-usage --json"],
  },
  {
    command: "define-css-variable",
    description: "Define project-level CSS custom properties",
    requiredOptions: ["input", "json"],
    examples: ["webstudio define-css-variable --input vars.json --json"],
  },
  {
    command: "delete-css-variable",
    description: "Delete CSS custom property definitions",
    requiredOptions: ["input", "confirm", "json"],
    examples: [
      "webstudio delete-css-variable --input names.json --confirm --json",
    ],
  },
  {
    command: "rewrite-css-variable-refs",
    description: "Rewrite var() references to CSS custom properties",
    requiredOptions: ["input", "json"],
    examples: [
      "webstudio rewrite-css-variable-refs --input variables.json --json",
    ],
  },
  {
    command: "list-variables",
    description:
      "List data variables. Data variables are stored in the dataSources namespace and can be scoped to an instance.",
    examples: [
      "webstudio list-variables --json",
      "webstudio list-variables --scope-instance body-id --json",
    ],
  },
  {
    command: "create-variable",
    description:
      "Create a data variable scoped to an element instance. Use string, number, boolean, string[], or json values.",
    requiredOptions: ["scope-instance", "name", "value-type", "value", "json"],
    examples: [
      'webstudio create-variable --scope-instance body-id --name title --value-type string --value "Hello" --json',
      "webstudio create-variable --scope-instance body-id --name count --value-type number --value 3 --json",
      "webstudio create-variable --scope-instance body-id --name featured --value-type boolean --value true --json",
      "webstudio create-variable --scope-instance body-id --name tags --value-type 'string[]' --value '[\"news\",\"product\"]' --json",
      'webstudio create-variable --scope-instance body-id --name filters --value-type json --value \'{"tag":"news"}\' --json',
    ],
  },
  {
    command: "update-variable",
    description: "Update a data variable name, value, or scope",
    requiredOptions: ["variable", "json"],
    examples: [
      "webstudio update-variable --variable variable-id --value-type json --value '{\"count\":1}' --json",
    ],
  },
  {
    command: "delete-variable",
    description: "Delete a data variable",
    requiredOptions: ["variable", "json"],
    examples: ["webstudio delete-variable --variable variable-id --json"],
  },
  {
    command: "list-resources",
    description:
      "List read resources and their optional exposed data-source variables. Prop-bound action resources are stored in resources too, but are discovered through props/snapshot.",
    examples: [
      "webstudio list-resources --json",
      "webstudio list-resources --scope-instance body-id --json",
    ],
  },
  {
    command: "create-resource",
    description:
      "Create a resource. Add --scope-instance and --data-source-name only when the resource should be exposed as read data; for form/action resources, create it unscoped and bind a prop with bind-props.",
    requiredOptions: ["name", "method", "url", "json"],
    examples: [
      'webstudio create-resource --name Posts --method get --url "\\"https://api.example.com/posts\\"" --json',
      'webstudio create-resource --name Posts --method get --url "\\"https://api.example.com/posts?tag=\\" + filters.tag" --scope-instance body-id --data-source-name posts --json',
      "webstudio create-resource --input resource-graphql.json --scope-instance body-id --data-source-name post --json",
      "webstudio create-resource --input resource-system-current-date.json --scope-instance body-id --data-source-name currentDate --json",
    ],
  },
  {
    command: "update-resource",
    description:
      "Update resource request fields such as method, url expression, headers, search params, body, or control.",
    requiredOptions: ["resource", "json"],
    examples: [
      'webstudio update-resource --resource resource-id --url "\\"https://api.example.com/posts\\"" --json',
    ],
  },
  {
    command: "delete-resource",
    description:
      "Delete a resource and any exposed data variable or prop bindings that reference it",
    requiredOptions: ["resource", "json"],
    examples: ["webstudio delete-resource --resource resource-id --json"],
  },
  {
    command: "publish",
    description:
      "Publish the configured project to staging or production. Uses the project domain by default and, for production, active verified custom domains. If local development cannot contact the deployment backend, the JSON response includes warning while still returning the local publish job id.",
    requiredOptions: ["target", "json"],
    examples: [
      "webstudio publish --target production --json",
      "webstudio publish --target production --domain example.com --json",
    ],
  },
  {
    command: "list-publishes",
    description: "List production publish builds for the configured project",
    examples: ["webstudio list-publishes --json"],
  },
  {
    command: "get-publish-job",
    description:
      "Show the status and domains for a publish job returned by publish",
    requiredOptions: ["job", "json"],
    examples: ["webstudio get-publish-job --job build-id --json"],
  },
  {
    command: "unpublish",
    description:
      "Remove staging or production deployment records for selected domains",
    requiredOptions: ["target", "confirm", "json"],
    examples: ["webstudio unpublish --target production --confirm --json"],
  },
  {
    command: "list-domains",
    description: "List custom domains linked to the configured project",
    examples: ["webstudio list-domains --json"],
  },
  {
    command: "create-domain",
    description: "Create and link a custom domain to the configured project",
    requiredOptions: ["domain", "json"],
    examples: ["webstudio create-domain --domain example.com --json"],
  },
  {
    command: "update-domain",
    description: "Update a linked custom domain",
    requiredOptions: ["domain-id", "json"],
    examples: [
      "webstudio update-domain --domain-id domain-id --domain www.example.com --json",
      "webstudio update-domain --domain-id domain-id --input domain.json --json",
    ],
  },
  {
    command: "delete-domain",
    description: "Remove a custom domain from the configured project",
    requiredOptions: ["domain-id", "confirm", "json"],
    examples: [
      "webstudio delete-domain --domain-id domain-id --confirm --json",
    ],
  },
  {
    command: "verify-domain",
    description: "Verify a linked custom domain after DNS records are set",
    requiredOptions: ["domain-id", "json"],
    examples: ["webstudio verify-domain --domain-id domain-id --json"],
  },
  {
    command: "list-asset-folders",
    description: "List the complete Asset Manager folder hierarchy",
    examples: ["MCP/API: list-asset-folders {}"],
  },
  {
    command: "create-asset-folder",
    description: "Create a root or nested Asset Manager folder",
    examples: [
      'MCP/API: create-asset-folder {"name":"Marketing","parentId":"parent-folder-id"}',
    ],
  },
  {
    command: "update-asset-folder",
    description:
      "Rename an Asset Manager folder or move it under another folder; use parentId:null for Root",
    examples: [
      'MCP/API: update-asset-folder {"folderId":"folder-id","values":{"name":"Brand","parentId":null}}',
    ],
  },
  {
    command: "duplicate-asset-folder",
    description:
      "Recursively duplicate a folder, nested folders, and contained assets; optionally choose a target parent",
    examples: [
      'MCP/API: duplicate-asset-folder {"folderId":"folder-id","parentId":"target-folder-id"}',
    ],
  },
  {
    command: "delete-asset-folder",
    description:
      "Delete a folder recursively, including nested folders and contained assets",
    examples: ['MCP/API: delete-asset-folder {"folderId":"folder-id"}'],
  },
  {
    command: "list-assets",
    description:
      "List project assets with folder ids; use verbose output for complete records",
    examples: ["webstudio list-assets --type image --with-usage --json"],
  },
  {
    command: "get-asset",
    description:
      "Get one complete asset record, including description, folder, creation time, and type-specific metadata",
    requiredOptions: ["asset", "json"],
    examples: ["webstudio get-asset --asset asset-id --json"],
  },
  {
    command: "list-fonts",
    description:
      "List uploaded font families and optional built-in system font stacks",
    examples: ["webstudio list-fonts --json"],
  },
  {
    command: "upload-asset",
    description:
      "Upload one local asset file from a descriptor, optionally into an Asset Manager folder",
    requiredOptions: ["input", "json"],
    examples: [
      "webstudio upload-asset --input asset.json --assets-dir .webstudio/assets --json",
    ],
  },
  {
    command: "upload-assets",
    description:
      "Upload local asset files from descriptors, optionally into Asset Manager folders",
    requiredOptions: ["input", "json"],
    examples: [
      "webstudio upload-assets --input assets.json --assets-dir .webstudio/assets --json",
    ],
  },
  {
    command: "update-asset-content",
    description:
      "Replace a text asset's content while preserving its stable asset id; provide exactly one of path or content and use the current asset name as expectedName",
    examples: [
      'MCP/API: update-asset-content {"assetId":"asset-id","expectedName":"settings_hash.json","content":"{\\"theme\\":\\"dark\\"}"}',
      'MCP/API: update-asset-content {"assetId":"asset-id","expectedName":"styles_hash.css","path":"./styles.css"}',
    ],
  },
  {
    command: "find-asset-usage",
    description: "Find where an asset is referenced in the project",
    requiredOptions: ["asset", "json"],
    examples: ["webstudio find-asset-usage --asset asset-id --json"],
  },
  {
    command: "set-image-descriptions",
    description:
      "Save agent-generated image descriptions or mark images as decorative",
    examples: [
      'MCP/API: set-image-descriptions {"updates":[{"assetId":"hero-id","description":"Team collaborating around a whiteboard"},{"assetId":"texture-id","decorative":true}]}',
    ],
  },
  {
    command: "update-asset",
    description:
      "Rename an asset, update its description, or move it to another folder; use folderId:null for Root",
    examples: [
      'MCP/API: update-asset {"assetId":"asset-id","values":{"filename":"hero","folderId":"folder-id"}}',
    ],
  },
  {
    command: "add-asset",
    description:
      "Add an already-uploaded asset record, optionally inside an Asset Manager folder",
    examples: [
      'MCP/API: add-asset {"asset":{"id":"asset-id","name":"hero_hash.png","type":"image","size":1200,"format":"png","createdAt":"2026-01-01T00:00:00.000Z","meta":{"width":1200,"height":800},"folderId":"folder-id"}}',
    ],
  },
  {
    command: "duplicate-asset",
    description:
      "Duplicate an asset record while reusing its uploaded file; optionally choose a target folder",
    examples: [
      'MCP/API: duplicate-asset {"assetId":"asset-id","folderId":"target-folder-id"}',
    ],
  },
  {
    command: "replace-asset",
    description: "Replace asset references and delete the old asset",
    requiredOptions: ["from", "to", "confirm", "json"],
    examples: [
      "webstudio replace-asset --from old-asset-id --to new-asset-id --confirm --json",
    ],
  },
  {
    command: "delete-asset",
    description: "Delete asset records by id or id prefix",
    requiredOptions: ["asset", "confirm", "json"],
    examples: ["webstudio delete-asset --asset asset-id --confirm --json"],
  },
] as const satisfies readonly PublicApiOperationDocumentation[];

const getSourceOperationCommands = () => [
  ...Object.values(serverOnlyRouterOperationMetadata).map(
    ({ command }) => command
  ),
  ...publicRuntimeOperationContracts.map(({ command }) => command),
  ...localOnlyOperationInputs.map(({ command }) => command),
];

const documentationByCommand = new Map<
  string,
  PublicApiOperationDocumentation
>();
for (const documentation of curatedPublicApiOperationDocumentation) {
  if (documentationByCommand.has(documentation.command)) {
    throw new Error(
      `Duplicate public API operation documentation for "${documentation.command}".`
    );
  }
  documentationByCommand.set(documentation.command, documentation);
}

const createDefaultDocumentation = (
  command: string
): PublicApiOperationDocumentation => {
  const words = command
    .split("-")
    .map((word) =>
      word === "css" || word === "ui" ? word.toUpperCase() : word
    )
    .join(" ");
  return {
    command,
    description: `${words.charAt(0).toUpperCase()}${words.slice(1)}.`,
    examples: [
      `MCP/API: call "${command}" with JSON input matching its operation schema.`,
    ],
  };
};

const documentedCommands = new Set<string>();

export const publicApiOperationDocumentation = getSourceOperationCommands().map(
  (command) => {
    if (documentedCommands.has(command)) {
      throw new Error(`Duplicate public API command "${command}".`);
    }
    documentedCommands.add(command);
    return (
      documentationByCommand.get(command) ?? createDefaultDocumentation(command)
    );
  }
) satisfies readonly PublicApiOperationDocumentation[];
