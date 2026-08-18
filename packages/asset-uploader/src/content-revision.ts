import { isContentHash } from "./content-hash";

export const createAssetContentRevision = ({
  storageName,
  updatedAt,
  size,
  contentHash,
}: {
  storageName: string;
  updatedAt: string;
  size: number;
  contentHash?: string | null;
}) =>
  isContentHash(contentHash)
    ? `sha256:${contentHash}`
    : `file:${encodeURIComponent(storageName)}:${updatedAt}:${size}`;
