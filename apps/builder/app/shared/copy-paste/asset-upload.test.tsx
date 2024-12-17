import { expect, test } from "vitest";
import { $, renderJsx, AssetValue } from "@webstudio-is/template";
import { denormalizeSrcProps } from "./asset-upload";
import type { StyleDecl, WebstudioFragment } from "@webstudio-is/sdk";

test("extractSrcProps works well", async () => {
  const inputData = renderJsx(
    <$.Body ws:id="boxA">
      <$.Image ws:id="imageA" src="https://src-a/"></$.Image>
      <$.Box ws:id="boxB">
        <$.Image ws:id="imageB" src="https://src-b/"></$.Image>
      </$.Box>
    </$.Body>
  );

  const data: WebstudioFragment = {
    assets: [],
    breakpoints: [],
    children: [],
    dataSources: [],
    instances: [...inputData.instances.values()],
    props: [...inputData.props.values()],
    resources: [],
    styles: [],
    styleSources: [],
    styleSourceSelections: [],
  };

  const src2AssetId = (src: string) => `${src}asset-id`;

  const uploadImages = async (srcs: string[]) => {
    return new Map(srcs.map((src) => [src, `${src2AssetId(src)}`]));
  };

  const denormalizedData = await denormalizeSrcProps(
    data,
    uploadImages,
    (instanceId, propName) => `${instanceId}:${propName}`
  );

  const assetA = new AssetValue(src2AssetId("https://src-a/"));
  const assetB = new AssetValue(src2AssetId("https://src-b/"));

  const desiredOutcome = renderJsx(
    <$.Body ws:id="boxA">
      <$.Image
        ws:id="imageA"
        src={assetA}
        width={assetA}
        height={assetA}
      ></$.Image>
      <$.Box ws:id="boxB">
        <$.Image
          ws:id="imageB"
          src={assetB}
          width={assetB}
          height={assetB}
        ></$.Image>
      </$.Box>
    </$.Body>
  );

  expect(denormalizedData.instances).toEqual([
    ...desiredOutcome.instances.values(),
  ]);

  expect(denormalizedData.props).toEqual([...desiredOutcome.props.values()]);
});

test("it works well with no background-images", async () => {
  const style: StyleDecl = {
    styleSourceId: "uulh2yW_VLZUgzjQ1bUt4",
    breakpointId: "oQzjv7ZBzTiajBs6H03St",
    property: "backgroundImage",
    value: {
      type: "layers",
      value: [
        {
          type: "unparsed",
          value: "linear-gradient(180deg,hsla(0,0.00%,0.00%,0.11),white)",
        },
        {
          type: "image",
          value: {
            type: "url",
            url: "https://s3.amazonaws.com/webflow-prod-assets/667c32290bd6159c18dca9a0/667d0b7769e0cc3754b584f6_IMG_2882%20(1).png",
          },
        },
        {
          type: "image",
          value: {
            type: "url",
            url: "https://s3.amazonaws.com/webflow-prod-assets/667c32290bd6159c18dca9a0/667d0fe180995eadc1534a26_%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%9C%D0%B8%D1%80%20%3A%20%252F%20.webp",
          },
        },
      ],
    },
  };

  const data: WebstudioFragment = {
    assets: [],
    breakpoints: [],
    children: [],
    dataSources: [],
    instances: [],
    props: [],
    resources: [],
    styles: [style],
    styleSources: [],
    styleSourceSelections: [],
  };

  const src2AssetId = (src: string) => `asset-id::::${src}::::asset-id`;

  const uploadImages = async (srcs: string[]) => {
    return new Map(srcs.map((src) => [src, `${src2AssetId(src)}`]));
  };

  const denormalizedData = await denormalizeSrcProps(
    data,
    uploadImages,
    (instanceId, propName) => `${instanceId}:${propName}`
  );
  const inputUrls = data.styles
    .filter((style) => style.property === "backgroundImage")
    .map((style) => style.value)
    .filter((value) => value.type === "layers")
    .flatMap((layer) => layer.value)
    .filter((value) => value.type === "image")
    .map((value) => value.value)
    .filter((value) => value.type === "url")
    .map((value) => value.url);

  const denormalizedAssetIds = denormalizedData.styles
    .filter((style) => style.property === "backgroundImage")
    .map((style) => style.value)
    .filter((value) => value.type === "layers")
    .flatMap((layer) => layer.value)
    .filter((value) => value.type === "image")
    .map((value) => value.value)
    .filter((value) => value.type === "asset")
    .map((value) => value.value);

  expect(denormalizedAssetIds).toEqual(inputUrls.map(src2AssetId));
});
