// Serves deterministic in-memory Webstudio project fixtures through the real
// local API boundary used by high-impact CLI and MCP evaluations.
import type { Server } from "node:http";
import { createAssetContentSession } from "@webstudio-is/content-engine/asset-content-session";
import { createHttpAssetContentRepository } from "@webstudio-is/content-engine/asset-content-repository";
import { createProjectAssetContentTransport } from "@webstudio-is/http-client";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import {
  executeAssetQuery,
  getAssetQueryWhereMetrics,
  parseMarkdownDocumentSource,
  validateAssetQuery,
  type AssetQueryInput,
  type ContentDatabaseDocument,
} from "@webstudio-is/content-engine";
import { fontFormat, fontMeta } from "@webstudio-is/fonts";
import { getFileNameParts, type Asset } from "@webstudio-is/sdk";
import {
  assetsUploadsApiUrl,
  getAssetContentApiUrl,
} from "@webstudio-is/sdk/runtime";
import {
  assetContentDescriptorHeader,
  serializeAssetContentDescriptor,
} from "@webstudio-is/protocol/asset-resource-api";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import React from "react";
import type { BuilderState } from "@webstudio-is/project-build/state";
import {
  createBuilderStateFreshness,
  createBuilderBuildDataSnapshotFromState,
} from "@webstudio-is/project-build/state";
import type { BuilderRuntimeMutation } from "@webstudio-is/project-build/runtime";
import type { BuilderPatchTransaction } from "@webstudio-is/project-build/contracts";
import type { HighImpactFixture, EvaluationProject } from "./fixtures";
import type { EvaluationToolCall } from "./validate";
import {
  createRuntimeFixtureBuildSnapshot,
  publicApiCommandByOperationId,
  readRuntimeFixtureRequestBody,
  runtimeFixturePermissions,
  startRuntimeFixtureApi,
} from "../../scripts/runtime-fixture-api";

const projectId = "high-impact-evaluation-project";
const buildId = "high-impact-evaluation-build";
const initialVersion = 1;

const decodeAssetDescriptionHeader = (value: unknown, encoding: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  if (encoding === undefined) {
    return value;
  }
  if (encoding !== "base64url") {
    throw new Error("Invalid asset description encoding.");
  }
  return Buffer.from(value, "base64url").toString("utf8");
};

const createPersistedPages = (project: EvaluationProject) => ({
  meta: { siteName: "High-impact evaluation", contactEmail: "" },
  compiler: { atomicStyles: true },
  redirects: [],
  homePageId: "home",
  rootFolderId: "root-folder",
  pages: project.pages.map((page) => ({
    ...page,
    title: page.title ?? page.name,
    meta: page.meta ?? {},
  })),
  folders: [
    {
      id: "root-folder",
      name: "Root",
      slug: "",
      children: project.pages.map((page) => page.id),
    },
  ],
});

const stateToProject = (state: BuilderState): EvaluationProject => ({
  assets: Array.from(state.assets?.values() ?? []),
  assetFolders: Array.from(state.assetFolders?.values() ?? []),
  pages: Array.from(state.pages?.pages.values() ?? []).map((page) => ({
    id: page.id,
    name: page.name,
    path: page.path,
    rootInstanceId: page.rootInstanceId,
    title: page.title,
    meta: page.meta,
  })),
  instances: Array.from(
    state.instances?.values() ?? []
  ) as EvaluationProject["instances"],
  props: Array.from(state.props?.values() ?? []) as EvaluationProject["props"],
  dataSources: Array.from(state.dataSources?.values() ?? []) as Array<
    Record<string, unknown>
  >,
  resources: Array.from(state.resources?.values() ?? []) as Array<
    Record<string, unknown>
  >,
  breakpoints: Array.from(state.breakpoints?.values() ?? []),
  styleSources: Array.from(state.styleSources?.values() ?? []),
  styleSourceSelections: Array.from(
    state.styleSourceSelections?.values() ?? []
  ),
  styles: Array.from(
    state.styles?.values() ?? []
  ) as EvaluationProject["styles"],
});

export type HighImpactFixtureApi = {
  server: Server;
  origin: string;
  shareLink: string;
  getProject: () => EvaluationProject;
  getAssetSource: (assetId: string) => string | undefined;
  getToolCalls: () => EvaluationToolCall[];
  close: () => Promise<void>;
};

export const startHighImpactFixtureApi = async (
  fixture: HighImpactFixture
): Promise<HighImpactFixtureApi> => {
  Object.assign(globalThis, { React });
  const [stateAdapters, runtime, projectSession, restorePoints] =
    await Promise.all([
      import("@webstudio-is/project-build/state"),
      import("@webstudio-is/project-build/runtime"),
      import("../../src/project-session"),
      import("@webstudio-is/project-build/project-session"),
    ]);
  const { createBuilderStateFromBuildData, applyBuilderPatchTransactions } =
    stateAdapters;
  const { executeBuilderRuntimeOperation, createContentBlockApplication } =
    runtime;
  let contentBlockApplication: ReturnType<typeof createContentBlockApplication>;
  const { createLocalProjectBundleFromSessionSnapshot } = projectSession;
  const { hydrateRestorePointTransaction } = restorePoints;
  const persistedPages = createPersistedPages(fixture.project);
  const build = {
    id: buildId,
    projectId,
    version: initialVersion,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    pages: migratePages(persistedPages),
    instances: fixture.project.instances.map((instance) => ({
      type: "instance" as const,
      ...instance,
    })),
    props: fixture.project.props,
    dataSources: fixture.project.dataSources,
    resources: fixture.project.resources,
    breakpoints: fixture.project.breakpoints,
    styleSources: fixture.project.styleSources,
    styleSourceSelections: fixture.project.styleSourceSelections,
    styles: fixture.project.styles,
    assets: fixture.project.assets,
    assetFolders: fixture.project.assetFolders,
    projectSettings: { meta: {}, compiler: {} },
  };
  let state = createBuilderStateFromBuildData(build as never);
  let version = initialVersion;
  let generatedId = 0;
  const calls: EvaluationToolCall[] = [];
  const uploadedFileContents = new Map<string, Uint8Array>(
    Object.entries(fixture.assetSources ?? {}).map(([id, source]) => [
      id,
      new TextEncoder().encode(source),
    ])
  );
  let origin = "";
  const validateFixtureAssetQuery = (query: unknown) => {
    const validation = validateAssetQuery({ query });
    if (validation.success === false) {
      throw Object.assign(new Error("Invalid fixture asset query."), {
        code: "INVALID_INPUT",
        issues: validation.issues,
      });
    }
    return validation;
  };
  const loadFixtureDocuments = async () => {
    const documents: ContentDatabaseDocument[] = [];
    for (const asset of state.assets?.values() ?? []) {
      if (asset.type !== "file" || asset.format !== "md") {
        continue;
      }
      const content = uploadedFileContents.get(asset.id);
      if (content === undefined) {
        continue;
      }
      const document = await parseMarkdownDocumentSource({ source: content });
      documents.push({
        _id: asset.id,
        _type: "asset.file",
        name: asset.name,
        path: asset.name,
        key: asset.id,
        folderId: asset.folderId,
        extension: asset.format,
        mimeType: "text/markdown",
        size: asset.size,
        createdAt: asset.createdAt,
        revision: `fixture-${asset.id}`,
        contentRef: asset.id,
        properties: structuredClone(
          document.frontmatter
        ) as ContentDatabaseDocument["properties"],
      });
    }
    return documents;
  };
  const readFixtureContent = async (contentRef: string) => {
    const content = uploadedFileContents.get(contentRef);
    if (content === undefined) {
      throw new Error(`Fixture content not found: ${contentRef}`);
    }
    return {
      data: (async function* () {
        yield content;
      })(),
      contentLength: content.byteLength,
    };
  };
  const runFixtureAssetQuery = async <Result>({
    name,
    input,
    execute,
  }: {
    name: "validate-asset-query" | "preview-asset-query";
    input: Record<string, unknown>;
    execute: () => Promise<Result> | Result;
  }) => {
    const call: EvaluationToolCall = { name, arguments: input };
    calls.push(call);
    try {
      return await execute();
    } catch (error) {
      call.isError = true;
      throw error;
    }
  };
  const fixtureApi = await startRuntimeFixtureApi(
    async ({ request, response, pathname, operationPath, readInput }) => {
      let data: unknown;
      const contentAsset = Array.from(state.assets?.values() ?? []).find(
        (asset) => pathname === getAssetContentApiUrl(asset.id)
      );
      if (contentAsset !== undefined) {
        const url = new URL(request.url ?? "", origin);
        if (url.searchParams.get("projectId") !== projectId) {
          response.writeHead(403);
          response.end();
          return;
        }
        if (request.method === "GET") {
          const bytes = uploadedFileContents.get(contentAsset.id);
          if (bytes === undefined) {
            response.writeHead(404);
            response.end();
            return;
          }
          response.writeHead(200, {
            "content-type": "application/octet-stream",
            "content-length": bytes.byteLength,
            [assetContentDescriptorHeader]:
              serializeAssetContentDescriptor(contentAsset),
          });
          response.end(bytes);
          return;
        }
        if (request.method === "PUT") {
          if (url.searchParams.get("expectedName") !== contentAsset.name) {
            response.writeHead(409, { "content-type": "application/json" });
            response.end(JSON.stringify({ message: "Asset revision changed" }));
            return;
          }
          const bytes = await readRuntimeFixtureRequestBody(request);
          const asset = {
            ...contentAsset,
            name: `revision-${generatedId++}.mdx`,
            size: bytes.byteLength,
          };
          uploadedFileContents.set(asset.id, bytes);
          state = {
            ...state,
            assets: new Map(state.assets).set(asset.id, asset),
          };
          version += 1;
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({ asset }));
          return;
        }
        response.writeHead(405);
        response.end();
        return;
      }
      if (
        request.method === "POST" &&
        pathname.startsWith(`${assetsUploadsApiUrl}/`)
      ) {
        const url = new URL(request.url ?? "", origin);
        const name = decodeURIComponent(
          pathname.slice(`${assetsUploadsApiUrl}/`.length)
        );
        const body = await readRuntimeFixtureRequestBody(request);
        const type = url.searchParams.get("type");
        const formatValue = url.searchParams.get("format");
        if (
          url.searchParams.get("projectId") !== projectId ||
          (type !== "font" && type !== "file") ||
          formatValue === null ||
          formatValue.length === 0 ||
          body.byteLength === 0
        ) {
          throw new Error("Invalid asset upload request.");
        }
        const description = decodeAssetDescriptionHeader(
          request.headers["x-webstudio-asset-description"],
          request.headers["x-webstudio-asset-description-encoding"]
        );
        const folderId = url.searchParams.get("folderId") ?? undefined;
        const assetBase = {
          id: `evaluation-asset-${generatedId++}`,
          projectId,
          name,
          filename: getFileNameParts(name).basename,
          description,
          size: body.byteLength,
          ...(folderId === undefined ? {} : { folderId }),
          createdAt: "2026-01-01T00:00:00.000Z",
        };
        const asset: Asset =
          type === "font"
            ? {
                ...assetBase,
                type,
                format: fontFormat.parse(formatValue),
                meta: fontMeta.parse(
                  JSON.parse(
                    String(request.headers["x-webstudio-asset-meta"] ?? "{}")
                  )
                ),
              }
            : { ...assetBase, type, format: formatValue, meta: {} };
        uploadedFileContents.set(asset.id, body);
        calls.push({
          name: "upload-asset",
          arguments: {
            name,
            type,
            format: asset.format,
            meta: asset.meta,
            folderId,
          },
        });
        state = {
          ...state,
          assets: new Map(state.assets).set(asset.id, asset),
        };
        version += 1;
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({ uploadedAssets: [asset], deduplicated: false })
        );
        return;
      }
      if (
        operationPath === "build.loadProjectBundleByProjectId" ||
        operationPath === "build.loadData"
      ) {
        const bundle = createLocalProjectBundleFromSessionSnapshot(
          {
            projectId,
            buildId,
            version,
            state,
            freshness: createBuilderStateFreshness({ state, version }),
            compatibilityVersion: "high-impact-fixture-v1",
            compatibility: {
              sessionVersion: "high-impact-fixture-v1",
              runtimeContractVersion: "high-impact-fixture-v1",
              projectSchemaVersion: "high-impact-fixture-v1",
            },
          },
          { origin }
        );
        data =
          operationPath === "build.loadData"
            ? {
                ...bundle.build,
                ...createBuilderBuildDataSnapshotFromState(state),
                pages: bundle.build.pages,
                assets: bundle.assets,
                assetFolders: bundle.assetFolders,
                project: {
                  id: projectId,
                  title: "High-impact evaluation",
                  domain: "high-impact-evaluation",
                },
              }
            : bundle;
      } else if (operationPath === "projects.get") {
        data = {
          id: projectId,
          name: "High-impact evaluation",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          buildId,
          version,
          homePageId: "home",
          features: {},
        };
      } else if (
        operationPath === "build.patch" ||
        operationPath === "build.restorePoint"
      ) {
        const input = (await readInput()) as {
          transactions?: BuilderPatchTransaction[];
        };
        const transactions = input.transactions ?? [];
        state = applyBuilderPatchTransactions(
          state,
          operationPath === "build.restorePoint"
            ? transactions.map(hydrateRestorePointTransaction)
            : transactions
        ).state;
        version += 1;
        data = { version };
      } else if (operationPath === "build.get") {
        data = createRuntimeFixtureBuildSnapshot({
          state,
          projectId,
          buildId,
          version,
        });
      } else if (operationPath === "assetQueries.validate") {
        const input = (await readInput()) as Record<string, unknown>;
        data = await runFixtureAssetQuery({
          name: "validate-asset-query",
          input,
          execute: () => {
            const validation = validateFixtureAssetQuery(input.query);
            return {
              valid: true as const,
              referencedFieldPaths: validation.referencedFieldPaths,
              filterCount: getAssetQueryWhereMetrics(validation.query.where)
                .filters,
              sortCount: validation.query.sort.length,
              warnings: validation.warnings,
              issues: validation.issues,
            };
          },
        });
      } else if (operationPath === "assetQueries.preview") {
        const input = (await readInput()) as Record<string, unknown>;
        data = await runFixtureAssetQuery({
          name: "preview-asset-query",
          input,
          execute: async () => {
            const validation = validateFixtureAssetQuery(input.query);
            const documents = await loadFixtureDocuments();
            const result = await executeAssetQuery({
              query: validation.query as AssetQueryInput,
              documents,
              read: readFixtureContent,
            });
            const usedBytes = Buffer.byteLength(JSON.stringify(documents));
            const diagnostics = {
              usedBytes,
              maxBytes: 512_000,
              unboundedBytes: usedBytes,
              includedDocumentCount: documents.length,
              omittedDocumentCount: 0,
              truncated: false,
            };
            return {
              data: result,
              __diagnostics__: {
                scope: "query-preview" as const,
                query: diagnostics,
                database: diagnostics,
              },
            };
          },
        });
      } else if (
        operationPath === "projects.permissions" ||
        operationPath === ""
      ) {
        data = runtimeFixturePermissions;
      } else {
        const input = await readInput();
        const call: EvaluationToolCall = {
          name:
            publicApiCommandByOperationId.get(operationPath) ?? operationPath,
          arguments:
            typeof input === "object" && input !== null
              ? (input as Record<string, unknown>)
              : undefined,
        };
        calls.push(call);
        try {
          const result = await executeBuilderRuntimeOperation({
            id: operationPath,
            state,
            input,
            context: {
              createId: () => `evaluation-${generatedId++}`,
              projectId,
              projectVersion: version,
              contentBlockApplication,
            },
          });
          if (
            typeof result === "object" &&
            result !== null &&
            "kind" in result &&
            (result as BuilderRuntimeMutation).kind === "mutation"
          ) {
            const mutation = result as BuilderRuntimeMutation;
            state = applyBuilderPatchTransactions(state, [
              {
                id: `evaluation-transaction-${generatedId++}`,
                payload: mutation.payload,
              },
            ]).state;
            version += 1;
            data = mutation.result;
          } else {
            data = result;
          }
        } catch (error) {
          call.isError = true;
          throw error;
        }
      }
      return data;
    }
  );
  const { server } = fixtureApi;
  origin = fixtureApi.origin;
  const contentSession = createAssetContentSession({
    repository: createHttpAssetContentRepository({
      projectId,
      ...createProjectAssetContentTransport({ projectId, origin }),
    }),
    authorize: () => true,
  });
  contentBlockApplication = createContentBlockApplication({
    projectId,
    session: contentSession,
    metas: componentMetas,
  });
  return {
    server,
    origin,
    shareLink: `${origin}/builder/${projectId}?authToken=fixture-only-not-persisted`,
    getProject: () => stateToProject(state),
    getAssetSource: (assetId) => {
      const bytes = uploadedFileContents.get(assetId);
      return bytes === undefined ? undefined : new TextDecoder().decode(bytes);
    },
    getToolCalls: () => structuredClone(calls),
    close: async () => {
      contentSession.dispose();
      await fixtureApi.close();
    },
  };
};
