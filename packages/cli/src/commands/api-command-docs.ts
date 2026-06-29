export const useCaseScenarios = [
  {
    useCase: "Link/configure one project",
    commands: ["webstudio init --link <api-share-link> --json"],
    notes: ["Writes local project id and global origin/token config."],
  },
  {
    useCase: "Identify current token",
    commands: ["MCP tool: whoami (--json)"],
  },
  {
    useCase: "Check token permissions",
    commands: ["webstudio permissions --json"],
  },
  {
    useCase: "Inspect project/build/version",
    commands: [
      "MCP tool: inspect (--json)",
      "MCP tool: snapshot (--include pages,instances,styles --json)",
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
    commands: ["MCP tool: list-pages (--include-folders --json)"],
  },
  {
    useCase: "Read page by id",
    commands: ["MCP tool: get-page (--page <pageId> --json)"],
  },
  {
    useCase: "Read page by path",
    commands: ["MCP tool: get-page-by-path (--path /pricing --json)"],
  },
  {
    useCase: "Create page",
    commands: ["MCP tool: create-page (--name Pricing --path /pricing --json)"],
  },
  {
    useCase: "Update page settings/metadata",
    commands: [
      'MCP tool: update-page (--page <pageId> --title "Pricing" --description "Plans" --status 200 --json)',
      "MCP tool: update-page (--page <pageId> --auth-login <login> --auth-password <password> --json)",
    ],
  },
  {
    useCase: "Read project settings",
    commands: ["MCP tool: get-project-settings (--json)"],
  },
  {
    useCase: "Update project settings",
    commands: [
      "MCP tool: update-project-settings (--input project-settings.json --json)",
    ],
  },
  {
    useCase: "List redirects",
    commands: ["MCP tool: list-redirects (--json)"],
  },
  {
    useCase: "Create redirect",
    commands: [
      "MCP tool: create-redirect (--old /old --new /new --status 301 --json)",
    ],
  },
  {
    useCase: "Update redirect",
    commands: [
      "MCP tool: update-redirect (--old /old --new /newer --status 302 --json)",
      "MCP tool: update-redirect (--old /old --clear-status --json)",
    ],
  },
  {
    useCase: "Delete redirect",
    commands: ["MCP tool: delete-redirect (--old /old --json)"],
  },
  {
    useCase: "List breakpoints",
    commands: ["MCP tool: list-breakpoints (--json)"],
  },
  {
    useCase: "Create breakpoint",
    commands: [
      "MCP tool: create-breakpoint (--breakpoint tablet --label Tablet --max-width 991 --json)",
    ],
  },
  {
    useCase: "Update breakpoint",
    commands: [
      "MCP tool: update-breakpoint (--breakpoint tablet --label Tablet --max-width 1023 --json)",
      "MCP tool: update-breakpoint (--breakpoint tablet --clear-condition --min-width 768 --json)",
      "MCP tool: update-breakpoint (--breakpoint tablet --clear-min-width --clear-max-width --condition '(hover: hover)' --json)",
    ],
  },
  {
    useCase: "Delete breakpoint",
    commands: [
      "MCP tool: delete-breakpoint (--breakpoint tablet --confirm --json)",
    ],
  },
  {
    useCase: "Duplicate page",
    commands: [
      'MCP tool: duplicate-page (--page <pageId> --name "Pricing Copy" --path /pricing-copy --json)',
    ],
  },
  {
    useCase: "List page templates",
    commands: ["MCP tool: list-page-templates (--json)"],
  },
  {
    useCase: "Create page from template",
    commands: [
      'MCP tool: create-page-from-template (--template <templateId> --name "Landing" --path /landing --json)',
    ],
  },
  {
    useCase: "Delete page",
    commands: ["MCP tool: delete-page (--page <pageId> --json)"],
  },
  {
    useCase: "List folders",
    commands: ["MCP tool: list-folders (--include-pages --json)"],
  },
  {
    useCase: "Create folder",
    commands: ["MCP tool: create-folder (--name Blog --slug blog --json)"],
  },
  {
    useCase: "Update folder",
    commands: [
      "MCP tool: update-folder (--folder <folderId> --name Blog --slug blog --json)",
    ],
  },
  {
    useCase: "Delete folder",
    commands: ["MCP tool: delete-folder (--folder <folderId> --json)"],
  },
  {
    useCase: "List element instances",
    commands: ["MCP tool: list-instances (--path / --max-depth 3 --json)"],
  },
  {
    useCase: "Inspect one element instance",
    commands: [
      "MCP tool: inspect-instance (--instance <instanceId> --include props,styles,children --json)",
    ],
  },
  {
    useCase: "Append/prepend/replace child elements",
    commands: [
      "MCP tool: append-instance (--parent <instanceId> --input children.json --json)",
    ],
  },
  {
    useCase: "Move elements",
    commands: ["MCP tool: move-instance (--input moves.json --json)"],
  },
  {
    useCase: "Clone element subtree",
    commands: [
      "MCP tool: clone-instance (--source <instanceId> --parent <targetParentId> --json)",
    ],
  },
  {
    useCase: "Delete element subtree",
    commands: ["MCP tool: delete-instance (--instance <instanceId> --json)"],
  },
  {
    useCase: "List text/expression children",
    commands: ["MCP tool: list-texts (--path / --json)"],
  },
  {
    useCase: "Update text child",
    commands: [
      'MCP tool: update-text (--instance <instanceId> --child-index 0 --text "Launch faster" --json)',
    ],
  },
  {
    useCase: "Update props",
    commands: ["MCP tool: update-props (--input props.json --json)"],
  },
  {
    useCase: "Delete props",
    commands: ["MCP tool: delete-props (--input props.json --json)"],
  },
  {
    useCase: "Bind props to expressions/resources/actions",
    commands: ["MCP tool: bind-props (--input bindings.json --json)"],
  },
  {
    useCase: "Read styles",
    commands: [
      "MCP tool: get-styles (--instance <instanceId> --include-tokens --json)",
    ],
  },
  {
    useCase: "Update local styles",
    commands: ["MCP tool: update-styles (--input styles.json --json)"],
  },
  {
    useCase: "Delete local styles",
    commands: ["MCP tool: delete-styles (--input styles.json --json)"],
  },
  {
    useCase: "Replace matching style values",
    commands: ["MCP tool: replace-styles (--input replace.json --json)"],
  },
  {
    useCase: "List design tokens",
    commands: ["MCP tool: list-design-tokens (--with-usage --json)"],
  },
  {
    useCase: "Create design tokens",
    commands: ["MCP tool: create-design-token (--input tokens.json --json)"],
  },
  {
    useCase: "Update design token styles",
    commands: [
      "MCP tool: update-design-token-styles (--design-token <tokenId> --input styles.json --json)",
    ],
  },
  {
    useCase: "Delete design token styles",
    commands: [
      "MCP tool: delete-design-token-styles (--design-token <tokenId> --input styles.json --json)",
    ],
  },
  {
    useCase: "Attach design token to instances",
    commands: [
      "MCP tool: attach-design-token (--design-token <tokenId> --input instances.json --json)",
    ],
  },
  {
    useCase: "Detach design token from instances",
    commands: [
      "MCP tool: detach-design-token (--design-token <tokenId> --input instances.json --json)",
    ],
  },
  {
    useCase: "Extract design token from local styles",
    commands: ["MCP tool: extract-design-token (--input token.json --json)"],
  },
  {
    useCase: "List CSS variables",
    commands: ["MCP tool: list-css-variables (--with-usage --json)"],
  },
  {
    useCase: "Define CSS variables",
    commands: ["MCP tool: define-css-variable (--input vars.json --json)"],
  },
  {
    useCase: "Delete CSS variables",
    commands: [
      "MCP tool: delete-css-variable (--input names.json --confirm --json)",
    ],
  },
  {
    useCase: "Rewrite CSS variable references",
    commands: [
      "MCP tool: rewrite-css-variable-refs (--input variables.json --json)",
    ],
  },
  {
    useCase: "List data variables",
    commands: ["MCP tool: list-variables (--json)"],
  },
  {
    useCase: "Create data variable",
    commands: [
      'MCP tool: create-variable (--scope-instance <instanceId> --name title --value-type string --value "Hello" --json)',
    ],
  },
  {
    useCase: "Update data variable",
    commands: [
      "MCP tool: update-variable (--variable <variableId> --value-type json --value '{\"count\":1}' --json)",
    ],
  },
  {
    useCase: "Delete data variable",
    commands: ["MCP tool: delete-variable (--variable <variableId> --json)"],
  },
  {
    useCase: "List resources",
    commands: ["MCP tool: list-resources (--json)"],
  },
  {
    useCase: "Create resource",
    commands: [
      "MCP tool: create-resource (--name Posts --method get --url '\"https://api.example.com/posts\"' --json)",
    ],
  },
  {
    useCase: "Update resource",
    commands: [
      "MCP tool: update-resource (--resource <resourceId> --url '\"https://api.example.com/posts\"' --json)",
    ],
  },
  {
    useCase: "Delete resource",
    commands: ["MCP tool: delete-resource (--resource <resourceId> --json)"],
  },
  {
    useCase: "List assets",
    commands: ["MCP tool: list-assets (--with-usage --json)"],
  },
  {
    useCase: "Upload one asset",
    commands: [
      "MCP tool: upload-asset (--input asset.json --assets-dir .webstudio/assets --json)",
    ],
  },
  {
    useCase: "Upload asset batch",
    commands: [
      "MCP tool: upload-assets (--input assets.json --assets-dir .webstudio/assets --json)",
    ],
  },
  {
    useCase: "Find asset usage",
    commands: ["MCP tool: find-asset-usage (--asset <assetId> --json)"],
  },
  {
    useCase: "Replace asset references",
    commands: [
      "MCP tool: replace-asset (--from <oldAssetId> --to <newAssetId> --confirm --json)",
    ],
  },
  {
    useCase: "Delete assets",
    commands: ["MCP tool: delete-asset (--asset <assetId> --confirm --json)"],
  },
  {
    useCase: "Publish project",
    commands: ["webstudio publish deploy --target production --json"],
  },
  {
    useCase: "List publishes",
    commands: ["webstudio publish list --json"],
  },
  {
    useCase: "Check publish job",
    commands: ["webstudio publish status --job <buildId> --json"],
  },
  {
    useCase: "Unpublish",
    commands: [
      "webstudio publish unpublish --target production --confirm --json",
    ],
  },
  {
    useCase: "List domains",
    commands: ["webstudio domains list --json"],
  },
  {
    useCase: "Create domain",
    commands: ["webstudio domains create --domain example.com --json"],
  },
  {
    useCase: "Update domain",
    commands: [
      "webstudio domains update --domain-id <domainId> --domain www.example.com --json",
    ],
  },
  {
    useCase: "Delete domain",
    commands: [
      "webstudio domains delete --domain-id <domainId> --confirm --json",
    ],
  },
  {
    useCase: "Verify domain",
    commands: ["webstudio domains verify --domain-id <domainId> --json"],
  },
  {
    useCase: "Make arbitrary store-level changes",
    commands: [
      "MCP tool: inspect (--json)",
      "MCP tool: snapshot (--include <namespaces> --json)",
      "MCP tool: apply-patch (--base-version <version> --input patch.json --json)",
    ],
    notes: ["Use only when no semantic command exists."],
  },
  {
    useCase: "Manage marketplace metadata",
    commands: [
      "MCP tool: snapshot (--include marketplaceProduct --json)",
      "MCP tool: apply-patch (--base-version <version> --input patch.json --json)",
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
      "Use focused MCP reads such as list-instances, list-texts, list-assets, find-asset-usage, and snapshot.",
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
      "Use MCP snapshot and apply-patch only when the template data model is understood.",
    suggestedCommands: [
      "create-page-template",
      "update-page-template",
      "delete-page-template",
    ],
  },
  {
    capability: "Semantic marketplace metadata",
    missing:
      "Marketplace metadata is only available through MCP snapshot/apply-patch, not dedicated semantic commands.",
    currentFallback:
      "Use MCP snapshot --include marketplaceProduct and apply-patch.",
    suggestedCommands: ["get-marketplace", "update-marketplace"],
  },
  {
    capability: "Provider-specific authenticated pages",
    missing:
      "CLI supports page basic auth and generic resources/props/embeds, but not guided Supabase/Firebase auth setup.",
    currentFallback:
      "Create the page, resources, variables, props, and embeds manually with existing MCP semantic tools.",
    suggestedCommands: ["setup-auth-page"],
  },
  {
    capability: "Dynamic script/runtime integration helpers",
    missing:
      "CLI can manipulate props/resources/embeds, but has no semantic workflow for converting script-generated UI into editable Webstudio structures.",
    currentFallback:
      "Use MCP append-instance, props, resources, and raw patch where necessary.",
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
