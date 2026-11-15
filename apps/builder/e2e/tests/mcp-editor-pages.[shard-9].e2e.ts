import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { openProjectBuilder } from "../flows/builder";
import { openPage, openPageSettings } from "../flows/pages-panel";
import { openAssetsPanel, waitForAsset } from "../flows/assets-panel";
import { insertAuthorizationToken, loadDevBuild } from "../db";
import { e2ePaidPlanName } from "../plans";
import { dashboardUrl, test } from "../test";

const cliPath = fileURLToPath(
  new URL("../../../../packages/cli/local.js", import.meta.url)
);

test("Editor MCP saves permitted pages, folders, and assets", async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  const fixture = await createContentModeProject({
    context,
    email: "mcp-editor-pages@webstudio.test",
    title: "MCP Editor pages",
    devPlan: e2ePaidPlanName,
    editorCanUseApi: true,
  });
  const directory = await mkdtemp(join(tmpdir(), "webstudio-mcp-pages-"));
  const freshDirectory = await mkdtemp(
    join(tmpdir(), "webstudio-mcp-pages-read-")
  );
  const viewerDirectory = await mkdtemp(
    join(tmpdir(), "webstudio-mcp-pages-viewer-")
  );
  const builderDirectory = await mkdtemp(
    join(tmpdir(), "webstudio-mcp-pages-builder-")
  );
  const viewerToken = `${fixture.projectId}-mcp-viewer-token`;
  const builderToken = `${fixture.projectId}-mcp-builder-token`;
  const directories = {
    editor: directory,
    viewer: viewerDirectory,
    builder: builderDirectory,
  };
  const clients = new Map<keyof typeof directories, Client>();
  const connect = async (cwd: string, configDirectory: string) => {
    const client = new Client({
      name: "mcp-editor-pages-e2e",
      version: "1.0.0",
    });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [cliPath, "mcp", "--project", fixture.projectId],
      cwd,
      env: {
        ...process.env,
        WEBSTUDIO_CONFIG_DIR: configDirectory,
      } as Record<string, string>,
      stderr: "inherit",
    });
    try {
      await client.connect(transport);
    } catch (error) {
      await client.close().catch(() => undefined);
      throw error;
    }
    return client;
  };
  const call = async (
    tool: string,
    input: object,
    {
      fresh = false,
      role = "editor",
    }: { fresh?: boolean; role?: keyof typeof directories } = {}
  ) => {
    const client = fresh
      ? await connect(freshDirectory, directories[role])
      : (clients.get(role) ??
        (await connect(directories[role], directories[role])));
    if (fresh === false) {
      clients.set(role, client);
    }
    try {
      const result = await client.callTool({
        name: tool,
        arguments: input as Record<string, unknown>,
      });
      return JSON.parse(JSON.stringify(result.structuredContent));
    } finally {
      if (fresh) {
        await client.close();
      }
    }
  };

  try {
    await insertAuthorizationToken({
      token: viewerToken,
      projectId: fixture.projectId,
      name: "E2E MCP viewer token",
      relation: "viewers",
      canUseApi: true,
    });
    await insertAuthorizationToken({
      token: builderToken,
      projectId: fixture.projectId,
      name: "E2E MCP builder token",
      relation: "builders",
      canUseApi: true,
    });
    for (const [role, token] of [
      ["editor", fixture.editorToken],
      ["viewer", viewerToken],
      ["builder", builderToken],
    ] as const) {
      await writeFile(
        join(directories[role], "webstudio-config.json"),
        JSON.stringify({
          [fixture.projectId]: { origin: dashboardUrl, token },
        }),
        { mode: 0o600 }
      );
    }

    const templates = await call("list-page-templates", {});
    expect(templates.ok).toBe(true);
    const template = templates.data.templates.find(
      (item: { name: string }) => item.name === fixture.pageTemplateName
    );
    expect(template).toBeDefined();

    const created = await call("create-page-from-template", {
      templateId: template.id,
      name: "MCP content page",
      path: "/mcp-content-page",
    });
    expect(created.ok, created.error?.message).toBe(true);
    expect(created.meta.session.commitStatus).toBe("committed");
    const pageId = created.data.pageId;

    const updated = await call("update-page-settings", {
      pageId,
      values: {
        name: "Edited MCP content page",
        path: "/edited-mcp-content-page",
        title: '"Edited MCP title"',
        description: '"Edited MCP description"',
      },
    });
    expect(updated.ok, updated.error?.message).toBe(true);
    expect(updated.meta.session.commitStatus).toBe("committed");

    const reloaded = await call("get-page", { pageId }, { fresh: true });
    expect(reloaded.ok).toBe(true);
    expect(reloaded.data).toMatchObject({
      id: pageId,
      name: "Edited MCP content page",
      path: "/edited-mcp-content-page",
      title: '"Edited MCP title"',
      meta: { description: '"Edited MCP description"' },
    });

    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
      mode: "content",
    });
    await openPage({
      page,
      pageName: "Edited MCP content page",
      canvasText: fixture.pageTemplateText,
    });
    await openPageSettings({ page, pageName: "Edited MCP content page" });
    await expect(page.getByLabel("Title")).toHaveValue("Edited MCP title");

    const beforeDenied = await loadDevBuild({ projectId: fixture.projectId });
    const denied = await call("update-page-settings", {
      pageId,
      values: { status: "302" },
    });
    expect(denied.ok).toBe(false);
    expect(denied.error.code, denied.error.message).toBe("FORBIDDEN");
    const afterDenied = await loadDevBuild({ projectId: fixture.projectId });
    expect(afterDenied.version).toBe(beforeDenied.version);
    expect(afterDenied.pages).toEqual(beforeDenied.pages);

    const folder = await call("create-asset-folder", {
      name: "Editor MCP assets",
    });
    expect(folder.ok, folder.error?.message).toBe(true);
    expect(folder.meta.session.commitStatus).toBe("committed");
    const folderId = folder.data.folderId;

    const filename = "mcp-editor-asset.txt";
    await writeFile(join(directory, filename), "Editor asset content");
    const uploaded = await call("upload-asset", {
      asset: { name: filename, type: "file", format: "txt", folderId },
      assetsDir: directory,
    });
    expect(uploaded.ok, uploaded.error?.message).toBe(true);
    expect(uploaded.meta.session.commitStatus).toBe("committed");
    const assetId = uploaded.data.uploaded[0].id;

    const asset = await call("get-asset", { assetId }, { fresh: true });
    expect(asset.ok).toBe(true);
    expect(asset.data.asset).toMatchObject({
      id: assetId,
      folderId,
    });
    const folders = await call("list-asset-folders", {}, { fresh: true });
    expect(folders.ok).toBe(true);
    expect(folders.data.folders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: folderId, name: "Editor MCP assets" }),
      ])
    );

    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
      mode: "content",
    });
    await openAssetsPanel({ page });
    await page
      .getByRole("button", { name: "Folder Editor MCP assets" })
      .dblclick();
    await waitForAsset({ page, filename });

    const beforeViewerWrites = await loadDevBuild({
      projectId: fixture.projectId,
    });
    expect((await call("list-pages", {}, { role: "viewer" })).ok).toBe(true);
    for (const [tool, input] of [
      [
        "create-page-from-template",
        { templateId: template.id, name: "Denied", path: "/denied" },
      ],
      ["create-asset-folder", { name: "Denied folder" }],
      [
        "upload-asset",
        {
          asset: { name: filename, type: "file", format: "txt" },
          assetsDir: directory,
        },
      ],
    ] as const) {
      const denied = await call(tool, input, { role: "viewer" });
      expect(denied.ok, tool).toBe(false);
      expect(denied.error.code, `${tool}: ${denied.error.message}`).toBe(
        "FORBIDDEN"
      );
    }
    const afterViewerWrites = await loadDevBuild({
      projectId: fixture.projectId,
    });
    expect(afterViewerWrites.version).toBe(beforeViewerWrites.version);
    expect(afterViewerWrites.pages).toEqual(beforeViewerWrites.pages);

    const builderWrite = await call(
      "update-page-settings",
      { pageId, values: { status: "302" } },
      { role: "builder" }
    );
    expect(builderWrite.ok, builderWrite.error?.message).toBe(true);
    const builderPage = await call("get-page", { pageId }, { role: "builder" });
    expect(builderPage.data.meta.status).toBe("302");
  } finally {
    await Promise.all(Array.from(clients.values(), (client) => client.close()));
    await Promise.all([
      rm(directory, { recursive: true, force: true }),
      rm(freshDirectory, { recursive: true, force: true }),
      rm(viewerDirectory, { recursive: true, force: true }),
      rm(builderDirectory, { recursive: true, force: true }),
    ]);
  }
});
