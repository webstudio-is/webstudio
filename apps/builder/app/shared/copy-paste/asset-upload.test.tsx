import { expect, test } from "@jest/globals";
import { $, renderJsx, AssetValue } from "@webstudio-is/sdk/testing";
import { denormalizeSrcProps } from "./asset-upload";
import type { WebstudioFragment } from "@webstudio-is/sdk";

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
