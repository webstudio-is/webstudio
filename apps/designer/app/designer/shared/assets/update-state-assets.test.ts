import type { Asset } from "@webstudio-is/asset-uploader";
import {
  UploadedClientAsset,
  UploadingClientAsset,
  DeletingClientAsset,
  ClientAsset,
} from "./types";
import { updateStateAssets } from "./update-state-assets";

const getAssetId = (clientAsset: ClientAsset): string =>
  clientAsset.status === "uploading"
    ? clientAsset.preview.id
    : clientAsset.asset.id;

const createServerAsset = (id: string, name?: string): Asset => ({
  id,

  name: name ?? "test",
  location: "FS",
  projectId: "id",
  size: 2135,
  format: "png",
  createdAt: "",
  description: "",
  meta: { width: 200, height: 200 },
  path: "",
});

const createAsset = (id: string, name?: string): UploadedClientAsset => ({
  status: "uploaded",
  asset: createServerAsset(id, name),
  preview: undefined,
});

const createPreviewAsset = (id: string): UploadingClientAsset => {
  return {
    status: "uploading",
    asset: undefined,
    preview: createAsset(id).asset,
  };
};

const createPreviewAndAsset = (
  id: string,
  name?: string
): UploadedClientAsset => {
  return {
    status: "uploaded",
    asset: createAsset(id, name).asset,
    preview: createAsset(id).asset,
  };
};

const createDeletingAsset = (id: string): DeletingClientAsset => {
  return {
    ...createAsset(id),
    status: "deleting",
  };
};

describe("updateStateAssets", () => {
  const stateAssets = [
    createPreviewAsset("1"),
    createAsset("2"),
    createDeletingAsset("3"),
    createAsset("4"),
    createDeletingAsset("5"),
    createDeletingAsset("6"),
    createPreviewAsset("7"),
  ];

  test("Deleting assets should not update", () => {
    const serverAssets = [
      createServerAsset("2"),
      createServerAsset("3"),
      createServerAsset("4"),
      createServerAsset("5"),
      createServerAsset("6"),
    ];

    const nextAssets = updateStateAssets(stateAssets, serverAssets);

    expect(nextAssets).toEqual(stateAssets);

    // Check referential equality
    expect(updateStateAssets(nextAssets, serverAssets)).toBe(nextAssets);
  });

  test("Deleting asset should gone if not exists in server data", () => {
    const serverAssets = [
      createServerAsset("2"),
      createServerAsset("4"),
      createServerAsset("6"),
    ];

    const nextAssets = updateStateAssets(stateAssets, serverAssets);

    expect(nextAssets).toEqual(
      stateAssets.filter((a) => getAssetId(a) !== "3" && getAssetId(a) !== "5")
    );

    // Check referential equality
    expect(updateStateAssets(nextAssets, serverAssets)).toBe(nextAssets);
  });

  test("Preview assets preserves in state", () => {
    const serverAssets: Asset[] = [];

    const nextAssets = updateStateAssets(stateAssets, serverAssets);

    expect(nextAssets).toEqual(
      stateAssets.filter((a) => a.status === "uploading")
    );

    // Check referential equality
    expect(updateStateAssets(nextAssets, serverAssets)).toBe(nextAssets);
  });

  test("Preview assets updated on same id asset at server state", () => {
    const serverAssets = [createServerAsset("1")];

    const nextAssets = updateStateAssets(stateAssets, serverAssets);

    expect(nextAssets).toEqual([
      createPreviewAndAsset("1"),
      createPreviewAsset("7"),
    ]);

    // Check referential equality
    expect(updateStateAssets(nextAssets, serverAssets)).toBe(nextAssets);
  });

  test("Updated asset updated", () => {
    const serverAssets = [createServerAsset("1", "new name")];

    const nextAssets = updateStateAssets(stateAssets, serverAssets);

    expect(nextAssets).toEqual([
      createPreviewAndAsset("1", "new name"),
      createPreviewAsset("7"),
    ]);

    // Check referential equality
    expect(updateStateAssets(nextAssets, serverAssets)).toBe(nextAssets);
  });

  test("Add asset not existing in stateAssets", () => {
    const serverAssets = [createServerAsset("8")];

    const nextAssets = updateStateAssets(stateAssets, serverAssets);

    expect(nextAssets).toEqual([
      createPreviewAsset("1"),
      createPreviewAsset("7"),
      createAsset("8"),
    ]);

    // Check referential equality
    expect(updateStateAssets(nextAssets, serverAssets)).toBe(nextAssets);
  });
});
