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
import { loadDevBuild } from "../db";
import { e2ePaidPlanName } from "../plans";
import { dashboardUrl, test } from "../test";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(
  new URL("../../../../packages/cli/local.js", import.meta.url)
);

test("Editor MCP creates a content page and edits only allowed page settings", async ({
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
      contentMode: true,
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
  } finally {
    await Promise.all([
      rm(directory, { recursive: true, force: true }),
      rm(freshDirectory, { recursive: true, force: true }),
    ]);
  }
});
