import type { Asset } from "@webstudio-is/sdk";

export type AssetContentDescriptor = Pick<
  Asset,
  | "id"
  | "projectId"
  | "name"
  | "type"
  | "format"
  | "size"
  | "createdAt"
  | "updatedAt"
>;

export type AssetContentRead = {
  asset: AssetContentDescriptor;
  data: AsyncIterable<Uint8Array>;
  contentLength?: number;
};

export interface AssetContentRepository {
  readContent(input: {
    assetId: Asset["id"];
    range?: { offset: number; length: number };
  }): Promise<AssetContentRead>;
  updateContent(input: {
    assetId: Asset["id"];
    expectedName: string;
    data: ReadableStream<Uint8Array>;
  }): Promise<AssetContentDescriptor>;
}

export class AssetRevisionConflictError extends Error {}

export class AssetContentAuthorizationError extends Error {}
