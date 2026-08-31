import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { getFontFaces } from "@webstudio-is/fonts";
import type { FontAsset } from "@webstudio-is/sdk";
import {
  authenticatedPageFixture,
  fontAssetsFixture,
  markdownBlogFixture,
} from "./fixtures";
import { startHighImpactFixtureApi } from "./fixture-api";
import {
  fontAssetFixtureFiles,
  fontAssetFixtureMeta,
  fontAssetFixtureSource,
  fontAssetFixtureUploadMeta,
  writeFontAssetFixtureFiles,
} from "./font-assets-fixture";
import {
  markdownBlogFixtureDocuments,
  writeMarkdownBlogFixtureFiles,
} from "./markdown-blog-fixture";

const execFileAsync = promisify(execFile);

describe("high-impact fixture API", () => {
  test("links and reads through the source CLI without persisting credentials", async () => {
    const fixtureApi = await startHighImpactFixtureApi(
      authenticatedPageFixture
    );
    const directory = await mkdtemp(join(tmpdir(), "high-impact-fixture-api-"));
    const configDirectory = join(directory, "config");
    const projectDirectory = join(directory, "project");
    const cli = resolve(import.meta.dirname, "../../local.js");
    await mkdir(projectDirectory, { recursive: true });
    const env = { ...process.env, WEBSTUDIO_CONFIG_DIR: configDirectory };
    try {
      const initialized = await execFileAsync(
        process.execPath,
        [cli, "init", "--link", fixtureApi.shareLink, "--json"],
        { cwd: projectDirectory, env }
      );
      expect(JSON.parse(initialized.stdout)).toMatchObject({
        ok: true,
        data: { projectId: "high-impact-evaluation-project" },
      });

      const listed = await execFileAsync(
        process.execPath,
        [cli, "list-pages", "{}"],
        { cwd: projectDirectory, env }
      );
      expect(JSON.parse(listed.stdout)).toMatchObject({
        ok: true,
        data: { pages: [expect.objectContaining({ name: "Home" })] },
        meta: {
          session: { buildId: "high-impact-evaluation-build" },
        },
      });
      expect(JSON.stringify(fixtureApi.getProject())).not.toContain(
        "fixture-only-not-persisted"
      );
    } finally {
      await fixtureApi.close();
      await rm(directory, { recursive: true, force: true });
    }
  }, 60_000);

  test("uploads, corrects, refreshes, and generates font asset sources through MCP", async () => {
    const fixtureApi = await startHighImpactFixtureApi(fontAssetsFixture);
    const directory = await mkdtemp(join(tmpdir(), "font-assets-fixture-api-"));
    const configDirectory = join(directory, "config");
    const projectDirectory = join(directory, "project");
    const cli = resolve(import.meta.dirname, "../../local.js");
    await writeFontAssetFixtureFiles(projectDirectory);
    const env = { ...process.env, WEBSTUDIO_CONFIG_DIR: configDirectory };
    const run = async (command: string, input: Record<string, unknown>) => {
      const result = await execFileAsync(
        process.execPath,
        [cli, command, JSON.stringify(input)],
        { cwd: projectDirectory, env }
      );
      const output = JSON.parse(result.stdout) as Record<string, unknown>;
      expect(output).toMatchObject({ ok: true });
      return output;
    };
    try {
      await execFileAsync(
        process.execPath,
        [cli, "init", "--link", fixtureApi.shareLink, "--json"],
        { cwd: projectDirectory, env }
      );
      for (const { name, format } of fontAssetFixtureFiles) {
        const output = await run("upload-asset", {
          asset: {
            name,
            type: "font",
            format,
            meta: fontAssetFixtureUploadMeta,
          },
        });
        expect(output).toMatchObject({
          data: { uploaded: [expect.objectContaining({ name })] },
        });
      }
      expect(fixtureApi.getToolCalls()).toEqual([
        expect.objectContaining({ name: "upload-asset" }),
        expect.objectContaining({ name: "upload-asset" }),
      ]);
      expect(fixtureApi.getProject().assets).toHaveLength(2);

      for (const asset of fixtureApi.getProject().assets) {
        await run("update-asset", {
          assetId: asset.id,
          values: {
            meta: fontAssetFixtureMeta,
          },
        });
      }
      await run("refresh", { namespaces: ["assets"] });
      for (const asset of fixtureApi.getProject().assets) {
        await run("get-asset", { assetId: asset.id });
      }

      const assets = fixtureApi
        .getProject()
        .assets.filter((asset): asset is FontAsset => asset.type === "font");
      expect(assets).toHaveLength(2);
      expect(assets.map((asset) => asset.meta)).toEqual(
        fontAssetFixtureFiles.map(() => fontAssetFixtureMeta)
      );
      expect(getFontFaces(assets, { assetBaseUrl: "/assets/" })).toEqual([
        {
          fontDisplay: "swap",
          fontFamily: "Rajdhani",
          fontStyle: "normal",
          fontWeight: 600,
          src: fontAssetFixtureSource,
        },
      ]);
    } finally {
      await fixtureApi.close();
      await rm(directory, { recursive: true, force: true });
    }
  }, 120_000);

  test("creates a folder and uploads the Markdown blog files through the local CLI", async () => {
    const fixtureApi = await startHighImpactFixtureApi(markdownBlogFixture);
    const directory = await mkdtemp(
      join(tmpdir(), "markdown-blog-fixture-api-")
    );
    const configDirectory = join(directory, "config");
    const projectDirectory = join(directory, "project");
    const cli = resolve(import.meta.dirname, "../../local.js");
    await writeMarkdownBlogFixtureFiles(projectDirectory);
    const env = { ...process.env, WEBSTUDIO_CONFIG_DIR: configDirectory };
    const run = async (command: string, input: Record<string, unknown>) => {
      const result = await execFileAsync(
        process.execPath,
        [cli, command, JSON.stringify(input)],
        { cwd: projectDirectory, env }
      );
      return JSON.parse(result.stdout) as {
        ok: boolean;
        data: Record<string, unknown>;
      };
    };
    try {
      await execFileAsync(
        process.execPath,
        [cli, "init", "--link", fixtureApi.shareLink, "--json"],
        { cwd: projectDirectory, env }
      );
      const folder = await run("create-asset-folder", { name: "Blog" });
      expect(folder.ok).toBe(true);
      const folderId = String(folder.data.folderId);
      const upload = await run("upload-assets", {
        assets: markdownBlogFixtureDocuments.map(({ name, format }) => ({
          name,
          type: "file",
          format,
          folderId,
          meta: {},
        })),
        assetsDir: ".webstudio/assets",
      });
      expect(upload.ok).toBe(true);
      const project = fixtureApi.getProject();
      expect(project).toMatchObject({
        assetFolders: [expect.objectContaining({ id: folderId, name: "Blog" })],
      });
      expect(project.assets).toHaveLength(markdownBlogFixtureDocuments.length);
      expect(project.assets).toEqual(
        expect.arrayContaining(
          markdownBlogFixtureDocuments.map(({ name, format }) =>
            expect.objectContaining({
              name,
              filename: name.slice(0, name.lastIndexOf(".")),
              type: "file",
              format,
              folderId,
            })
          )
        )
      );
      await expect(
        readFile(
          join(projectDirectory, ".webstudio/assets/aurora-trails.md"),
          "utf8"
        )
      ).resolves.toContain("name: Mira Chen");
    } finally {
      await fixtureApi.close();
      await rm(directory, { recursive: true, force: true });
    }
  }, 60_000);
});
