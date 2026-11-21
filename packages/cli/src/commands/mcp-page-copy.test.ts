import { createServer } from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { text } from "node:stream/consumers";
import { expect, test } from "vitest";
import { publicApiContractVersion } from "@webstudio-is/protocol";
import { copyMcpPage } from "./mcp-page-copy";

test.each([
  { mode: "dry-run", dryRun: true, expected: { dryRun: true }, writes: 0 },
  {
    mode: "indeterminate",
    dryRun: false,
    expected: { status: "indeterminate", code: "PAGE_COPY_COMMIT_UNKNOWN" },
    writes: 1,
  },
  { mode: "committed", dryRun: false, expected: { version: 5 }, writes: 1 },
  { mode: "old-source", dryRun: true, expected: undefined, writes: 0 },
  { mode: "renamed-asset", dryRun: false, expected: undefined, writes: 0 },
  {
    mode: "changed-description",
    dryRun: false,
    expected: undefined,
    writes: 0,
  },
  { mode: "renamed-folder", dryRun: false, expected: undefined, writes: 0 },
  { mode: "renew-asset", dryRun: false, expected: { version: 5 }, writes: 1 },
  { mode: "renew-relink", dryRun: false, expected: { version: 5 }, writes: 1 },
  {
    mode: "revoked-renewal-relink",
    dryRun: false,
    expected: { status: "failed", code: "PAGE_COPY_RECOPY_REQUIRED" },
    writes: 0,
  },
  {
    mode: "generic-error-relink",
    dryRun: false,
    expected: { status: "failed", code: "PAGE_COPY_REQUEST_FAILED" },
    writes: 0,
  },
  {
    mode: "expired-again-relink",
    dryRun: false,
    expected: { status: "failed", code: "PAGE_COPY_GRANT_EXPIRED" },
    writes: 0,
  },
  {
    mode: "renew-manifest",
    dryRun: false,
    expected: { version: 5 },
    writes: 1,
  },
  {
    mode: "revoked-renewal",
    dryRun: false,
    expected: { status: "failed", code: "PAGE_COPY_RECOPY_REQUIRED" },
    writes: 0,
  },
  {
    mode: "changed-renewal-scope",
    dryRun: false,
    expected: { status: "failed", code: "PAGE_COPY_SOURCE_STALE" },
    writes: 0,
  },
  {
    mode: "unrelated-forbidden",
    dryRun: false,
    expected: { status: "failed", code: "PAGE_COPY_REQUEST_FAILED" },
    writes: 0,
  },
] as const)(
  "uses copy capabilities and resolves $mode without a blind retry",
  async ({ mode, dryRun, expected, writes }) => {
    let attemptedCommits = 0;
    let observedPageId: string | null = null;
    const expiryPhase =
      mode === "renew-asset"
        ? "asset"
        : mode === "renew-manifest" ||
            mode === "revoked-renewal" ||
            mode === "changed-renewal-scope"
          ? "manifest"
          : undefined;
    const transfersAsset =
      expiryPhase !== undefined || mode === "unrelated-forbidden";
    const relinksAsset = mode.endsWith("-relink");
    const hasSourceAsset =
      transfersAsset ||
      relinksAsset ||
      mode === "renamed-asset" ||
      mode === "changed-description" ||
      mode === "renamed-folder";
    const timestamp = "2026-11-17T00:00:00.000Z";
    const sourceAsset = {
      id: "source-asset",
      projectId: "source",
      name: "image_storage.png",
      type: "image",
      format: "png",
      size: 10,
      meta: { width: 10, height: 10 },
      filename: "image",
      description: null,
      folderId: transfersAsset ? undefined : "asset-folder",
      createdAt: timestamp,
    };
    const sourceFolder = {
      id: "asset-folder",
      projectId: "source",
      name: "Images",
      createdAt: timestamp,
    };
    let stagedAsset: typeof sourceAsset | undefined;
    let reserved: string | undefined;
    let attemptedRenewals = 0;
    const sourceReads: string[] = [];
    const relinkGrants: string[] = [];
    let createdFolder: typeof sourceFolder | undefined;
    const server = createServer(async (request, response) => {
      const url = new URL(request.url ?? "", "http://localhost");
      const token = request.headers["x-auth-token"];
      const isSource = token === "source-token";
      const projectId = isSource ? "source" : "destination";
      const pageId = isSource ? "source-home" : "target-home";
      const common = {
        buildId: `${projectId}-build`,
        version: 4,
        contractVersion: publicApiContractVersion,
        storageScope:
          hasSourceAsset && !isSource && !relinksAsset
            ? "destination-scope"
            : "shared-scope",
      };
      const json = (body: unknown, status = 200) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      };
      const readBody = async () => JSON.parse(await text(request));
      if (
        url.pathname === "/rest/page-copy/grant" &&
        request.method === "GET"
      ) {
        return mode === "old-source" ? json({}, 404) : json(common);
      }
      if (url.pathname === "/rest/page-copy/grant") {
        const body = await readBody();
        if (body.renewGrant !== undefined) {
          attemptedRenewals++;
          expect(token).toBe("source-token");
          expect(body).toEqual({
            projectId: "source",
            pageId: "source-home",
            renewGrant: "source-grant",
          });
          if (mode === "revoked-renewal" || mode === "revoked-renewal-relink") {
            return json({ code: "PAGE_COPY_RECOPY_REQUIRED" }, 409);
          }
          return json({
            ...common,
            grant: "fresh-grant",
            storageScope:
              mode === "changed-renewal-scope"
                ? "other-scope"
                : common.storageScope,
          });
        }
        return json({ ...common, grant: "source-grant" });
      }
      if (url.pathname === "/rest/page-copy/content") {
        expect(token).toBeUndefined();
        const { kind, grant, assetId } = await readBody();
        sourceReads.push(`${kind}:${grant}`);
        if (
          grant === "source-grant" &&
          kind === expiryPhase &&
          (kind === "asset" || stagedAsset !== undefined)
        ) {
          return json({ code: "PAGE_COPY_GRANT_EXPIRED" }, 403);
        }
        if (kind === "asset") {
          expect(assetId).toBe(sourceAsset.id);
          if (mode === "unrelated-forbidden") {
            return json({}, 403);
          }
          response.writeHead(200, {
            "content-type": "application/octet-stream",
          });
          response.end(Buffer.alloc(sourceAsset.size));
          return;
        }
        return json({
          source: {
            projectId: "source",
            pageId: "source-home",
            buildId: "source-build",
            version: 4,
          },
          storageScope: "shared-scope",
          assets: hasSourceAsset
            ? [
                {
                  ...sourceAsset,
                  ...(mode === "renamed-asset"
                    ? { filename: "new-image" }
                    : {}),
                  ...(mode === "changed-description"
                    ? { description: "Updated" }
                    : {}),
                },
              ]
            : [],
          folders:
            hasSourceAsset && !transfersAsset
              ? [
                  {
                    ...sourceFolder,
                    ...(mode === "renamed-folder"
                      ? { name: "New images" }
                      : {}),
                  },
                ]
              : [],
        });
      }
      if (url.pathname === "/rest/page-copy/destination") {
        if (request.method === "POST") {
          if (transfersAsset || relinksAsset) {
            const body = await readBody();
            if (body.kind === "relink") {
              expect(token).toBe("destination-token");
              expect(createdFolder).toBeDefined();
              expect(body.assets).toEqual([
                {
                  sourceId: sourceAsset.id,
                  targetId: sourceAsset.id,
                  expectedName: sourceAsset.name,
                  folderId: createdFolder!.id,
                },
              ]);
              relinkGrants.push(body.grant);
              if (
                body.grant === "source-grant" ||
                mode === "expired-again-relink"
              ) {
                return json({ code: "PAGE_COPY_GRANT_EXPIRED" }, 403);
              }
              expect(body.grant).toBe("fresh-grant");
              if (mode === "generic-error-relink") {
                return json({}, 500);
              }
              expect(stagedAsset).toBeUndefined();
              stagedAsset = {
                ...sourceAsset,
                projectId: "destination",
                folderId: createdFolder!.id,
              };
              return json({ created: [stagedAsset], reused: [] });
            }
            if (body.kind === "reserve") {
              expect(reserved).toBeUndefined();
              reserved = body.assetId;
              return json({
                assetId: reserved,
                name: "uploaded.png",
                deduplicated: false,
              });
            }
            expect(body.kind).toBe("commit");
            expect(body.transfer.item.page.meta.socialImageAssetId).toBe(
              stagedAsset?.id
            );
            attemptedCommits++;
            return json({ version: 5 });
          }
          attemptedCommits++;
          // The request body is deliberately discarded before losing the reply.
          for await (const _ of request) {
            continue;
          }
          response.destroy();
          return;
        }
        observedPageId = url.searchParams.get("pageId");
        return observedPageId === null
          ? json(common)
          : json({ ...common, version: 5, pageExists: mode === "committed" });
      }
      if (url.pathname === "/rest/assets/uploads/uploaded.png") {
        expect(token).toBe("destination-token");
        expect(reserved).toBeDefined();
        expect(stagedAsset).toBeUndefined();
        for await (const _ of request) {
          continue;
        }
        stagedAsset = {
          ...sourceAsset,
          id: reserved!,
          projectId: "destination",
          name: "uploaded.png",
        };
        return json({ uploadedAssets: [stagedAsset] });
      }
      if (url.pathname === "/rest/assets") {
        return json({ assets: stagedAsset === undefined ? [] : [stagedAsset] });
      }
      if (url.pathname === "/rest/assets/folders") {
        if (request.method === "POST") {
          if (relinksAsset) {
            expect(createdFolder).toBeUndefined();
            expect(token).toBe("destination-token");
            const body = await readBody();
            expect(body.name).toBe(sourceFolder.name);
            createdFolder = {
              ...sourceFolder,
              id: "destination-folder",
              projectId: "destination",
            };
            return json({ folder: createdFolder });
          }
          attemptedCommits++;
          return json({ code: "UNEXPECTED_FOLDER_WRITE" }, 500);
        }
        return json({
          folders: createdFolder === undefined ? [] : [createdFolder],
        });
      }
      if (url.pathname === "/trpc/api.projects.permissions") {
        return json([
          {
            result: {
              data: {
                apiContract: {
                  version: publicApiContractVersion,
                  operationIds: [],
                },
              },
            },
          },
        ]);
      }
      if (url.pathname === "/trpc/api.build.get") {
        return json([
          {
            result: {
              data: {
                version: 4,
                projectId,
                buildId: common.buildId,
                homePageId: pageId,
                rootFolderId: "root-folder",
                pages: [
                  {
                    id: pageId,
                    name: "Home",
                    path: "",
                    rootInstanceId: "body",
                    title: '""',
                    meta:
                      hasSourceAsset && isSource
                        ? { socialImageAssetId: sourceAsset.id }
                        : {},
                  },
                ],
                folders: [
                  {
                    id: "root-folder",
                    name: "Pages",
                    slug: "",
                    children: [pageId],
                  },
                ],
                instances: [
                  {
                    id: "body",
                    component: "Body",
                    type: "instance",
                    children: [],
                  },
                ],
                props: [],
                breakpoints: [],
                styles: [],
                styleSources: [],
                styleSourceSelections: [],
                dataSources: [],
                resources: [],
                assets: hasSourceAsset && isSource ? [sourceAsset] : [],
                assetFolders:
                  hasSourceAsset && isSource && !transfersAsset
                    ? [sourceFolder]
                    : [],
              },
            },
          },
        ]);
      }
      return json({ path: url.pathname }, 404);
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const operation = copyMcpPage({
        args: { sourceProjectId: "source", sourcePage: "/" },
        dryRun,
        source: { origin, projectId: "source", authToken: "source-token" },
        destination: {
          origin,
          projectId: "destination",
          authToken: "destination-token",
        },
      });
      if (expected === undefined) {
        await expect(operation).rejects.toMatchObject({
          code: hasSourceAsset
            ? "PAGE_COPY_SOURCE_STALE"
            : "PAGE_COPY_SOURCE_UNSUPPORTED",
        });
      } else {
        const result = await operation;
        expect(result).toMatchObject(expected);
        if (transfersAsset) {
          expect(attemptedRenewals).toBe(expiryPhase === undefined ? 0 : 1);
          if (mode === "renew-asset") {
            expect(sourceReads).toEqual([
              "manifest:source-grant",
              "asset:source-grant",
              "asset:fresh-grant",
              "manifest:fresh-grant",
            ]);
          }
          if (mode === "renew-manifest") {
            expect(sourceReads).toEqual([
              "manifest:source-grant",
              "asset:source-grant",
              "manifest:source-grant",
              "manifest:fresh-grant",
            ]);
          }
          if (mode === "revoked-renewal" || mode === "changed-renewal-scope") {
            expect(result).toMatchObject({
              artifacts: { assetIds: [stagedAsset?.id] },
            });
            expect(sourceReads.at(-1)).toBe("manifest:source-grant");
          }
        } else if (relinksAsset) {
          expect(attemptedRenewals).toBe(1);
          expect(relinkGrants).toEqual(
            mode === "revoked-renewal-relink"
              ? ["source-grant"]
              : ["source-grant", "fresh-grant"]
          );
          expect(sourceReads).toEqual(
            mode === "renew-relink"
              ? ["manifest:source-grant", "manifest:fresh-grant"]
              : ["manifest:source-grant"]
          );
          if (mode !== "renew-relink") {
            expect(result).toMatchObject({
              artifacts: {
                folderIds: [createdFolder?.id],
                assetIds: [],
                unconfirmedAssetIds:
                  mode === "generic-error-relink" ? [sourceAsset.id] : [],
              },
            });
          }
        } else if (!dryRun) {
          expect(result).toHaveProperty("pageId", observedPageId);
          expect(observedPageId).not.toBeNull();
        }
      }
      expect(attemptedCommits).toBe(writes);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
);
