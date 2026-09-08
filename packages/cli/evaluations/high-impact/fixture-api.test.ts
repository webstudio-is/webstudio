import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { getFontFaces } from "@webstudio-is/fonts";
import type { FontAsset } from "@webstudio-is/sdk";
import { createProjectAssetContentTransport } from "@webstudio-is/http-client";
import { parseMarkdownDocumentSource } from "@webstudio-is/content-engine";
import {
  createHttpAssetContentRepository,
  readAssetContentBytes,
  AssetRevisionConflictError,
} from "@webstudio-is/content-engine/asset-content-repository";
import {
  authenticatedPageFixture,
  fontAssetsFixture,
  markdownBlogFixture,
  mdxArticleFixture,
  mdxArticleSource,
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
import { evaluateHighImpactOutcome } from "./validate";

const execFileAsync = promisify(execFile);

describe("high-impact fixture API", () => {
  test("connects, edits, and reloads the MDX article through the source CLI", async () => {
    const api = await startHighImpactFixtureApi(mdxArticleFixture);
    const initialProject = api.getProject();
    const directory = await mkdtemp(join(tmpdir(), "mdx-article-fixture-api-"));
    const projectDirectory = join(directory, "project");
    await mkdir(projectDirectory);
    const cli = resolve(import.meta.dirname, "../../local.js");
    const env = {
      ...process.env,
      WEBSTUDIO_CONFIG_DIR: join(directory, "config"),
    };
    const run = async (command: string, input: Record<string, unknown>) => {
      const result = await execFileAsync(
        process.execPath,
        [cli, command, JSON.stringify(input)],
        { cwd: projectDirectory, env }
      );
      expect(JSON.parse(result.stdout)).toMatchObject({ ok: true });
    };
    try {
      await execFileAsync(
        process.execPath,
        [cli, "init", "--link", api.shareLink, "--json"],
        { cwd: projectDirectory, env }
      );
      const occurrence = {
        blockInstanceId: "article-block",
        renderScope: "page:/",
      };
      await run("connect-content-block-source", {
        ...occurrence,
        source: { type: "asset", assetId: "article-file" },
      });
      await run("update-content-block-frontmatter", {
        ...occurrence,
        properties: {
          title: "Aurora trails",
          author: { name: "Noor Silva" },
          readingTime: 6,
          draft: false,
        },
      });
      await run("reload-content-block-source", occurrence);
      await run("inspect-content-block-source", occurrence);
      const document = await parseMarkdownDocumentSource({
        source: api.getAssetSource("article-file")!,
      });
      const original = await parseMarkdownDocumentSource({
        source: mdxArticleSource,
      });
      expect(document.frontmatter).toEqual({
        ...original.frontmatter,
        author: { name: "Noor Silva" },
      });
      expect(document.body).toBe(original.body);
      const headerIds = new Set([
        "article-title",
        "article-author",
        "article-reading-time",
        "article-reading-suffix",
      ]);
      expect(
        api
          .getProject()
          .instances.filter((instance) => headerIds.has(instance.id))
      ).toEqual(
        initialProject.instances.filter((instance) =>
          headerIds.has(instance.id)
        )
      );
    } finally {
      await api.close();
      await rm(directory, { recursive: true, force: true });
    }
  }, 60_000);
  test("persists MDX source revisions and rejects stale writes through the real client", async () => {
    const api = await startHighImpactFixtureApi(mdxArticleFixture);
    try {
      const projectId = "high-impact-evaluation-project";
      const repository = createHttpAssetContentRepository({
        projectId,
        ...createProjectAssetContentTransport({
          projectId,
          origin: api.origin,
        }),
      });
      const initial = await readAssetContentBytes({
        repository,
        assetId: "article-file",
        maxSize: 10_000,
      });
      expect(new TextDecoder().decode(initial.bytes)).toBe(mdxArticleSource);
      const source = mdxArticleSource.replace("Mira Chen", "Noor Silva");
      const updated = await repository.updateContent({
        assetId: "article-file",
        expectedName: initial.asset.name,
        data: new Blob([source]).stream(),
      });
      expect(updated.name).not.toBe(initial.asset.name);
      const reloaded = await readAssetContentBytes({
        repository,
        assetId: "article-file",
        maxSize: 10_000,
      });
      expect(new TextDecoder().decode(reloaded.bytes)).toBe(source);
      expect(api.getAssetSource("article-file")).toBe(source);
      await expect(
        repository.updateContent({
          assetId: "article-file",
          expectedName: initial.asset.name,
          data: new Blob(["stale overwrite"]).stream(),
        })
      ).rejects.toBeInstanceOf(AssetRevisionConflictError);
      expect(api.getAssetSource("article-file")).toBe(source);
    } finally {
      await api.close();
    }
  });
  test("keeps an untouched fixture page unchanged after persistence", async () => {
    const fixtureApi = await startHighImpactFixtureApi(fontAssetsFixture);
    try {
      const result = evaluateHighImpactOutcome({
        fixture: fontAssetsFixture,
        project: fixtureApi.getProject(),
        toolCalls: [],
      });

      expect(result.checks.pageUnchanged).toBe("passed");
    } finally {
      await fixtureApi.close();
    }
  });

  test("round-trips persisted page title and metadata", async () => {
    const fixture = structuredClone(authenticatedPageFixture);
    fixture.project.pages[0] = {
      ...fixture.project.pages[0]!,
      title: 'account.data.name ?? "Account"',
      meta: {
        description: 'account.data.description ?? ""',
        socialImageUrl: 'account.data.image.src ?? ""',
        status: "account.data ? 200 : 404",
      },
    };
    const fixtureApi = await startHighImpactFixtureApi(fixture);
    try {
      expect(fixtureApi.getProject().pages[0]).toMatchObject({
        title: 'account.data.name ?? "Account"',
        meta: {
          description: 'account.data.description ?? ""',
          socialImageUrl: 'account.data.image.src ?? ""',
          status: "account.data ? 200 : 404",
        },
      });
    } finally {
      await fixtureApi.close();
    }
  });

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
      const query = {
        result: "one",
        where: {
          all: [
            { field: ["extension"], operator: "eq", value: "md" },
            {
              field: ["folderId"],
              operator: "eq",
              value: folderId,
            },
            {
              field: ["properties", "slug"],
              operator: "eq",
              value: "aurora-trails",
            },
          ],
        },
        output: {
          mode: "fields",
          includeMetadata: false,
          fields: [["properties", "title"]],
        },
        content: { mode: "markdown-body-ref" },
      };
      await expect(
        run("validate-asset-query", { query })
      ).resolves.toMatchObject({
        ok: true,
        data: { valid: true, filterCount: 3 },
      });
      await expect(
        run("preview-asset-query", { query })
      ).resolves.toMatchObject({
        ok: true,
        data: {
          data: {
            item: {
              properties: { title: "Aurora trails" },
              content: { text: expect.stringContaining("# Aurora trails") },
            },
            totalCount: 1,
          },
        },
      });
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
