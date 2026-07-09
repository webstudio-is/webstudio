import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";
import type { Instance, PageTemplate } from "@webstudio-is/sdk";
import { createDefaultPages, findCycles } from "@webstudio-is/project-build";
import type { BuilderRuntimeOperationInput } from "@webstudio-is/project-build/runtime/registry";
import {
  executeRuntimeMutation,
  executeRuntimeMutationAsync,
  getWebstudioData,
  migrateLoadedWebstudioData,
} from "./data";
import { registerContainers, serverSyncStore } from "../sync/sync-stores";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "../sync/data-stores";
import { $selectedPageId } from "../nano-states/pages";
import { $authPermit, $builderMode } from "../nano-states/misc";

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): Instance => {
  return { type: "instance", id, component, children };
};

registerContainers();

const collectSourceFiles = (directory: string): string[] => {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === "node_modules") {
        continue;
      }
      files.push(...collectSourceFiles(path));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) === false) {
      continue;
    }
    if (/\.(test|stories)\.(ts|tsx)$/.test(entry)) {
      continue;
    }
    files.push(path);
  }
  return files;
};

const getAppSourceFiles = () => collectSourceFiles(join(process.cwd(), "app"));

const getLineNumber = (source: string, index: number) =>
  source.slice(0, index).split("\n").length;

const getLineAt = (source: string, index: number) => {
  const lineStart = source.lastIndexOf("\n", index) + 1;
  const lineEnd = source.indexOf("\n", index);
  return source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd);
};

const readAppFile = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

const setBaseStores = () => {
  const pages = createDefaultPages({ rootInstanceId: "body" });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
  $builderMode.set("design");
  $authPermit.set("build");
  $instances.set(new Map([["body", createInstance("body", "Body", [])]]));
  $props.set(new Map());
  $breakpoints.set(new Map());
  $styleSourceSelections.set(new Map());
  $styleSources.set(new Map());
  $styles.set(new Map());
  $dataSources.set(new Map());
  $resources.set(new Map());
  $assets.set(new Map());
  return { pages };
};

const expectGeneratedId = (value: string | undefined, label: string) => {
  expect(value).toEqual(expect.any(String));
  if (value === undefined) {
    throw new Error(`Expected ${label} to be generated`);
  }
  return value;
};

describe("data store helpers", () => {
  test("keeps build data writes inside sync initialization and runtime bridge", () => {
    const allowedDirectWriteFiles = new Set([
      "app/shared/sync/data-stores.ts",
      "app/shared/sync/sync-client.ts",
    ]);
    const allowedDirectWrites = new Map([
      ["app/builder/builder.tsx", new Set(["$pages.set(undefined);"])],
    ]);
    const buildStoreWritePattern =
      /\$(pages|instances|props|styles|styleSources|styleSourceSelections|dataSources|resources|assets|breakpoints)\s*\.\s*(set|get\s*\(\s*\)\s*\.\s*(set|delete|clear))/g;
    const violations = getAppSourceFiles().flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const relativePath = relative(process.cwd(), file);
      if (allowedDirectWriteFiles.has(relativePath)) {
        return [];
      }
      const allowedLines = allowedDirectWrites.get(relativePath) ?? new Set();
      return Array.from(source.matchAll(buildStoreWritePattern)).flatMap(
        (match) => {
          if (
            match.index !== undefined &&
            allowedLines.has(getLineAt(source, match.index).trim())
          ) {
            return [];
          }
          return match.index === undefined
            ? [relativePath]
            : [`${relativePath}:${getLineNumber(source, match.index)}`];
        }
      );
    });

    expect(violations).toEqual([]);
  });

  test("keeps runtime bridge internals private to the sync adapter", () => {
    const allowedFiles = new Set(["app/shared/sync/builder-patch.ts"]);
    const removedBridgePattern = /\bupdateWebstudioData\s*\(/;
    const directTransactionPattern =
      /\bserverSyncStore\.createTransaction\s*\(/;
    const transactionAdapterPattern =
      /\bserverSyncStore\.createTransactionFromChanges\s*\(/;
    const violations = getAppSourceFiles().flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const relativePath = relative(process.cwd(), file);
      const fileViolations: string[] = [];
      if (removedBridgePattern.test(source)) {
        fileViolations.push(`${relativePath}: updateWebstudioData()`);
      }
      if (directTransactionPattern.test(source)) {
        fileViolations.push(
          `${relativePath}: serverSyncStore.createTransaction()`
        );
      }
      if (
        allowedFiles.has(relativePath) === false &&
        transactionAdapterPattern.test(source)
      ) {
        fileViolations.push(
          `${relativePath}: serverSyncStore.createTransactionFromChanges()`
        );
      }
      return fileViolations;
    });

    expect(violations).toEqual([]);
  });

  test("keeps low-level runtime mutation helpers inside the bridge", () => {
    const allowedFiles = new Set(["app/shared/instance-utils/data.ts"]);
    const runtimeMutationHelperImportPattern =
      /import\s+(?:type\s+)?(?:[^;]*?\b\w+(?:Mutable|Payload)\b[^;]*?)\s+from\s+["']@webstudio-is\/project-build(?:\/[^"']*)?["']/;
    const violations = getAppSourceFiles().flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const relativePath = relative(process.cwd(), file);
      if (allowedFiles.has(relativePath)) {
        return [];
      }
      return runtimeMutationHelperImportPattern.test(source)
        ? [relativePath]
        : [];
    });

    expect(violations).toEqual([]);
  });

  test("derives runtime mutation result types from operation ids", () => {
    const manualResultTypePattern = /executeRuntimeMutation(?:Async)?\s*</;
    const violations = getAppSourceFiles().flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const relativePath = relative(process.cwd(), file);
      return manualResultTypePattern.test(source) ? [relativePath] : [];
    });

    expect(violations).toEqual([]);
  });

  test("keeps risky migrated UI surfaces on the runtime bridge with regression coverage", () => {
    const surfaces = [
      {
        name: "insertion templates",
        sources: ["app/shared/instance-utils/insert.ts"],
        tests: [
          "app/shared/instance-utils/insert.test.tsx",
          "app/shared/instance-utils/fragment.test.tsx",
        ],
      },
      {
        name: "page settings defaults",
        sources: [
          "app/builder/features/pages/page-settings/page-settings.tsx",
          "app/builder/features/pages/template-settings.tsx",
        ],
        tests: [
          "app/builder/features/pages/page-settings/page-settings.test.ts",
          "app/builder/features/pages/template-settings.test.ts",
        ],
      },
      {
        name: "props and text content",
        sources: [
          "app/builder/features/settings-panel/props-section/props-section.tsx",
          "app/builder/features/settings-panel/controls/text-content.tsx",
        ],
        tests: [
          "app/builder/features/settings-panel/props-section/use-props-logic.test.ts",
          "app/shared/instance-utils/data.test.tsx",
        ],
      },
      {
        name: "instance tree mutations",
        sources: [
          "app/shared/instance-utils/mutation.ts",
          "app/builder/shared/commands.ts",
          "app/builder/features/navigator/navigator-tree.tsx",
        ],
        tests: [
          "app/shared/instance-utils/mutation.test.tsx",
          "app/shared/instance-utils/data.test.tsx",
        ],
      },
      {
        name: "styles and design tokens",
        sources: [
          "app/builder/features/style-panel/shared/use-style-data.ts",
          "app/builder/shared/style-source-actions.tsx",
        ],
        tests: [
          "app/builder/features/style-panel/shared/use-style-data.test.ts",
          "app/builder/shared/style-source-actions.test.tsx",
        ],
      },
      {
        name: "data variables",
        sources: [
          "app/builder/shared/data-variable-utils.tsx",
          "app/builder/features/settings-panel/variable-popover.tsx",
        ],
        tests: [
          "app/builder/shared/data-variable-utils.test.tsx",
          "app/shared/instance-utils/data.test.tsx",
        ],
      },
      {
        name: "css variables",
        sources: ["app/builder/shared/css-variable-utils.tsx"],
        tests: [
          "app/builder/shared/css-variable-utils.test.tsx",
          "app/shared/instance-utils/data.test.tsx",
        ],
      },
      {
        name: "resources",
        sources: [
          "app/builder/features/settings-panel/resource-panel.tsx",
          "app/builder/features/settings-panel/controls/resource-control.tsx",
        ],
        tests: [
          "app/builder/features/settings-panel/curl.test.ts",
          "app/shared/instance-utils/data.test.tsx",
        ],
      },
      {
        name: "assets",
        sources: [
          "app/builder/shared/assets/delete-assets.ts",
          "app/builder/shared/assets/replace-asset.ts",
          "app/builder/shared/assets/upload-assets.tsx",
          "app/builder/shared/asset-manager/asset-info.tsx",
        ],
        tests: [
          "app/builder/shared/assets/upload-assets.test.ts",
          "app/shared/instance-utils/data.test.tsx",
        ],
      },
      {
        name: "page and folder settings",
        sources: [
          "app/builder/features/pages/page-utils.ts",
          "app/builder/features/pages/folder-settings.tsx",
          "app/builder/features/pages/pages.tsx",
        ],
        tests: [
          "app/builder/features/pages/page-utils.test.ts",
          "app/shared/instance-utils/data.test.tsx",
        ],
      },
      {
        name: "project settings and redirects",
        sources: [
          "app/shared/project-settings/section-general.tsx",
          "app/shared/project-settings/section-auth.tsx",
          "app/shared/project-settings/section-marketplace.tsx",
          "app/shared/project-settings/section-publish.tsx",
          "app/shared/project-settings/section-redirects.tsx",
        ],
        tests: [
          "app/shared/project-settings/section-redirects.test.ts",
          "app/shared/instance-utils/data.test.tsx",
        ],
      },
      {
        name: "breakpoints",
        sources: [
          "app/builder/features/breakpoints/breakpoints-container.tsx",
          "app/builder/features/breakpoints/breakpoints-editor.tsx",
        ],
        tests: [
          "app/builder/features/breakpoints/breakpoint-editor-utils.test.ts",
          "app/shared/instance-utils/data.test.tsx",
        ],
      },
      {
        name: "runtime ids",
        sources: [
          "app/shared/instance-utils/data.ts",
          "app/shared/instance-utils/insert.ts",
          "app/builder/features/pages/page-utils.ts",
        ],
        tests: [
          "app/shared/instance-utils/data.test.tsx",
          "app/shared/instance-utils/insert.test.tsx",
        ],
      },
    ];

    const missingEvidence: string[] = [];
    for (const surface of surfaces) {
      for (const sourcePath of surface.sources) {
        const source = readAppFile(sourcePath);
        if (/executeRuntimeMutation(?:Async)?\s*\(/.test(source) === false) {
          missingEvidence.push(
            `${surface.name}: ${sourcePath} does not call the runtime bridge`
          );
        }
      }
      for (const testPath of surface.tests) {
        const source = readAppFile(testPath);
        if (/\btest\s*\(/.test(source) === false) {
          missingEvidence.push(
            `${surface.name}: ${testPath} has no test cases`
          );
        }
      }
    }

    expect(missingEvidence).toEqual([]);
  });

  test("getWebstudioData reads all instance-related stores", () => {
    const pages = createDefaultPages({ rootInstanceId: "body" });
    const instances = new Map([["body", createInstance("body", "Body", [])]]);
    $pages.set(pages);
    $instances.set(instances);
    $props.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $assets.set(new Map());

    expect(getWebstudioData()).toMatchObject({
      pages,
      instances,
    });
  });

  test("executes runtime mutations against builder stores", () => {
    setBaseStores();

    const result = executeRuntimeMutation({
      id: "instances.updateProps",
      input: {
        updates: [
          {
            instanceId: "body",
            name: "id",
            type: "string",
            value: "main",
          },
        ],
      },
    });

    expect(result?.result.propIds).toHaveLength(1);
    expect(Array.from($props.get().values())).toEqual([
      expect.objectContaining({
        instanceId: "body",
        name: "id",
        type: "string",
        value: "main",
      }),
    ]);
  });

  test("commits runtime patch payloads with sync undo and redo support", () => {
    setBaseStores();

    executeRuntimeMutation({
      id: "instances.updateProps",
      input: {
        updates: [
          {
            instanceId: "body",
            name: "id",
            type: "string",
            value: "main",
          },
        ],
      },
    });
    const [prop] = Array.from($props.get().values());
    expect(prop).toEqual(
      expect.objectContaining({
        instanceId: "body",
        name: "id",
        value: "main",
      })
    );

    serverSyncStore.undo();
    expect($props.get()).toEqual(new Map());

    serverSyncStore.redo();
    expect(Array.from($props.get().values())).toEqual([
      expect.objectContaining({
        instanceId: "body",
        name: "id",
        value: "main",
      }),
    ]);
  });

  test("runtime bridge keeps sync changes scoped to changed namespaces", () => {
    setBaseStores();
    serverSyncStore.popAll();

    executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: "body",
        mode: "text",
        text: "Hello",
      },
    });

    expect(
      serverSyncStore
        .popAll()
        .flatMap((item) => item.changes.map((change) => change.namespace))
    ).toEqual(["instances"]);
  });

  test("runtime bridge preserves parent record add patches from runtime payloads", () => {
    const { pages } = setBaseStores();
    pages.pageTemplates = new Map([
      [
        "template",
        {
          id: "template",
          name: "Template",
          title: JSON.stringify("Template"),
          rootInstanceId: "template-root",
          meta: {
            socialImageUrl: JSON.stringify(""),
            custom: [
              { property: "template", content: JSON.stringify("content") },
            ],
          },
        },
      ],
    ]);
    $instances.set(
      new Map([
        ["body", createInstance("body", "Body", [])],
        [
          "template-root",
          {
            type: "instance",
            id: "template-root",
            component: "ws:element",
            tag: "body",
            children: [],
          },
        ],
      ])
    );
    serverSyncStore.popAll();

    const result = executeRuntimeMutation({
      id: "pageTemplates.createPage",
      input: {
        projectId: "project",
        templateId: "template",
        parentFolderId: pages.rootFolderId,
        name: "Created from template",
        path: "/created-from-template",
        contentMode: true,
      },
    });
    const pageId = expectGeneratedId(result?.result.pageId, "page id");

    const pagesChange = serverSyncStore
      .popAll()
      .flatMap((item) => item.changes)
      .find((change) => change.namespace === "pages");
    expect(pagesChange).toBeDefined();
    if (pagesChange === undefined) {
      throw new Error("Expected pages change");
    }
    expect(pagesChange.patches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: "add", path: ["pages", pageId] }),
      ])
    );
    expect(pagesChange.revisePatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: "remove", path: ["pages", pageId] }),
      ])
    );

    const getSyncedPages = () => {
      const syncedPages = $pages.get();
      expect(syncedPages).toBeDefined();
      return syncedPages;
    };
    if (getSyncedPages() === undefined) {
      throw new Error("Expected pages to be loaded");
    }

    expect(getSyncedPages()?.pages.has(pageId)).toEqual(true);
    serverSyncStore.undo();
    expect(getSyncedPages()?.pages.has(pageId)).toEqual(false);
    serverSyncStore.redo();
    expect(getSyncedPages()?.pages.has(pageId)).toEqual(true);
  });

  test("uses runtime mutation input validation before updating stores", () => {
    setBaseStores();

    const invalidInput = {
      updates: [
        {
          instanceId: "body",
          name: "id",
          type: "number",
          value: "not-a-number",
        },
      ],
    } as unknown as BuilderRuntimeOperationInput<"instances.updateProps">;

    expect(() =>
      executeRuntimeMutation({
        id: "instances.updateProps",
        input: invalidInput,
      })
    ).toThrow();

    expect($props.get()).toEqual(new Map());
  });

  test("executes async runtime mutations against builder stores", async () => {
    setBaseStores();

    const result = await executeRuntimeMutationAsync({
      id: "instances.insertComponent",
      input: {
        parentInstanceId: "body",
        component: "ws:element",
        tag: "div",
      },
    });

    const rootInstanceId = expectGeneratedId(
      result?.result.rootInstanceIds[0],
      "root instance id"
    );
    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: rootInstanceId },
    ]);
    expect($instances.get().get(rootInstanceId)).toMatchObject({
      component: "ws:element",
      tag: "div",
    });
  });

  test("executes text content runtime mutations against builder stores", () => {
    setBaseStores();

    const result = executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: "body",
        mode: "text",
        text: "Hello",
      },
    });

    expect(result?.result).toEqual({
      instanceId: "body",
      operation: "set",
      mode: "text",
    });
    expect($instances.get().get("body")?.children).toEqual([
      { type: "text", value: "Hello" },
    ]);
  });

  test("uses text content runtime validation before updating stores", () => {
    setBaseStores();

    expect(() =>
      executeRuntimeMutation({
        id: "instances.setTextContent",
        input: {
          operation: "set",
          instanceId: "body",
          mode: "expression",
          text: "invalid expression {",
        },
      })
    ).toThrow("Unexpected token");

    expect($instances.get().get("body")?.children).toEqual([]);
  });

  test("executes breakpoint runtime mutations against builder stores", () => {
    setBaseStores();

    const createResult = executeRuntimeMutation({
      id: "breakpoints.create",
      input: {
        label: "Tablet",
        minWidth: 768,
      },
    });
    const breakpointId = expectGeneratedId(
      createResult?.result.breakpointId,
      "breakpoint id"
    );

    expect($breakpoints.get().get(breakpointId)).toEqual({
      id: breakpointId,
      label: "Tablet",
      minWidth: 768,
    });

    executeRuntimeMutation({
      id: "breakpoints.update",
      input: {
        breakpointId,
        values: {
          label: "Desktop",
          minWidth: 1024,
        },
      },
    });

    expect($breakpoints.get().get(breakpointId)).toEqual({
      id: breakpointId,
      label: "Desktop",
      minWidth: 1024,
    });
  });

  test("deletes breakpoint styles through runtime mutation", () => {
    setBaseStores();
    $breakpoints.set(
      new Map([["tablet", { id: "tablet", label: "Tablet", minWidth: 768 }]])
    );
    $styles.set(
      new Map([
        [
          "style",
          {
            styleSourceId: "local",
            breakpointId: "tablet",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      ])
    );

    executeRuntimeMutation({
      id: "breakpoints.delete",
      input: {
        breakpointId: "tablet",
      },
    });

    expect($breakpoints.get()).toEqual(new Map());
    expect($styles.get()).toEqual(new Map());
  });

  test("executes redirect runtime mutations against builder stores", () => {
    setBaseStores();

    executeRuntimeMutation({
      id: "redirects.setAll",
      input: {
        redirects: [{ old: "/old", new: "/new", status: "301" }],
      },
    });

    expect($pages.get()?.redirects).toEqual([
      { old: "/old", new: "/new", status: "301" },
    ]);
  });

  test("executes folder runtime mutations against builder stores", () => {
    setBaseStores();

    const createResult = executeRuntimeMutation({
      id: "folders.create",
      input: {
        name: "Docs",
        slug: "docs",
      },
    });
    const folderId = expectGeneratedId(
      createResult?.result.folderId,
      "folder id"
    );

    expect($pages.get()?.folders.get(folderId)).toEqual({
      id: folderId,
      name: "Docs",
      slug: "docs",
      children: [],
    });

    executeRuntimeMutation({
      id: "folders.update",
      input: {
        folderId,
        values: {
          name: "Guides",
          slug: "guides",
        },
      },
    });

    expect($pages.get()?.folders.get(folderId)).toEqual({
      id: folderId,
      name: "Guides",
      slug: "guides",
      children: [],
    });

    executeRuntimeMutation({
      id: "folders.delete",
      input: {
        folderId,
      },
    });

    expect($pages.get()?.folders.has(folderId)).toEqual(false);
  });

  test("executes page create and delete runtime mutations against builder stores", () => {
    setBaseStores();

    const createResult = executeRuntimeMutation({
      id: "pages.create",
      input: {
        name: "Pricing",
        path: "/pricing",
      },
    });
    const pageId = expectGeneratedId(createResult?.result.pageId, "page id");
    const rootInstanceId = expectGeneratedId(
      createResult?.result.rootInstanceId,
      "page root instance id"
    );

    expect($pages.get()?.pages.get(pageId)).toEqual(
      expect.objectContaining({
        id: pageId,
        name: "Pricing",
        path: "/pricing",
        rootInstanceId,
      })
    );
    expect($instances.get().get(rootInstanceId)).toEqual(
      expect.objectContaining({
        id: rootInstanceId,
        component: "ws:element",
        tag: "body",
      })
    );

    executeRuntimeMutation({
      id: "pages.delete",
      input: {
        pageId,
      },
    });

    expect($pages.get()?.pages.has(pageId)).toEqual(false);
    expect($instances.get().has(rootInstanceId)).toEqual(false);
  });

  test("executes data variable runtime mutations against builder stores", () => {
    setBaseStores();
    const page = $pages.get()?.pages.get($pages.get()?.homePageId ?? "");

    const createResult = executeRuntimeMutation({
      id: "variables.create",
      input: {
        scopeInstanceId: "body",
        name: "message",
        value: { type: "string", value: "Hello" },
      },
    });
    const dataSourceId = expectGeneratedId(
      createResult?.result.dataSourceId,
      "data source id"
    );

    expect($dataSources.get().get(dataSourceId)).toEqual({
      type: "variable",
      id: dataSourceId,
      scopeInstanceId: "body",
      name: "message",
      value: { type: "string", value: "Hello" },
    });

    executeRuntimeMutation({
      id: "variables.update",
      input: {
        dataSourceId,
        values: {
          name: "greeting",
        },
      },
    });

    expect($dataSources.get().get(dataSourceId)).toEqual(
      expect.objectContaining({
        name: "greeting",
      })
    );

    if (page !== undefined) {
      page.systemDataSourceId = dataSourceId;
    }
    executeRuntimeMutation({
      id: "variables.delete",
      input: {
        dataSourceId,
      },
    });

    expect($dataSources.get().has(dataSourceId)).toEqual(false);
    expect(
      $pages.get()?.pages.get($pages.get()?.homePageId ?? "")
    ).not.toHaveProperty("systemDataSourceId");
  });

  test("executes css variable runtime mutations against builder stores", () => {
    setBaseStores();
    $styles.set(
      new Map([
        [
          "local:base:--old:",
          {
            styleSourceId: "local",
            breakpointId: "base",
            property: "--old",
            value: { type: "unparsed", value: "red" },
          },
        ],
        [
          "local:base:color:",
          {
            styleSourceId: "local",
            breakpointId: "base",
            property: "color",
            value: { type: "unparsed", value: "var(--old)" },
          },
        ],
      ])
    );
    $props.set(
      new Map([
        [
          "code-prop",
          {
            id: "code-prop",
            instanceId: "body",
            name: "code",
            type: "string",
            value: "<style>.x{color:var(--old)}</style>",
          },
        ],
      ])
    );

    executeRuntimeMutation({
      id: "cssVariables.rename",
      input: {
        oldName: "--old",
        newName: "--new",
      },
    });

    expect($styles.get().has("local:base:--old:")).toEqual(false);
    expect($styles.get().get("local:base:--new:")).toEqual(
      expect.objectContaining({
        property: "--new",
      })
    );
    expect($styles.get().get("local:base:color:")).toEqual(
      expect.objectContaining({
        value: { type: "unparsed", value: "var(--new)" },
      })
    );
    expect($props.get().get("code-prop")).toEqual(
      expect.objectContaining({
        value: "<style>.x{color:var(--new)}</style>",
      })
    );

    executeRuntimeMutation({
      id: "cssVariables.delete",
      input: {
        names: ["--new"],
        force: true,
      },
    });

    expect($styles.get().has("local:base:--new:")).toEqual(false);
  });

  test("runtime bridge skips page templates without build access", () => {
    const pages = createDefaultPages({ rootInstanceId: "body" });
    const template: PageTemplate = {
      id: "template",
      name: "Template",
      title: "Template",
      rootInstanceId: "template-root",
      meta: {},
    };
    pages.pageTemplates = new Map([[template.id, template]]);
    $pages.set(pages);
    $selectedPageId.set(template.id);
    $builderMode.set("design");
    $authPermit.set("view");
    $instances.set(new Map([["body", createInstance("body", "Body", [])]]));
    $props.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $assets.set(new Map());

    executeRuntimeMutation({
      id: "instances.setTextContent",
      input: {
        operation: "set",
        instanceId: "body",
        mode: "text",
        text: "Skipped",
      },
    });

    expect($instances.get().get("body")?.children).toEqual([]);
  });

  test("runtime bridge repairs cycles during loaded data migration", () => {
    const pages = createDefaultPages({ rootInstanceId: "body" });
    const instances = new Map([
      [
        "body",
        createInstance("body", "Body", [{ type: "id", value: "parent" }]),
      ],
      [
        "parent",
        createInstance("parent", "Box", [{ type: "id", value: "child" }]),
      ],
      ["child", createInstance("child", "Box", [])],
    ]);
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    $builderMode.set("design");
    $authPermit.set("build");
    $instances.set(instances);
    $props.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $assets.set(new Map());
    $instances.get().get("child")?.children.push({
      type: "id",
      value: "parent",
    });

    migrateLoadedWebstudioData();

    expect(findCycles($instances.get().values())).toEqual([]);
  });
});
