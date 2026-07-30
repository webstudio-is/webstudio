import { open, realpath, stat, type FileHandle } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import {
  computeCanonicalAssetRevision,
  createCanonicalAssetFileEntry,
  createContentSourceFile,
  decodeUtf8,
  fullCanonicalAssetMetadataRequirements,
  normalizeAssetFileDocument,
  prepareCanonicalContentMetadata,
  type ContentSource,
} from "@webstudio-is/content-engine/compiler";
import {
  isContentDocumentCandidate,
  prepareContentCompilerEntries,
  requiresStructuredProperties,
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
  left.device === right.device &&
  left.inode === right.inode &&
  left.size === right.size &&
  left.modifiedAt === right.modifiedAt &&
  left.changedAt === right.changedAt;

const resolveContentFilePath = async ({
  assetsDirectoryPath,
  filePath,
}: {
  assetsDirectoryPath: string;
  filePath: string;
}) => {
  const path = await realpath(filePath);
  const relativePath = relative(assetsDirectoryPath, path);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error("Content source file is outside the assets directory");
  }
  return path;
};

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
    const requestedAssetsDirectoryPath = resolve(assetsDirectory);
    const assetsDirectoryPath =
      assets.length === 0
        ? requestedAssetsDirectoryPath
        : await realpath(requestedAssetsDirectoryPath);
    const captured = await Promise.all(
      assets.map(async (asset) => {
        const sourcePath = getLocalAssetPath(asset.name, assetsDirectory);
        const filePath = await resolveContentFilePath({
          assetsDirectoryPath,
          filePath: sourcePath,
        });
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
              ...(asset.description === null
                ? {}
                : { description: asset.description }),
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
        return { entry, sourcePath, filePath, identity };
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
      files: captured.map(({ entry }) => createContentSourceFile(entry)),
      loadEntries: async (
        plan?: ContentCompilationPlan,
        options?: { maximumContentBytes: number }
      ) => {
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
        const requirements =
          plan === undefined
            ? fullCanonicalAssetMetadataRequirements
            : {
                structuredProperties: requiresStructuredProperties(plan),
                excerpt: plan.excerpt,
              };
        const prepared = await Promise.all(
          candidates.map(({ entry, filePath, identity }) =>
            requirements.structuredProperties === false &&
            requirements.excerpt === false
              ? entry
              : prepareCanonicalContentMetadata({
                  base: entry,
                  requirements,
                  readBytes: (maximumBytes) =>
                    readSnapshotFile({
                      path: filePath,
                      identity,
                      maximumBytes,
                    }),
                })
          )
        );
        return await prepareContentCompilerEntries({
          entries: prepared,
          plan,
          loadContent: async (entry) => {
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
              return decodeUtf8(bytes);
            } catch {
              throw new Error(
                `Selected content source file is not valid UTF-8: ${entry.document.path}`
              );
            }
          },
          maximumContentBytes: options?.maximumContentBytes,
        });
      },
      isCurrent: async () => {
        try {
          if (
            assets.length > 0 &&
            (await realpath(requestedAssetsDirectoryPath)) !==
              assetsDirectoryPath
          ) {
            return false;
          }
          return (
            await Promise.all(
              captured.map(
                async ({ sourcePath, filePath, identity }) =>
                  (await realpath(sourcePath)) === filePath &&
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
