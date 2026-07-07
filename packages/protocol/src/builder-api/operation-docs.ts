export type PublicApiOperationDocumentation = {
  command: string;
  description: string;
  requiredOptions?: readonly string[];
  examples: readonly string[];
};

export const publicApiOperationDocumentation: readonly PublicApiOperationDocumentation[] =
  [
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
        "webstudio list-pages --include-folders --json",
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
      description:
        "Show project site metadata, compiler settings, and redirects",
      examples: ["webstudio get-project-settings --json"],
    },
    {
      command: "update-project-settings",
      description:
        "Update project site metadata and compiler settings from JSON",
      requiredOptions: ["input", "json"],
      examples: [
        "webstudio update-project-settings --input project-settings.json --json",
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
      command: "list-breakpoints",
      description: "List responsive and custom-condition breakpoints",
      examples: ["webstudio list-breakpoints --json"],
    },
    {
      command: "create-breakpoint",
      description:
        "Create a breakpoint with width limits or a custom media condition",
      requiredOptions: ["breakpoint", "label", "json"],
      examples: [
        "webstudio create-breakpoint --breakpoint tablet --label Tablet --max-width 991 --json",
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
      description: "Duplicate a page and its page content",
      requiredOptions: ["page", "json"],
      examples: [
        'webstudio duplicate-page --page page-id --name "Pricing Copy" --path /pricing-copy --json',
      ],
    },
    {
      command: "list-page-templates",
      description: "List reusable page templates in the configured project",
      examples: ["webstudio list-page-templates --json"],
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
        "webstudio list-folders --include-pages --json",
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
      description: "List element instances in the build tree",
      examples: ["webstudio list-instances --path / --max-depth 2 --json"],
    },
    {
      command: "inspect-instance",
      description: "Show details for one element instance",
      requiredOptions: ["instance", "json"],
      examples: [
        "webstudio inspect-instance --instance instance-id --include props,styles,children --json",
      ],
    },
    {
      command: "append-instance",
      description: "Append, prepend, or replace child element instances",
      requiredOptions: ["parent", "input", "json"],
      examples: [
        "webstudio append-instance --parent parent-id --input children.json --json",
      ],
    },
    {
      command: "move-instance",
      description: "Move element instances to another parent or position",
      requiredOptions: ["input", "json"],
      examples: ["webstudio move-instance --input moves.json --json"],
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
        "Create or update direct element prop values; use this for fixed strings, numbers, booleans, JSON, assets, pages, parameters, and resources. Editor tokens are limited to content-mode props",
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
        "Bind element props to dynamic expressions, parameters, resources, or actions. Do not use for fixed string values; use update-props instead",
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
        "Update a text or expression child on an element instance; editor tokens are limited to content-mode text",
      requiredOptions: ["instance", "child-index", "text", "json"],
      examples: [
        'webstudio update-text --instance instance-id --child-index 0 --text "Launch faster" --json',
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
      description: "List reusable style tokens",
      examples: ["webstudio list-design-tokens --with-usage --json"],
    },
    {
      command: "create-design-token",
      description: "Create reusable style tokens",
      requiredOptions: ["input", "json"],
      examples: ["webstudio create-design-token --input tokens.json --json"],
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
      description: "List data variables",
      examples: ["webstudio list-variables --json"],
    },
    {
      command: "create-variable",
      description: "Create a data variable scoped to an element instance",
      requiredOptions: [
        "scope-instance",
        "name",
        "value-type",
        "value",
        "json",
      ],
      examples: [
        'webstudio create-variable --scope-instance body-id --name title --value-type string --value "Hello" --json',
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
      description: "List data resources",
      examples: ["webstudio list-resources --json"],
    },
    {
      command: "create-resource",
      description:
        "Create a data resource and optionally expose it as a variable",
      requiredOptions: ["name", "method", "url", "json"],
      examples: [
        'webstudio create-resource --name Posts --method get --url "\\"https://api.example.com/posts\\"" --json',
      ],
    },
    {
      command: "update-resource",
      description: "Update data resource request fields",
      requiredOptions: ["resource", "json"],
      examples: [
        'webstudio update-resource --resource resource-id --url "\\"https://api.example.com/posts\\"" --json',
      ],
    },
    {
      command: "delete-resource",
      description: "Delete a data resource and its exposed data variable",
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
      command: "list-assets",
      description: "List project assets",
      examples: ["webstudio list-assets --type image --with-usage --json"],
    },
    {
      command: "upload-asset",
      description: "Upload one local asset file from an asset descriptor",
      requiredOptions: ["input", "json"],
      examples: [
        "webstudio upload-asset --input asset.json --assets-dir .webstudio/assets --json",
      ],
    },
    {
      command: "upload-assets",
      description: "Upload local asset files from asset descriptors",
      requiredOptions: ["input", "json"],
      examples: [
        "webstudio upload-assets --input assets.json --assets-dir .webstudio/assets --json",
      ],
    },
    {
      command: "find-asset-usage",
      description: "Find where an asset is referenced in the project",
      requiredOptions: ["asset", "json"],
      examples: ["webstudio find-asset-usage --asset asset-id --json"],
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
  ] as const;
