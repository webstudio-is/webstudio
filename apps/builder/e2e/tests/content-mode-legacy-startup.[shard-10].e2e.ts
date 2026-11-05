import { expect } from "@playwright/test";
import {
  blockBodyComponent,
  encodeDataSourceVariable,
  type DataSource,
} from "@webstudio-is/sdk";
import type {
  Instance,
  Prop,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import { loadDevBuild, updateBuild } from "../db";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  openProjectBuilder,
  waitForCanvasFrame,
  waitForCanvasText,
} from "../flows/builder";
import {
  getAssetIdByFilename,
  openAssetsPanel,
  uploadAsset,
} from "../flows/assets-panel";
import { selectCanvasImage } from "../flows/canvas-media";
import { replaceCanvasText } from "../flows/content-editing";
import { fillSelectedStringProperty } from "../flows/props-panel";
import { selectNavigatorItem } from "../flows/navigator";
import {
  waitForChangeToBeSaved,
  waitForSyncStatus,
} from "../flows/sync-status";
import { e2ePaidPlanName } from "../plans";
import { test, withBrowserContext } from "../test";

test("Editor can open and save legacy content before a Builder migrates the project", async ({
  page,
  browser,
}) => {
  const fixture = await withBrowserContext(browser, (context) =>
    createContentModeProject({
      context,
      devPlan: e2ePaidPlanName,
      email: "legacy-content-startup@webstudio.test",
      title: "Legacy content startup",
    })
  );
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const instances: Instance[] = JSON.parse(build.instances);
  const props: Prop[] = JSON.parse(build.props);
  const styleSources: StyleSource[] = JSON.parse(build.styleSources);
  const selections: StyleSourceSelection[] = JSON.parse(
    build.styleSourceSelections
  );
  const styles: StyleDecl[] = JSON.parse(build.styles);
  const breakpointId = (
    JSON.parse(build.breakpoints) as Array<{ id: string }>
  )[0].id;
  const imageId = "legacy-image-template";
  const sourceId = "legacy-image-local";
  const codeId = "legacy-code";
  const code = "const legacyAnswer = 42;";
  const readOnlyCodeId = "legacy-bound-code";
  const readOnlyCode = "Protected legacy code";
  const templates = instances.find(({ id }) => id === "content-block-template");
  const block = instances.find(({ id }) => id === "content-block");
  if (templates === undefined || block === undefined) {
    throw new Error("Expected Content Block templates and a Content Block");
  }
  templates.children.push({ type: "id", value: imageId });
  block.children.push(
    { type: "id", value: codeId },
    { type: "id", value: readOnlyCodeId }
  );
  instances.push(
    { type: "instance", id: imageId, component: "Image", children: [] },
    {
      type: "instance",
      id: codeId,
      component: "CodeText",
      label: "Legacy literal code",
      children: [],
    },
    {
      type: "instance",
      id: readOnlyCodeId,
      component: "CodeText",
      children: [],
    }
  );
  props.push(
    {
      id: "legacy-code-prop",
      instanceId: codeId,
      name: "code",
      type: "string",
      value: code,
    },
    {
      id: "legacy-bound-code-prop",
      instanceId: readOnlyCodeId,
      name: "code",
      type: "expression",
      value: JSON.stringify(readOnlyCode),
      mode: "read",
    }
  );
  styleSources.push({ id: sourceId, type: "local" });
  selections.push({ instanceId: imageId, values: [sourceId] });
  for (const [property, value] of [
    ["width", { type: "unit", value: 100, unit: "%" }],
    ["height", { type: "keyword", value: "auto" }],
    ["marginLeft", { type: "keyword", value: "auto" }],
    ["marginRight", { type: "keyword", value: "auto" }],
  ] as const) {
    styles.push({ styleSourceId: sourceId, breakpointId, property, value });
  }
  await updateBuild(build.id, {
    instances: JSON.stringify(instances),
    props: JSON.stringify(props),
    styleSources: JSON.stringify(styleSources),
    styleSourceSelections: JSON.stringify(selections),
    styles: JSON.stringify(styles),
  });

  const unexpectedDialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    if (dialog.type() !== "beforeunload") {
      unexpectedDialogs.push(dialog.message());
    }
    await dialog.dismiss();
  });
  expect(await page.context().cookies()).toEqual([]);
  await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.editorToken,
    mode: "content",
  });
  await waitForCanvasText({ page, text: fixture.shareLinkEditableText });
  await waitForSyncStatus({ page, status: "idle" });
  await waitForCanvasText({ page, text: code });
  expect((await loadDevBuild({ projectId: fixture.projectId })).version).toBe(
    0
  );

  const editedText = "Saved legacy Editor content";
  await replaceCanvasText({
    page,
    currentText: fixture.shareLinkEditableText,
    text: editedText,
  });
  await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.editorToken,
    mode: "content",
  });
  await waitForCanvasText({ page, text: editedText });
  await waitForCanvasText({ page, text: code });
  await waitForSyncStatus({ page, status: "idle" });
  const editedBuild = await loadDevBuild({ projectId: fixture.projectId });
  expect(JSON.parse(editedBuild.styles)).toEqual(styles);
  expect(JSON.parse(editedBuild.styleSources)).toEqual(styleSources);
  expect(JSON.parse(editedBuild.styleSourceSelections)).toEqual(selections);
  expect(JSON.parse(editedBuild.props)).toEqual(props);
  expect(unexpectedDialogs).toEqual([]);

  const canvas = await waitForCanvasFrame({ page });
  await canvas.getByText(readOnlyCode, { exact: true }).click();
  const textContent = page.locator(".cm-content");
  await expect(textContent).toHaveText(readOnlyCode);
  await expect(textContent).toHaveAttribute("contenteditable", "false");
  await selectNavigatorItem({ page, name: "Legacy literal code" });
  await expect(textContent).toHaveText(code);
  await expect(textContent).toHaveAttribute("contenteditable", "true");
  const editedCode = "const savedAnswer = 43;";
  const codeSave = waitForChangeToBeSaved({ page });
  codeSave.catch(() => undefined);
  await textContent.fill(editedCode);
  await textContent.press("ControlOrMeta+Enter");
  await codeSave;
  await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.editorToken,
    mode: "content",
  });
  await waitForCanvasText({ page, text: editedCode });
  await waitForCanvasText({ page, text: readOnlyCode });

  // Actual build permission still permits migration while using Content mode.
  await withBrowserContext(browser, async (context) => {
    const builderPage = await context.newPage();
    await openProjectBuilder({
      page: builderPage,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
      mode: "content",
    });
    await waitForCanvasText({ page: builderPage, text: editedText });
    await waitForCanvasText({ page: builderPage, text: editedCode });
    await waitForSyncStatus({ page: builderPage, status: "idle" });
  });
  const migratedBuild = await loadDevBuild({ projectId: fixture.projectId });
  expect(
    JSON.parse(migratedBuild.styleSources) as StyleSource[]
  ).not.toContainEqual({ id: sourceId, type: "local" });
  expect(
    (JSON.parse(migratedBuild.props) as Prop[]).some(
      ({ id }) => id === "legacy-code-prop"
    )
  ).toBe(false);
  expect(
    (JSON.parse(migratedBuild.instances) as Instance[]).find(
      ({ id }) => id === codeId
    )?.children
  ).toEqual([{ type: "text", value: editedCode }]);
  await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.editorToken,
    mode: "content",
  });
  await waitForCanvasText({ page, text: editedText });
  await waitForCanvasText({ page, text: editedCode });
  await waitForCanvasText({ page, text: readOnlyCode });
  await waitForSyncStatus({ page, status: "idle" });
  expect(unexpectedDialogs).toEqual([]);
});

test("Editor can edit legacy document bindings before a Builder visits", async ({
  page,
  browser,
}) => {
  const filename = "content-source.mdx";
  const { fixture, assetId } = await withBrowserContext(
    browser,
    async (context) => {
      const fixture = await createContentModeProject({
        context,
        devPlan: e2ePaidPlanName,
        email: "legacy-bindings@webstudio.test",
        title: "Legacy document bindings",
      });
      const setupPage = await context.newPage();
      await openProjectBuilder({
        page: setupPage,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
      await openAssetsPanel({ page: setupPage });
      await uploadAsset({ page: setupPage, filename });
      return {
        fixture,
        assetId: await getAssetIdByFilename({ page: setupPage, filename }),
      };
    }
  );
  // Seed the old representation only after the setup browser has closed.
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const instances: Instance[] = JSON.parse(build.instances);
  const props: Prop[] = JSON.parse(build.props);
  const dataSources: DataSource[] = JSON.parse(build.dataSources);
  const block = instances.find(({ id }) => id === "content-block");
  if (block === undefined) {
    throw new Error("Expected the fixture Content Block");
  }
  const documentId = "legacy-document";
  const expression = `${encodeDataSourceVariable(documentId)}.frontmatter.title`;
  block.children = [
    { type: "id", value: "legacy-bound-heading" },
    { type: "id", value: "legacy-bound-image" },
    { type: "id", value: "legacy-content-body" },
    { type: "id", value: "content-block-template" },
  ];
  instances.push(
    {
      id: "legacy-bound-heading",
      type: "instance",
      component: "Heading",
      children: [{ type: "expression", value: expression }],
    },
    {
      id: "legacy-bound-image",
      type: "instance",
      component: "Image",
      children: [],
    },
    {
      id: "legacy-content-body",
      type: "instance",
      component: blockBodyComponent,
      children: [],
    }
  );
  props.push(
    {
      id: "legacy-source",
      instanceId: block.id,
      name: "src",
      type: "asset",
      value: assetId,
    },
    {
      id: "legacy-document-prop",
      instanceId: block.id,
      name: "document",
      type: "parameter",
      value: documentId,
    },
    {
      id: "legacy-bound-alt",
      instanceId: "legacy-bound-image",
      name: "alt",
      type: "expression",
      value: expression,
    },
    {
      id: "legacy-image-src",
      instanceId: "legacy-bound-image",
      name: "src",
      type: "string",
      value:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23dff7e8'/%3E%3C/svg%3E",
    }
  );
  dataSources.push({
    id: documentId,
    type: "parameter",
    name: "document",
    scopeInstanceId: block.id,
  });
  await updateBuild(build.id, {
    instances: JSON.stringify(instances),
    props: JSON.stringify(props),
    dataSources: JSON.stringify(dataSources),
  });
  const dialogs: string[] = [];
  const projectWrites: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/trpc/build.patch") {
      projectWrites.push(request.method());
    }
  });
  expect(await page.context().cookies()).toEqual([]);
  await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.editorToken,
    mode: "content",
  });
  await waitForCanvasText({ page, text: "Content source fixture" });
  await waitForSyncStatus({ page, status: "idle" });
  const editedTitle = "Edited legacy document title";
  const titleWrite = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      new URL(response.url()).pathname === `/rest/assets/${assetId}/content` &&
      response.status() === 200
  );
  // Handle the pending response on failure as well as on success.
  titleWrite.catch(() => undefined);
  const canvas = await waitForCanvasFrame({ page });
  await canvas.getByRole("heading", { name: "Content source fixture" }).click();
  const textContent = page.locator(".cm-content");
  await expect(textContent).toHaveAttribute("contenteditable", "true");
  await textContent.fill(editedTitle);
  await textContent.press("ControlOrMeta+Enter");
  await titleWrite;
  await selectCanvasImage({ page, alt: editedTitle });
  const editedAlt = "Edited legacy image title";
  const altWrite = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      new URL(response.url()).pathname === `/rest/assets/${assetId}/content` &&
      response.status() === 200
  );
  altWrite.catch(() => undefined);
  await fillSelectedStringProperty({
    page,
    label: "Alt",
    control: "text",
    value: editedAlt,
    waitForProjectSync: false,
  });
  await altWrite;
  await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.editorToken,
    mode: "content",
  });
  await waitForCanvasText({ page, text: editedAlt });
  await waitForCanvasText({ page, text: "MDX source heading" });
  await waitForSyncStatus({ page, status: "idle" });
  const savedBuild = await loadDevBuild({ projectId: fixture.projectId });
  expect(JSON.parse(savedBuild.instances)).toEqual(instances);
  expect(JSON.parse(savedBuild.props)).toEqual(props);
  expect(savedBuild.version).toBe(build.version);
  expect(projectWrites).toEqual([]);
  expect(dialogs).toEqual([]);
});
