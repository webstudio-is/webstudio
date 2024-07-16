import type { WebstudioFragment } from "@webstudio-is/sdk";
import { builderApi } from "../builder-api";
import { nanoid } from "nanoid";
import { produce, enablePatches, type Patch, applyPatches } from "immer";

enablePatches();

type StringProp = Extract<
  WebstudioFragment["props"][number],
  { type: "string" }
>;

const extractSrcProps = (
  data: WebstudioFragment
): [propId: string, href: string][] => {
  const imageComponentsSet = new Set(
    data.instances
      .filter(
        (instance) =>
          instance.type === "instance" && instance.component === "Image"
      )
      .map((instance) => instance.id)
  );

  const srcProps = data.props
    .filter(
      (prop): prop is StringProp =>
        prop.type === "string" &&
        prop.name === "src" &&
        imageComponentsSet.has(prop.instanceId)
    )
    .map(
      (prop) =>
        [prop.id, new URL(prop.value).href] as [propId: string, href: string]
    );

  return srcProps;
};

const extractUrlProps = (data: WebstudioFragment) => {
  const changes: Patch[] = [];
  const urls: string[] = [];

  produce(
    data,
    (draft) => {
      const images = draft.styles
        .filter((style) => style.property === "backgroundImage")
        .map((style) => style.value)
        .filter((value) => value.type === "layers")
        .flatMap((layer) => layer.value)
        .filter((value) => value.type === "image");

      for (const image of images) {
        if (image.value.type === "url") {
          const url = image.value.url;

          urls.push(url);

          image.value = {
            type: "asset",
            value: url,
          };
        }
      }
    },
    (patches) => {
      changes.push(...patches);
    }
  );

  const applyUrlToIdChanges = (
    sourceData: WebstudioFragment,
    urlToId: Map<string, string>
  ): WebstudioFragment => {
    // Convert urls to ids in patches and apply them
    const transformedPatched = JSON.parse(
      JSON.stringify(changes),
      (_key, value) => {
        if (typeof value === "string") {
          if (urlToId.has(value)) {
            return urlToId.get(value);
          }
        }
        return value;
      }
    );

    return applyPatches(sourceData, transformedPatched);
  };

  return { urls, applyUrlToIdChanges };
};

/**
 *
 * Similar to normalizeProps, where asset properties are replaced with values,
 * here we replace the image src string property with the asset.
 */
export const denormalizeSrcProps = async (
  data: WebstudioFragment,
  uploadImages = builderApi.uploadImages,
  generateId: (instanceId: string, propName: string) => string = () => nanoid()
): Promise<WebstudioFragment> => {
  const srcProps = extractSrcProps(data);
  const { urls, applyUrlToIdChanges } = extractUrlProps(data);

  const assetUrlToIds = await uploadImages([
    ...srcProps.map(([, value]) => value),
    ...urls,
  ]);

  const srcPropIdToAssetId = new Map(
    srcProps.map(([id, url]) => [id, assetUrlToIds.get(url)] as const)
  );

  let result = applyUrlToIdChanges(data, assetUrlToIds);

  result = {
    ...result,

    props: result.props
      .map((prop) => {
        if (prop.type === "string" && prop.name === "src") {
          const assetId = srcPropIdToAssetId.get(prop.id);

          if (assetId === undefined) {
            return prop;
          }

          // @todo: add width and height props
          const assetWithSizeProps: WebstudioFragment["props"] = [
            {
              ...prop,
              type: "asset",
              value: assetId,
            },
            {
              id: generateId(prop.instanceId, "width"),
              name: "width",
              instanceId: prop.instanceId,
              type: "asset",
              value: assetId,
            },
            {
              id: generateId(prop.instanceId, "height"),
              name: "height",
              instanceId: prop.instanceId,
              type: "asset",
              value: assetId,
            },
          ];
          return assetWithSizeProps;
        }

        return prop;
      })
      .flat(),
  };

  return result;
};
