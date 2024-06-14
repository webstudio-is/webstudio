import type { WebstudioFragment } from "@webstudio-is/sdk";
import { builderApi } from "../builder-api";

type StringProp = Extract<
  WebstudioFragment["props"][number],
  { type: "string" }
>;

export const denormalizeSrcProps = async (
  data: WebstudioFragment
): Promise<WebstudioFragment> => {
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
    .map((prop) => [prop.id, new URL(prop.value)] as const);

  const assetUrlToIds = await builderApi.uploadAssets(
    "image",
    srcProps.map(([, value]) => value)
  );

  const srcPropIdToAssetId = new Map(
    srcProps.map(([id, url]) => [id, assetUrlToIds.get(url)] as const)
  );

  const result = { ...data };

  result.props = result.props.map((prop) => {
    if (prop.type === "string" && prop.name === "src") {
      const assetId = srcPropIdToAssetId.get(prop.id);

      if (assetId === undefined) {
        return prop;
      }

      // @todo: add width and height props
      return {
        ...prop,
        type: "asset",
        value: assetId,
      };
    }

    return prop;
  });

  return result;
};
