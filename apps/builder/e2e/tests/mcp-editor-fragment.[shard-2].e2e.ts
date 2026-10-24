import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { loadDevBuild } from "../db";
import { e2ePaidPlanName } from "../plans";
import { dashboardUrl, test } from "../test";

const execFileAsync = promisify(execFile);
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
  const call = async (tool: string, input: object) => {
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
        cwd: directory,
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

    const inserted = await call("insert-fragment", {
      parentInstanceId: "content-block",
      fragment: `<p>${insertedText}</p>`,
      contentMode: true,
    });
    expect(inserted.ok, inserted.error?.code).toBe(true);
    expect(inserted.meta.session.commitStatus).toBe("committed");

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
    await rm(directory, { recursive: true, force: true });
  }
});
