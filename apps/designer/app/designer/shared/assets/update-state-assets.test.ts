import type { Asset } from "@webstudio-is/asset-uploader";
import { DeletingAsset, PreviewAsset } from "./types";
import { updateStateAssets } from "./update-state-assets";

const createAsset = (id: string, name?: string): Asset => ({
  id,
  status: "uploaded",
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

const createPreviewAsset = (id: string): PreviewAsset => {
  return {
    ...createAsset(id),
    status: "uploading",
  };
};

const createDeletingAsset = (id: string): DeletingAsset => {
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
      createAsset("2"),
      createAsset("3"),
      createAsset("4"),
      createAsset("5"),
      createAsset("6"),
    ];

    const nextAssets = updateStateAssets(stateAssets, serverAssets);

    expect(nextAssets).toEqual(stateAssets);

    // Check referential equality
    expect(updateStateAssets(nextAssets, serverAssets)).toBe(nextAssets);
  });

  test("Deleting asset should gone if not exists in server data", () => {
    const serverAssets = [createAsset("2"), createAsset("4"), createAsset("6")];

    const nextAssets = updateStateAssets(stateAssets, serverAssets);

    expect(nextAssets).toEqual(
      stateAssets.filter((a) => a.id !== "3" && a.id !== "5")
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
    const serverAssets = [createAsset("1")];

    const nextAssets = updateStateAssets(stateAssets, serverAssets);

    expect(nextAssets).toEqual([createAsset("1"), createPreviewAsset("7")]);

    // Check referential equality
    expect(updateStateAssets(nextAssets, serverAssets)).toBe(nextAssets);
  });

  test("Updated asset updated", () => {
    const serverAssets = [createAsset("1", "new name")];

    const nextAssets = updateStateAssets(stateAssets, serverAssets);

    expect(nextAssets).toEqual([
      createAsset("1", "new name"),
      createPreviewAsset("7"),
    ]);

    // Check referential equality
    expect(updateStateAssets(nextAssets, serverAssets)).toBe(nextAssets);
  });
});
