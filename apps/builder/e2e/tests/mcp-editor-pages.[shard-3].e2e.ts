import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { openProjectBuilder } from "../flows/builder";
import { openPage, openPageSettings } from "../flows/pages-panel";
import { openAssetsPanel, waitForAsset } from "../flows/assets-panel";
import { loadDevBuild } from "../db";
import { e2ePaidPlanName } from "../plans";
import { dashboardUrl, test } from "../test";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(
  new URL("../../../../packages/cli/local.js", import.meta.url)
);

test("Editor MCP saves permitted pages, folders, and assets", async ({
  page,
  context,
}) => {
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
  const call = async (tool: string, input: object, fresh = false) => {
    const args = [
      cliPath,
      "mcp",
      "single-op-call",
      tool,
      JSON.stringify(input),
      "--project",
      fixture.projectId,
    ];
    try {
      const { stdout } = await execFileAsync(process.execPath, args, {
        cwd: fresh ? freshDirectory : directory,
        timeout: 60_000,
        env: { ...process.env, WEBSTUDIO_CONFIG_DIR: directory },
      });
      return JSON.parse(stdout);
    } catch (error) {
      const stdout = (error as Error & { stdout?: string }).stdout;
      if (stdout === undefined) {
        throw error;
      }
      return JSON.parse(stdout);
    }
  };

  try {
    await writeFile(
      join(directory, "webstudio-config.json"),
      JSON.stringify({
        [fixture.projectId]: {
          origin: dashboardUrl,
          token: fixture.editorToken,
        },
      }),
      { mode: 0o600 }
    );

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

    const reloaded = await call("get-page", { pageId }, true);
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
      values: { status: "draft" },
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

    const asset = await call("get-asset", { assetId }, true);
    expect(asset.ok).toBe(true);
    expect(asset.data.asset).toMatchObject({
      id: assetId,
      folderId,
    });
    const folders = await call("list-asset-folders", {}, true);
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
  } finally {
    await Promise.all([
      rm(directory, { recursive: true, force: true }),
      rm(freshDirectory, { recursive: true, force: true }),
    ]);
  }
});
