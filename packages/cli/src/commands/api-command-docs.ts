export const useCaseScenarios = [
  {
    useCase: "Link/configure one project",
    commands: ["webstudio init --link <api-share-link> --json"],
    notes: ["Writes local project id and global origin/token config."],
  },
  {
    useCase: "Identify current token",
    commands: ["webstudio whoami --json"],
  },
  {
    useCase: "Check token permissions",
    commands: ["webstudio permissions --json"],
  },
  {
    useCase: "Inspect project/build/version",
    commands: [
      "webstudio inspect --json",
      "webstudio snapshot --include pages,instances,styles --json",
    ],
  },
  {
    useCase: "Discover CLI/API capabilities",
    commands: [
      "webstudio schema api --json",
      "webstudio man api --json",
      "webstudio man llm --json",
    ],
  },
  {
    useCase: "List pages",
    commands: ["webstudio list-pages --include-folders --json"],
  },
  {
    useCase: "Read page by id",
    commands: ["webstudio get-page --page <pageId> --json"],
  },
  {
    useCase: "Read page by path",
    commands: ["webstudio get-page-by-path --path /pricing --json"],
  },
  {
    useCase: "Create page",
    commands: ["webstudio create-page --name Pricing --path /pricing --json"],
  },
  {
    useCase: "Update page settings/metadata",
    commands: [
      'webstudio update-page --page <pageId> --title "Pricing" --description "Plans" --status 200 --json',
      "webstudio update-page --page <pageId> --auth-login <login> --auth-password <password> --json",
    ],
  },
  {
    useCase: "Read project settings",
    commands: ["webstudio get-project-settings --json"],
  },
  {
    useCase: "Update project settings",
    commands: [
      "webstudio update-project-settings --input project-settings.json --json",
    ],
  },
  {
    useCase: "List redirects",
    commands: ["webstudio list-redirects --json"],
  },
  {
    useCase: "Create redirect",
    commands: [
      "webstudio create-redirect --old /old --new /new --status 301 --json",
    ],
  },
  {
    useCase: "Update redirect",
    commands: [
      "webstudio update-redirect --old /old --new /newer --status 302 --json",
      "webstudio update-redirect --old /old --clear-status --json",
    ],
  },
  {
    useCase: "Delete redirect",
    commands: ["webstudio delete-redirect --old /old --json"],
  },
  {
    useCase: "List breakpoints",
    commands: ["webstudio list-breakpoints --json"],
  },
  {
    useCase: "Create breakpoint",
    commands: [
      "webstudio create-breakpoint --breakpoint tablet --label Tablet --max-width 991 --json",
    ],
  },
  {
    useCase: "Update breakpoint",
    commands: [
      "webstudio update-breakpoint --breakpoint tablet --label Tablet --max-width 1023 --json",
      "webstudio update-breakpoint --breakpoint tablet --clear-condition --min-width 768 --json",
      "webstudio update-breakpoint --breakpoint tablet --clear-min-width --clear-max-width --condition '(hover: hover)' --json",
    ],
  },
  {
    useCase: "Delete breakpoint",
    commands: [
      "webstudio delete-breakpoint --breakpoint tablet --confirm --json",
    ],
  },
  {
    useCase: "Duplicate page",
    commands: [
      'webstudio duplicate-page --page <pageId> --name "Pricing Copy" --path /pricing-copy --json',
    ],
  },
  {
    useCase: "List page templates",
    commands: ["webstudio list-page-templates --json"],
  },
  {
    useCase: "Create page from template",
    commands: [
      'webstudio create-page-from-template --template <templateId> --name "Landing" --path /landing --json',
    ],
  },
  {
    useCase: "Delete page",
    commands: ["webstudio delete-page --page <pageId> --json"],
  },
  {
    useCase: "List folders",
    commands: ["webstudio list-folders --include-pages --json"],
  },
  {
    useCase: "Create folder",
    commands: ["webstudio create-folder --name Blog --slug blog --json"],
  },
  {
    useCase: "Update folder",
    commands: [
      "webstudio update-folder --folder <folderId> --name Blog --slug blog --json",
    ],
  },
  {
    useCase: "Delete folder",
    commands: ["webstudio delete-folder --folder <folderId> --json"],
  },
  {
    useCase: "List element instances",
    commands: ["webstudio list-instances --path / --max-depth 3 --json"],
  },
  {
    useCase: "Inspect one element instance",
    commands: [
      "webstudio inspect-instance --instance <instanceId> --include props,styles,children --json",
    ],
  },
  {
    useCase: "Append/prepend/replace child elements",
    commands: [
      "webstudio append-instance --parent <instanceId> --input children.json --json",
    ],
  },
  {
    useCase: "Move elements",
    commands: ["webstudio move-instance --input moves.json --json"],
  },
  {
    useCase: "Clone element subtree",
    commands: [
      "webstudio clone-instance --source <instanceId> --parent <targetParentId> --json",
    ],
  },
  {
    useCase: "Delete element subtree",
    commands: ["webstudio delete-instance --instance <instanceId> --json"],
  },
  {
    useCase: "List text/expression children",
    commands: ["webstudio list-texts --path / --json"],
  },
  {
    useCase: "Update text child",
    commands: [
      'webstudio update-text --instance <instanceId> --child-index 0 --text "Launch faster" --json',
    ],
  },
  {
    useCase: "Update props",
    commands: ["webstudio update-props --input props.json --json"],
  },
  {
    useCase: "Delete props",
    commands: ["webstudio delete-props --input props.json --json"],
  },
  {
    useCase: "Bind props to expressions/resources/actions",
    commands: ["webstudio bind-props --input bindings.json --json"],
  },
  {
    useCase: "Read styles",
    commands: [
      "webstudio get-styles --instance <instanceId> --include-tokens --json",
    ],
  },
  {
    useCase: "Update local styles",
    commands: ["webstudio update-styles --input styles.json --json"],
  },
  {
    useCase: "Delete local styles",
    commands: ["webstudio delete-styles --input styles.json --json"],
  },
  {
    useCase: "Replace matching style values",
    commands: ["webstudio replace-styles --input replace.json --json"],
  },
  {
    useCase: "List design tokens",
    commands: ["webstudio list-design-tokens --with-usage --json"],
  },
  {
    useCase: "Create design tokens",
    commands: ["webstudio create-design-token --input tokens.json --json"],
  },
  {
    useCase: "Update design token styles",
    commands: [
      "webstudio update-design-token-styles --design-token <tokenId> --input styles.json --json",
    ],
  },
  {
    useCase: "Delete design token styles",
    commands: [
      "webstudio delete-design-token-styles --design-token <tokenId> --input styles.json --json",
    ],
  },
  {
    useCase: "Attach design token to instances",
    commands: [
      "webstudio attach-design-token --design-token <tokenId> --input instances.json --json",
    ],
  },
  {
    useCase: "Detach design token from instances",
    commands: [
      "webstudio detach-design-token --design-token <tokenId> --input instances.json --json",
    ],
  },
  {
    useCase: "Extract design token from local styles",
    commands: ["webstudio extract-design-token --input token.json --json"],
  },
  {
    useCase: "List CSS variables",
    commands: ["webstudio list-css-variables --with-usage --json"],
  },
  {
    useCase: "Define CSS variables",
    commands: ["webstudio define-css-variable --input vars.json --json"],
  },
  {
    useCase: "Delete CSS variables",
    commands: [
      "webstudio delete-css-variable --input names.json --confirm --json",
    ],
  },
  {
    useCase: "Rewrite CSS variable references",
    commands: [
      "webstudio rewrite-css-variable-refs --input variables.json --json",
    ],
  },
  {
    useCase: "List data variables",
    commands: ["webstudio list-variables --json"],
  },
  {
    useCase: "Create data variable",
    commands: [
      'webstudio create-variable --scope-instance <instanceId> --name title --value-type string --value "Hello" --json',
    ],
  },
  {
    useCase: "Update data variable",
    commands: [
      "webstudio update-variable --variable <variableId> --value-type json --value '{\"count\":1}' --json",
    ],
  },
  {
    useCase: "Delete data variable",
    commands: ["webstudio delete-variable --variable <variableId> --json"],
  },
  {
    useCase: "List resources",
    commands: ["webstudio list-resources --json"],
  },
  {
    useCase: "Create resource",
    commands: [
      "webstudio create-resource --name Posts --method get --url '\"https://api.example.com/posts\"' --json",
    ],
  },
  {
    useCase: "Update resource",
    commands: [
      "webstudio update-resource --resource <resourceId> --url '\"https://api.example.com/posts\"' --json",
    ],
  },
  {
    useCase: "Delete resource",
    commands: ["webstudio delete-resource --resource <resourceId> --json"],
  },
  {
    useCase: "List assets",
    commands: ["webstudio list-assets --with-usage --json"],
  },
  {
    useCase: "Upload one asset",
    commands: [
      "webstudio upload-asset --input asset.json --assets-dir .webstudio/assets --json",
    ],
  },
  {
    useCase: "Upload asset batch",
    commands: [
      "webstudio upload-assets --input assets.json --assets-dir .webstudio/assets --json",
    ],
  },
  {
    useCase: "Find asset usage",
    commands: ["webstudio find-asset-usage --asset <assetId> --json"],
  },
  {
    useCase: "Replace asset references",
    commands: [
      "webstudio replace-asset --from <oldAssetId> --to <newAssetId> --confirm --json",
    ],
  },
  {
    useCase: "Delete assets",
    commands: ["webstudio delete-asset --asset <assetId> --confirm --json"],
  },
  {
    useCase: "Publish project",
    commands: ["webstudio publish --target production --json"],
  },
  {
    useCase: "List publishes",
    commands: ["webstudio list-publishes --json"],
  },
  {
    useCase: "Check publish job",
    commands: ["webstudio get-publish-job --job <buildId> --json"],
  },
  {
    useCase: "Unpublish",
    commands: ["webstudio unpublish --target production --confirm --json"],
  },
  {
    useCase: "List domains",
    commands: ["webstudio list-domains --json"],
  },
  {
    useCase: "Create domain",
    commands: ["webstudio create-domain --domain example.com --json"],
  },
  {
    useCase: "Update domain",
    commands: [
      "webstudio update-domain --domain-id <domainId> --domain www.example.com --json",
    ],
  },
  {
    useCase: "Delete domain",
    commands: [
      "webstudio delete-domain --domain-id <domainId> --confirm --json",
    ],
  },
  {
    useCase: "Verify domain",
    commands: ["webstudio verify-domain --domain-id <domainId> --json"],
  },
  {
    useCase: "Make arbitrary store-level changes",
    commands: [
      "webstudio inspect --json",
      "webstudio snapshot --include <namespaces> --json",
      "webstudio validate-patch --base-version <version> --input patch.json --json",
      "webstudio apply-patch --base-version <version> --input patch.json --json",
    ],
    notes: ["Use only when no semantic command exists."],
  },
  {
    useCase: "Manage marketplace metadata",
    commands: [
      "webstudio snapshot --include marketplaceProduct --json",
      "webstudio apply-patch --base-version <version> --input patch.json --json",
    ],
    patchNamespaces: ["marketplaceProduct"],
  },
];

export const knownCliGaps = [
  {
    capability: "General project search and audit",
    missing:
      "No single semantic command searches across instance labels, props, hrefs, resource URLs, HTML embeds, asset references, and missing accessibility metadata.",
    currentFallback:
      "Use focused reads such as list-instances, list-texts, list-assets, find-asset-usage, and snapshot.",
    suggestedCommands: [
      "search-project",
      "audit-accessibility",
      "find-prop-usage",
    ],
  },
  {
    capability: "Save and manage page templates",
    missing:
      "CLI can list page templates and create pages from existing templates, but cannot save a page as a template or update/delete templates semantically.",
    currentFallback:
      "Use snapshot and apply-patch only when the template data model is understood.",
    suggestedCommands: [
      "create-page-template",
      "update-page-template",
      "delete-page-template",
    ],
  },
  {
    capability: "Semantic marketplace metadata",
    missing:
      "Marketplace metadata is only available through snapshot/apply-patch, not dedicated semantic commands.",
    currentFallback:
      "Use snapshot --include marketplaceProduct and apply-patch.",
    suggestedCommands: ["get-marketplace", "update-marketplace"],
  },
  {
    capability: "Provider-specific authenticated pages",
    missing:
      "CLI supports page basic auth and generic resources/props/embeds, but not guided Supabase/Firebase auth setup.",
    currentFallback:
      "Create the page, resources, variables, props, and embeds manually with existing semantic commands.",
    suggestedCommands: ["setup-auth-page"],
  },
  {
    capability: "Dynamic script/runtime integration helpers",
    missing:
      "CLI can manipulate props/resources/embeds, but has no semantic workflow for converting script-generated UI into editable Webstudio structures.",
    currentFallback:
      "Use append-instance, props, resources, and raw patch where necessary.",
    suggestedCommands: ["integrate-runtime-ui"],
  },
  {
    capability: "Generate from design input",
    missing:
      "No command imports Figma, screenshots, Inception output, or design.md and turns it into pages/tokens/layout.",
    currentFallback:
      "Use external generation, then apply semantic CLI commands or apply-patch.",
    suggestedCommands: ["generate-from-design"],
  },
  {
    capability: "Built-in cross-project maintenance",
    missing:
      "Public API and CLI intentionally operate on one configured project at a time; there is no built-in multi-project discovery or loop runner.",
    currentFallback:
      "Run the CLI from an external script that reconfigures one project/session at a time.",
    suggestedCommands: [],
  },
];
