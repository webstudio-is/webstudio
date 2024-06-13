import {
  type Prop,
  type Assets,
  type Pages,
  type ImageAsset,
  getPagePath,
  findPageByIdOrPath,
} from "@webstudio-is/sdk";

export const normalizeProps = ({
  props,
  assetBaseUrl,
  assets,
  uploadingImageAssets,
  pages,
  source,
}: {
  props: Prop[];
  assetBaseUrl: string;
  assets: Assets;
  uploadingImageAssets: ImageAsset[];
  pages: Pages;
  source: "canvas" | "prebuild";
}) => {
  const newProps: Prop[] = [];
  for (const prop of props) {
    if (prop.type === "asset") {
      const assetId = prop.value;
      const asset =
        assets.get(assetId) ??
        uploadingImageAssets.find((asset) => asset.id === assetId);

      if (asset === undefined) {
        continue;
      }

      const propBase = {
        id: prop.id,
        name: prop.name,
        required: prop.required,
        instanceId: prop.instanceId,
      };

      if (prop.name === "width" && asset.type === "image") {
        newProps.push({
          ...propBase,
          type: "number",
          value: asset.meta.width,
        });

        continue;
      }

      if (prop.name === "height" && asset.type === "image") {
        newProps.push({
          ...propBase,
          type: "number",
          value: asset.meta.height,
        });
        continue;
      }

      newProps.push({
        ...propBase,
        type: "string",
        value: `${assetBaseUrl}${asset.name}`,
      });

      if (source === "canvas") {
        // use assetId as key to not recreate the image if it's switched from uploading to uploaded asset state (we don't know asset src during uploading)
        // see Image component in sdk-components-react
        newProps.push({
          id: `${prop.instanceId}-${asset.id}-assetId`,
          name: "$webstudio$canvasOnly$assetId",
          required: false,
          instanceId: prop.instanceId,
          type: "string",
          value: asset.id,
        });
      }

      continue;
    }

    if (prop.type === "page") {
      let idProp: undefined | Prop;
      const pageId =
        typeof prop.value === "string" ? prop.value : prop.value.pageId;
      const page = findPageByIdOrPath(pageId, pages);

      if (page === undefined) {
        continue;
      }
      if (typeof prop.value !== "string") {
        const { instanceId } = prop.value;
        idProp = props.find(
          (prop) => prop.instanceId === instanceId && prop.name === "id"
        );
      }

      const path = getPagePath(page.id, pages);
      const url = new URL(path, "https://any-valid.url");
      let value = url.pathname;
      if (idProp?.type === "string") {
        const hash = idProp.value;
        url.hash = encodeURIComponent(hash);
        value = `${url.pathname}${url.hash}`;
      }
      newProps.push({
        id: prop.id,
        name: prop.name,
        required: prop.required,
        instanceId: prop.instanceId,
        type: "string",
        value,
      });
      continue;
    }

    newProps.push(prop);
  }
  return newProps;
};

export const idAttribute = "data-ws-id" as const;
export const selectorIdAttribute = "data-ws-selector" as const;
export const componentAttribute = "data-ws-component" as const;
export const showAttribute = "data-ws-show" as const;
export const indexAttribute = "data-ws-index" as const;
export const collapsedAttribute = "data-ws-collapsed" as const;
export const textContentAttribute = "data-ws-text-content" as const;

export const getInstanceIdFromComponentProps = (
  props: Record<string, unknown>
) => {
  return props[idAttribute] as string;
};

export const getIndexWithinAncestorFromComponentProps = (
  props: Record<string, unknown>
) => {
  return props[indexAttribute] as string | undefined;
};
