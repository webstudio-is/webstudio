import type { WebstudioFragment } from "@webstudio-is/sdk";
import { builderApi } from "../builder-api";
import { nanoid } from "nanoid";

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

  const assetUrlToIds = await uploadImages(srcProps.map(([, value]) => value));

  const srcPropIdToAssetId = new Map(
    srcProps.map(([id, url]) => [id, assetUrlToIds.get(url)] as const)
  );

  const result = { ...data };

  result.props = result.props
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
    .flat();

  return result;
};
