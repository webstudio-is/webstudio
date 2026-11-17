import { createServer } from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
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
] as const)(
  "uses copy capabilities and resolves $mode without a blind retry",
  async ({ mode, dryRun, expected, writes }) => {
    let attemptedCommits = 0;
    let observedPageId: string | null = null;
    const hasSourceAsset =
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
      folderId: "asset-folder",
      createdAt: timestamp,
    };
    const sourceFolder = {
      id: "asset-folder",
      projectId: "source",
      name: "Images",
      createdAt: timestamp,
    };
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
          hasSourceAsset && !isSource ? "destination-scope" : "shared-scope",
      };
      const json = (body: unknown, status = 200) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      };
      if (
        url.pathname === "/rest/page-copy/grant" &&
        request.method === "GET"
      ) {
        return mode === "old-source" ? json({}, 404) : json(common);
      }
      if (url.pathname === "/rest/page-copy/grant") {
        return json({ ...common, grant: "source-grant" });
      }
      if (url.pathname === "/rest/page-copy/content") {
        expect(token).toBeUndefined();
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
          folders: hasSourceAsset
            ? [
                {
                  ...sourceFolder,
                  ...(mode === "renamed-folder" ? { name: "New images" } : {}),
                },
              ]
            : [],
        });
      }
      if (url.pathname === "/rest/page-copy/destination") {
        if (request.method === "POST") {
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
      if (url.pathname === "/rest/assets") {
        return json({ assets: [] });
      }
      if (url.pathname === "/rest/assets/folders") {
        if (request.method === "POST") {
          attemptedCommits++;
          return json({ code: "UNEXPECTED_FOLDER_WRITE" }, 500);
        }
        return json({ folders: [] });
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
                assetFolders: hasSourceAsset && isSource ? [sourceFolder] : [],
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
        if (!dryRun) {
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
