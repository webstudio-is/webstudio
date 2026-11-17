import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import { Readable } from "node:stream";
import { z } from "zod";
import {
  loadAssetsByProjectWithClient,
  loadAssetFoldersByProjectWithClient,
} from "@webstudio-is/asset-uploader/server";
import { createClient } from "@webstudio-is/postgrest/index.server";
import { createAssetFolderHierarchy } from "@webstudio-is/sdk";
import env from "~/env/env.server";
import { readAssetRestJson } from "~/services/asset-rest.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import {
  getPageCopyStorageScope,
  isCurrentPageCopyGrant,
  pageCopyGrantRequestBytes,
  matchesGrantedAssetRevisions,
  readPageCopyGrant,
} from "~/services/page-copy-grant.server";
import { createAssetClient } from "~/shared/asset-client";

const corsHeaders = {
  ...privateNoStoreResponseHeaders,
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

const input = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("manifest"), grant: z.string().min(1) }),
  z.object({
    kind: z.literal("asset"),
    grant: z.string().min(1),
    assetId: z.string().min(1),
    expectedName: z.string().min(1),
  }),
]);

// Remix resource routes dispatch OPTIONS to the loader.
export const loader = ({ request }: LoaderFunctionArgs) =>
  new Response(null, {
    status: request.method === "OPTIONS" ? 204 : 405,
    headers: corsHeaders,
  });

const contentDependencies = {
  readGrant: readPageCopyGrant,
  isCurrent: isCurrentPageCopyGrant,
  getClient: () => createClient(env.POSTGREST_URL, env.POSTGREST_API_KEY),
  loadAssets: loadAssetsByProjectWithClient,
  loadFolders: loadAssetFoldersByProjectWithClient,
  getStorageScope: getPageCopyStorageScope,
  readFile: (name: string) => createAssetClient().readFile(name),
};

export const createPageCopyContentAction =
  (dependencies = contentDependencies) =>
  async ({ request }: ActionFunctionArgs) => {
    if (request.method !== "POST") {
      return new Response(null, { status: 405, headers: corsHeaders });
    }

    if (
      request.headers.get("content-type")?.split(";", 1)[0] !==
      "application/json"
    ) {
      return new Response(null, { status: 415, headers: corsHeaders });
    }

    try {
      const data = input.parse(
        await readAssetRestJson(request, pageCopyGrantRequestBytes)
      );
      const source = await dependencies.readGrant(data.grant);
      if (source === undefined) {
        return new Response(null, { status: 403, headers: corsHeaders });
      }
      // The signed grant supplies the source project. This route does not use
      // request cookies or any account token to authorize asset access.
      const client = dependencies.getClient();
      if (!(await dependencies.isCurrent(source, client))) {
        return json(
          { code: "PAGE_COPY_SOURCE_STALE" },
          {
            status: 409,
            headers: corsHeaders,
          }
        );
      }
      if (data.kind === "manifest") {
        const [assets, folders] = await Promise.all([
          dependencies.loadAssets(source.projectId, client, source.assetIds),
          dependencies.loadFolders(source.projectId, client),
        ]);
        if (
          assets.length !== source.assetIds.length ||
          !matchesGrantedAssetRevisions(source, assets, folders)
        ) {
          return new Response(null, { status: 409, headers: corsHeaders });
        }
        const hierarchy = createAssetFolderHierarchy(
          new Map(folders.map((folder) => [folder.id, folder]))
        );
        const folderIds = new Set(
          assets.flatMap((asset) =>
            hierarchy.getPath(asset.folderId).map(({ id }) => id)
          )
        );
        return json(
          {
            source: {
              projectId: source.projectId,
              pageId: source.pageId,
              buildId: source.buildId,
              version: source.version,
            },
            storageScope: dependencies.getStorageScope(),
            assets,
            folders: folders.filter(({ id }) => folderIds.has(id)),
          },
          { headers: corsHeaders }
        );
      }
      if (!source.assetIds.includes(data.assetId)) {
        return new Response(null, { status: 403, headers: corsHeaders });
      }
      const [assets, folders] = await Promise.all([
        dependencies.loadAssets(source.projectId, client, [data.assetId]),
        dependencies.loadFolders(source.projectId, client),
      ]);
      const asset = assets[0];
      if (
        asset === undefined ||
        asset.name !== data.expectedName ||
        !matchesGrantedAssetRevisions(source, [asset], folders)
      ) {
        return json(
          { code: "PAGE_COPY_SOURCE_STALE" },
          { status: 409, headers: corsHeaders }
        );
      }
      const content = await dependencies.readFile(asset.name);
      return new Response(
        Readable.toWeb(Readable.from(content.data)) as ReadableStream,
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/octet-stream",
            "Content-Disposition": "attachment",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'",
            "Content-Length": String(content.contentLength ?? asset.size),
          },
        }
      );
    } catch {
      return new Response(null, { status: 400, headers: corsHeaders });
    }
  };

export const action = createPageCopyContentAction();
