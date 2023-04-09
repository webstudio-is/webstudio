import warnOnce from "warn-once";
import { type Patch, applyPatches } from "immer";
import { type Project, prisma } from "@webstudio-is/prisma-client";
import type { Asset } from "@webstudio-is/asset-uploader";
import { formatAsset } from "@webstudio-is/asset-uploader/server";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";
import type { Build } from "../types";
import {
  type StoredStyleDecl,
  type StyleDecl,
  getStyleDeclKey,
  StoredStyles,
  Styles,
} from "../schema/styles";

const parseValue = (
  styleValue: StoredStyleDecl["value"],
  assetsMap: Map<string, Asset>
): StyleDecl["value"] => {
  if (styleValue.type === "layers") {
    return {
      type: "layers" as const,
      value: styleValue.value.map((style) => {
        if (style.type === "image") {
          const item = style.value;
          const asset = assetsMap.get(item.value);
          if (asset === undefined) {
            warnOnce(true, `Asset with assetId "${item.value}" not found`);

            return {
              type: "invalid" as const,
              value: JSON.stringify(styleValue.value),
            };
          }

          if (asset.type !== "image") {
            warnOnce(true, `Asset with assetId "${item.value}" not an image`);
            return {
              type: "invalid" as const,
              value: JSON.stringify(styleValue.value),
            };
          }

          return {
            type: "image" as const,
            value: {
              type: "asset" as const,
              value: asset,
            },
          };
        }
        return style;
      }),
    };
  }

  if (styleValue.type === "image") {
    const item = styleValue.value;
    const asset = assetsMap.get(item.value);

    if (asset === undefined) {
      warnOnce(true, `Asset with assetId "${item.value}" not found`);

      return {
        type: "invalid" as const,
        value: JSON.stringify(styleValue.value),
      };
    }

    if (asset.type !== "image") {
      warnOnce(true, `Asset with assetId "${item.value}" not an image`);
      return {
        type: "invalid" as const,
        value: JSON.stringify(styleValue.value),
      };
    }

    return {
      type: "image" as const,
      value: {
        type: "asset" as const,
        value: asset,
      },
    };
  }
  return styleValue;
};

export const parseStyles = async (
  projectId: Asset["projectId"],
  stylesString: string
) => {
  const storedStyles = StoredStyles.parse(JSON.parse(stylesString));

  const assetIds: string[] = [];
  for (const { value: styleValue } of storedStyles) {
    if (styleValue.type === "image") {
      const item = styleValue.value;
      if (item.type === "asset") {
        assetIds.push(item.value);
      }
    }

    if (styleValue.type === "layers") {
      for (const layer of styleValue.value) {
        if (layer.type === "image") {
          const item = layer.value;
          if (item.type === "asset") {
            assetIds.push(item.value);
          }
        }
      }
    }
  }

  // Load all assets
  const assets = await prisma.asset.findMany({
    where: {
      id: { in: assetIds },
      projectId,
    },
  });
  const assetsMap = new Map<string, Asset>();
  for (const asset of assets) {
    assetsMap.set(asset.id, formatAsset(asset));
  }

  const styles: Styles = new Map();
  for (const storedStyleDecl of storedStyles) {
    const styleDecl = {
      styleSourceId: storedStyleDecl.styleSourceId,
      breakpointId: storedStyleDecl.breakpointId,
      state: storedStyleDecl.state,
      property: storedStyleDecl.property,
      value: parseValue(storedStyleDecl.value, assetsMap),
    };
    styles.set(getStyleDeclKey(styleDecl), styleDecl);
  }

  return styles;
};

/**
 * prepare value to store in db
 */
const serializeValue = (
  styleValue: StyleDecl["value"]
): StoredStyleDecl["value"] => {
  if (styleValue.type === "image") {
    if (styleValue.value.type === "url") {
      return { type: "keyword", value: "none" };
    }
    const asset = styleValue.value;
    return {
      type: "image" as const,
      value: {
        type: asset.type,
        // only asset id is stored in db
        value: asset.value.id,
      },
    };
  }
  if (styleValue.type === "layers") {
    return {
      type: "layers" as const,
      value: styleValue.value.map((item) => {
        if (item.type === "image") {
          if (item.value.type === "url") {
            return { type: "keyword" as const, value: "none" };
          }
          const asset = item.value;
          return {
            type: "image" as const,
            value: {
              type: asset.type,
              // only asset id is stored in db
              value: asset.value.id,
            },
          };
        }
        return item;
      }),
    };
  }

  return styleValue;
};

export const serializeStyles = (styles: Styles) => {
  const storedStyles: StoredStyles = Array.from(
    styles.values(),
    (styleDecl) => {
      return {
        breakpointId: styleDecl.breakpointId,
        styleSourceId: styleDecl.styleSourceId,
        state: styleDecl.state,
        property: styleDecl.property,
        value: serializeValue(styleDecl.value),
      };
    }
  );
  return JSON.stringify(storedStyles);
};

export const patchStyles = async (
  { buildId, projectId }: { buildId: Build["id"]; projectId: Project["id"] },
  patches: Array<Patch>,
  context: AppContext
) => {
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );

  if (canEdit === false) {
    throw new Error("You don't have edit access to this project");
  }

  const build = await prisma.build.findUnique({
    where: {
      id_projectId: { projectId, id: buildId },
    },
  });
  if (build === null) {
    return;
  }

  const styles = await parseStyles(build.projectId, build.styles);

  const patchedStyles = Styles.parse(applyPatches(styles, patches));

  await prisma.build.update({
    data: {
      styles: serializeStyles(patchedStyles),
    },
    where: {
      id_projectId: { projectId, id: buildId },
    },
  });
};
