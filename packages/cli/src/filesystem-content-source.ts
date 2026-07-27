import { open, stat, type FileHandle } from "node:fs/promises";
import {
  computeCanonicalAssetRevision,
  createCanonicalAssetFileEntry,
  decodeUtf8,
  normalizeAssetFileDocument,
  prepareCanonicalContentMetadata,
  type ContentSource,
} from "@webstudio-is/content-engine/compiler";
import {
  contentEngineLimits,
  isContentDocumentCandidate,
  selectAssetProperties,
  selectContentHydrationCandidates,
  type ContentCompilationPlan,
} from "@webstudio-is/content-engine";
import {
  createAssetFolderHierarchy,
  formatAssetName,
  getFileNameParts,
  getMimeTypeByFilename,
  type Asset,
  type AssetFolders,
} from "@webstudio-is/sdk";
import { getLocalAssetPath, LOCAL_ASSETS_DIR } from "./asset-files";

type FileIdentity = {
  device: bigint;
  inode: bigint;
  size: bigint;
  modifiedAt: bigint;
  changedAt: bigint;
};

const toFileIdentity = (metadata: {
  dev: bigint;
  ino: bigint;
  size: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
}): FileIdentity => ({
  device: metadata.dev,
  inode: metadata.ino,
  size: metadata.size,
  modifiedAt: metadata.mtimeNs,
  changedAt: metadata.ctimeNs,
});

const getFileIdentity = async (path: string): Promise<FileIdentity> => {
  const metadata = await stat(path, { bigint: true });
  if (metadata.isFile() === false) {
    throw new Error(`Content source entry is not a file: ${path}`);
  }
  return toFileIdentity(metadata);
};

const serializeFileIdentity = (identity: FileIdentity) =>
  [
    identity.device,
    identity.inode,
    identity.size,
    identity.modifiedAt,
    identity.changedAt,
  ].join(":");

const isSameFileIdentity = (left: FileIdentity, right: FileIdentity) =>
  serializeFileIdentity(left) === serializeFileIdentity(right);

const readFromHandle = async ({
  handle,
  maximumBytes,
}: {
  handle: FileHandle;
  maximumBytes: number;
}) => {
  const bytes = new Uint8Array(maximumBytes);
  let offset = 0;
  while (offset < maximumBytes) {
    const { bytesRead } = await handle.read(
      bytes,
      offset,
      maximumBytes - offset,
      offset
    );
    if (bytesRead === 0) {
      break;
    }
    offset += bytesRead;
  }
  return bytes.subarray(0, offset);
};

const readSnapshotFile = async ({
  path,
  identity,
  maximumBytes,
}: {
  path: string;
  identity: FileIdentity;
  maximumBytes: number;
}) => {
  const handle = await open(path, "r");
  try {
    const before = await handle.stat({ bigint: true });
    const beforeIdentity = toFileIdentity(before);
    if (isSameFileIdentity(identity, beforeIdentity) === false) {
      throw new Error("Content source file changed before it could be read");
    }
    const bytes = await readFromHandle({ handle, maximumBytes });
    const after = await handle.stat({ bigint: true });
    const afterIdentity = toFileIdentity(after);
    if (isSameFileIdentity(identity, afterIdentity) === false) {
      throw new Error("Content source file changed while it was being read");
    }
    return bytes;
  } finally {
    await handle.close();
  }
};

export const createFileSystemContentSource = ({
  projectId,
  assets,
  folders,
  assetsDirectory = LOCAL_ASSETS_DIR,
}: {
  projectId: string;
  assets: readonly Asset[];
  folders: AssetFolders;
  assetsDirectory?: string;
}): ContentSource => ({
  openSnapshot: async () => {
    const hierarchy = createAssetFolderHierarchy(folders);
    const captured = await Promise.all(
      assets.map(async (asset) => {
        const filePath = getLocalAssetPath(asset.name, assetsDirectory);
        const identity = await getFileIdentity(filePath);
        const revision = `fs:${serializeFileIdentity(identity)}`;
        const name = formatAssetName(asset);
        const extension = getFileNameParts(asset.name).extension.toLowerCase();
        const folderId = hierarchy.resolveFolderId(asset.folderId);
        const folderNames = hierarchy
          .getPath(folderId)
          .map((folder) => folder.name);
        const entry = createCanonicalAssetFileEntry({
          projectId,
          metadataRequirements: {
            structuredProperties: false,
            excerpt: false,
          },
          document: normalizeAssetFileDocument({
            asset: {
              id: asset.id,
              name,
              ...(extension === "" ? {} : { extension }),
              ...(folderId === undefined ? {} : { folderId, folderNames }),
              mimeType: getMimeTypeByFilename(asset.name),
              size: Number(identity.size),
              createdAt: asset.createdAt,
              revision,
              contentRef: asset.name,
            },
            properties: {},
          }),
        });
        return { entry, filePath, identity };
      })
    );
    const revision = await computeCanonicalAssetRevision(
      captured.map(({ entry }) => entry)
    );
    const capturedById = new Map(
      captured.map((item) => [item.entry.assetId, item])
    );

    return {
      revision,
      files: captured.map(({ entry: { document } }) => ({
        id: document._id,
        path: document.path,
        contentType: document.mimeType,
        contentRef: document.contentRef,
        revision: document.revision,
        size: document.size,
        createdAt: document.createdAt,
      })),
      loadEntries: async (plan?: ContentCompilationPlan) => {
        const candidates =
          plan === undefined
            ? captured
            : captured.filter(({ entry: { document } }) =>
                isContentDocumentCandidate({
                  document,
                  plan,
                  available: "base",
                })
              );
        const prepared = await Promise.all(
          candidates.map(async ({ entry, filePath, identity }) =>
            plan === undefined ||
            (plan.structuredProperties === false && plan.excerpt === false)
              ? entry
              : await prepareCanonicalContentMetadata({
                  base: entry,
                  requirements: {
                    structuredProperties: plan.structuredProperties,
                    excerpt: plan.excerpt,
                  },
                  readBytes: (maximumBytes) =>
                    readSnapshotFile({
                      path: filePath,
                      identity,
                      maximumBytes,
                    }),
                })
          )
        );
        const projected =
          plan === undefined
            ? prepared
            : prepared.map((entry) => {
                const { excerpt, ...document } = entry.document;
                return {
                  ...entry,
                  document: {
                    ...document,
                    properties:
                      plan.structuredPropertyPaths === "all"
                        ? entry.document.properties
                        : selectAssetProperties({
                            properties: entry.document.properties,
                            fields: plan.structuredPropertyPaths,
                          }),
                    ...(plan.excerpt && excerpt !== undefined
                      ? { excerpt }
                      : {}),
                  },
                };
              });
        const hydrationIds =
          plan === undefined
            ? new Set<string>()
            : selectContentHydrationCandidates({
                documents: projected.map(({ document }) => document),
                plan,
              });
        return await Promise.all(
          projected
            .filter(
              ({ document }) =>
                plan === undefined ||
                isContentDocumentCandidate({
                  document,
                  plan,
                  available: "all",
                })
            )
            .map(async (entry) => {
              if (
                hydrationIds.has(entry.assetId) === false ||
                entry.document.size > contentEngineLimits.hydratedFileBytes
              ) {
                return entry;
              }
              const capturedFile = capturedById.get(entry.assetId);
              if (capturedFile === undefined) {
                throw new Error("Content source snapshot is incomplete");
              }
              const bytes = await readSnapshotFile({
                path: capturedFile.filePath,
                identity: capturedFile.identity,
                maximumBytes: entry.document.size,
              });
              if (bytes.byteLength !== entry.document.size) {
                throw new Error("Content source file size changed");
              }
              try {
                return { ...entry, content: decodeUtf8(bytes) };
              } catch {
                return entry;
              }
            })
        );
      },
      isCurrent: async () => {
        try {
          return (
            await Promise.all(
              captured.map(async ({ filePath, identity }) =>
                isSameFileIdentity(identity, await getFileIdentity(filePath))
              )
            )
          ).every(Boolean);
        } catch {
          return false;
        }
      },
    };
  },
});
