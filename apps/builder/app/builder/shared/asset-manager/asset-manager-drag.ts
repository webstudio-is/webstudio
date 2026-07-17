import type { AssetManagerSelection } from "./asset-manager-selection";

type DragData = Record<string | symbol, unknown>;

const parseDragItem = (value: unknown): AssetManagerSelection | undefined => {
  if (typeof value !== "object" || value === null) {
    return;
  }
  const item = value as Record<string, unknown>;
  if (
    (item.type !== "asset" && item.type !== "folder") ||
    typeof item.id !== "string"
  ) {
    return;
  }
  return { type: item.type, id: item.id };
};

export const getAssetManagerDragItems = (
  data: DragData
): AssetManagerSelection[] => {
  if (Array.isArray(data.items)) {
    return data.items.flatMap((item) => {
      const parsed = parseDragItem(item);
      return parsed === undefined ? [] : [parsed];
    });
  }
  if (
    (data.kind === "asset" || data.kind === "asset-folder") &&
    typeof data.id === "string"
  ) {
    return [
      {
        type: data.kind === "asset" ? "asset" : "folder",
        id: data.id,
      },
    ];
  }
  return [];
};
