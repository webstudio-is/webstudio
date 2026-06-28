export const builderRuntimeCutoverManifests = [
  {
    family: "pages-read",
    operationIds: ["pages.list", "pages.get", "pages.getByPath"] as const,
    callers: ["appRouter.api.pages"] as const,
  },
  {
    family: "page-create-update-mutations",
    operationIds: ["pages.create", "pages.update"] as const,
    callers: ["appRouter.api.pages", "Builder pages UI"] as const,
  },
  {
    family: "page-delete-mutations",
    operationIds: ["pages.delete"] as const,
    callers: ["appRouter.api.pages"] as const,
  },
  {
    family: "page-duplicate-mutations",
    operationIds: ["pages.duplicate"] as const,
    callers: [
      "appRouter.api.pages",
      "Builder pages UI",
      "Builder copy/paste",
    ] as const,
  },
  {
    family: "page-template-operations",
    operationIds: ["pageTemplates.list", "pageTemplates.createPage"] as const,
    callers: ["appRouter.api.pageTemplates", "Builder pages UI"] as const,
  },
  {
    family: "project-settings-operations",
    operationIds: ["projectSettings.get", "projectSettings.update"] as const,
    callers: ["appRouter.api.projectSettings"] as const,
  },
  {
    family: "redirect-operations",
    operationIds: [
      "redirects.list",
      "redirects.create",
      "redirects.update",
      "redirects.delete",
    ] as const,
    callers: ["appRouter.api.redirects"] as const,
  },
  {
    family: "breakpoint-operations",
    operationIds: [
      "breakpoints.list",
      "breakpoints.create",
      "breakpoints.update",
      "breakpoints.delete",
    ] as const,
    callers: [
      "appRouter.api.breakpoints",
      "Builder breakpoint utilities",
    ] as const,
  },
  {
    family: "folders-read",
    operationIds: ["folders.list"] as const,
    callers: ["appRouter.api.folders"] as const,
  },
  {
    family: "folder-create-update-mutations",
    operationIds: ["folders.create", "folders.update"] as const,
    callers: ["appRouter.api.folders", "Builder pages UI"] as const,
  },
  {
    family: "folder-delete-mutations",
    operationIds: ["folders.delete"] as const,
    callers: ["appRouter.api.folders"] as const,
  },
  {
    family: "instances-read",
    operationIds: [
      "instances.list",
      "instances.inspect",
      "instances.listTexts",
    ] as const,
    callers: ["appRouter.api.instances"] as const,
  },
  {
    family: "instance-structural-api-mutations",
    operationIds: [
      "instances.append",
      "instances.move",
      "instances.clone",
      "instances.delete",
    ] as const,
    callers: ["appRouter.api.instances"] as const,
  },
  {
    family: "text-content-mutations",
    operationIds: ["instances.updateText"] as const,
    callers: [
      "appRouter.api.instances",
      "Builder text-content controls",
    ] as const,
  },
  {
    family: "prop-mutations",
    operationIds: [
      "instances.updateProps",
      "instances.deleteProps",
      "instances.bindProps",
    ] as const,
    callers: [
      "appRouter.api.instances",
      "Builder props utilities",
      "Builder settings panel",
      "Builder CSS variable utilities",
    ] as const,
  },
  {
    family: "style-reads",
    operationIds: ["styles.getDeclarations", "designTokens.list"] as const,
    callers: ["appRouter.api.styles", "appRouter.api.designTokens"] as const,
  },
  {
    family: "style-declaration-mutations",
    operationIds: [
      "styles.updateDeclarations",
      "styles.deleteDeclarations",
      "styles.replaceValues",
    ] as const,
    callers: ["appRouter.api.styles"] as const,
  },
  {
    family: "design-token-mutations",
    operationIds: [
      "designTokens.create",
      "designTokens.updateStyles",
      "designTokens.deleteStyles",
      "designTokens.attach",
      "designTokens.detach",
      "designTokens.extract",
    ] as const,
    callers: ["appRouter.api.designTokens"] as const,
  },
  {
    family: "css-variable-operations",
    operationIds: [
      "cssVariables.list",
      "cssVariables.define",
      "cssVariables.delete",
      "cssVariables.rewriteRefs",
    ] as const,
    callers: [
      "appRouter.api.cssVariables",
      "Builder CSS variable utilities",
    ] as const,
  },
  {
    family: "data-reads",
    operationIds: ["variables.list", "resources.list"] as const,
    callers: ["appRouter.api.variables", "appRouter.api.resources"] as const,
  },
  {
    family: "resource-mutations",
    operationIds: [
      "resources.create",
      "resources.update",
      "resources.delete",
    ] as const,
    callers: ["appRouter.api.resources"] as const,
  },
  {
    family: "asset-reference-operations",
    operationIds: [
      "assets.list",
      "assets.findUsage",
      "assets.replace",
      "assets.delete",
    ] as const,
    callers: [
      "appRouter.api.assets",
      "Builder asset manager",
      "Builder asset replacement",
    ] as const,
  },
  {
    family: "variable-mutations",
    operationIds: [
      "variables.create",
      "variables.update",
      "variables.delete",
    ] as const,
    callers: ["appRouter.api.variables"] as const,
  },
] as const;
