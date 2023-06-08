import { type WsComponentMeta } from "@webstudio-is/react-sdk";

export const getMetaMaps = (
  metaByComponentName: Map<string, WsComponentMeta>
) => {
  const metaByCategory: Map<
    WsComponentMeta["category"],
    Array<WsComponentMeta>
  > = new Map();
  const componentNamesByMeta: Map<WsComponentMeta, string> = new Map();

  for (const [name, meta] of metaByComponentName) {
    if (meta.category === undefined || meta.category === "hidden") {
      continue;
    }
    let categoryMetas = metaByCategory.get(meta.category);
    if (categoryMetas === undefined) {
      categoryMetas = [];
      metaByCategory.set(meta.category, categoryMetas);
    }
    categoryMetas.push(meta);
    metaByComponentName.set(name, meta);
    componentNamesByMeta.set(meta, name);
  }

  for (const meta of metaByCategory.values()) {
    meta.sort((metaA, metaB) => {
      return (
        (metaA.order ?? Number.MAX_SAFE_INTEGER) -
        (metaB.order ?? Number.MAX_SAFE_INTEGER)
      );
    });
  }

  return { metaByCategory, componentNamesByMeta };
};
