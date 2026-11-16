import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { loadDevBuild } from "../db";
import { e2ePaidPlanName } from "../plans";
import { dashboardUrl, test } from "../test";

const cliPath = fileURLToPath(
  new URL("../../../../packages/cli/local.js", import.meta.url)
);

test("Editor MCP fragment insertion persists inside Content Block and rejects its template", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-editor-fragment@webstudio.test",
    title: "MCP Editor fragment",
    devPlan: e2ePaidPlanName,
    editorCanUseApi: true,
  });
  const directory = await mkdtemp(join(tmpdir(), "webstudio-mcp-editor-"));
  const insertedText = "Editor MCP round-trip content";
  const deniedText = "Protected template must stay unchanged";
  const client = new Client({
    name: "mcp-editor-fragment-e2e",
    version: "1.0.0",
  });
  const call = async (name: string, args: Record<string, unknown>) => {
    const result = await client.callTool({ name, arguments: args });
    return JSON.parse(JSON.stringify(result.structuredContent));
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

    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [cliPath, "mcp", "--project", fixture.projectId],
        cwd: directory,
        env: {
          ...process.env,
          WEBSTUDIO_CONFIG_DIR: directory,
        } as Record<string, string>,
        stderr: "inherit",
      })
    );

    const inserted = await call("insert-fragment", {
      parentInstanceId: "content-block",
      fragment: `<p>${insertedText}</p>`,
      contentMode: true,
    });
    expect(inserted.ok, inserted.error?.code).toBe(true);
    expect(inserted.meta.session.commitStatus).toBe("committed");

    expect((await call("refresh", {})).ok).toBe(true);
    const reloaded = await call("list-texts", { contains: insertedText });
    expect(reloaded.ok).toBe(true);
    expect(reloaded.data.texts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ valuePreview: insertedText }),
      ])
    );

    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
      mode: "content",
    });
    await waitForCanvasText({ page, text: insertedText });

    const beforeDenied = await loadDevBuild({ projectId: fixture.projectId });
    const denied = await call("insert-fragment", {
      parentInstanceId: "content-block-template",
      fragment: `<p>${deniedText}</p>`,
      contentMode: true,
    });
    expect(denied.ok).toBe(false);
    expect(denied.error.code, denied.error.message).toBe("FORBIDDEN");

    const afterDenied = await loadDevBuild({ projectId: fixture.projectId });
    expect(afterDenied.version).toBe(beforeDenied.version);
    expect(afterDenied.instances).toEqual(beforeDenied.instances);
  } finally {
    try {
      await client.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
});
