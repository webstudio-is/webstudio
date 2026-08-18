import { describe, expect, test } from "vitest";
import { rootComponent } from "@webstudio-is/sdk";
import { __testing__ } from "./props-section";

const {
  shouldShowPropertiesSection,
  shouldRenderPropsSectionContainer,
  shouldSyncMediaAssetProps,
} = __testing__;

describe("shouldShowPropertiesSection", () => {
  test("shows properties in design mode even when empty", () => {
    expect(
      shouldShowPropertiesSection({
        isDesignMode: true,
        isContentMode: false,
        hasProperties: false,
      })
    ).toBe(true);
  });

  test("shows content-mode properties when any visible item exists", () => {
    expect(
      shouldShowPropertiesSection({
        isDesignMode: false,
        isContentMode: true,
        hasProperties: true,
      })
    ).toBe(true);
  });

  test("hides properties outside design mode when there are no visible items", () => {
    expect(
      shouldShowPropertiesSection({
        isDesignMode: false,
        isContentMode: true,
        hasProperties: false,
      })
    ).toBe(false);
    expect(
      shouldShowPropertiesSection({
        isDesignMode: false,
        isContentMode: false,
        hasProperties: true,
      })
    ).toBe(false);
  });
});

describe("shouldRenderPropsSectionContainer", () => {
  test("renders when component metadata exists", () => {
    expect(
      shouldRenderPropsSectionContainer({
        component: "Box",
        propsMetasSize: 1,
        hasVisibleProps: false,
        isContentMode: false,
      })
    ).toBe(true);
  });

  test("renders content-mode visible props without component metadata", () => {
    expect(
      shouldRenderPropsSectionContainer({
        component: "Box",
        propsMetasSize: 0,
        hasVisibleProps: true,
        isContentMode: true,
      })
    ).toBe(true);
  });

  test("hides root and empty metadata without content-visible props", () => {
    expect(
      shouldRenderPropsSectionContainer({
        component: rootComponent,
        propsMetasSize: 1,
        hasVisibleProps: true,
        isContentMode: true,
      })
    ).toBe(false);
    expect(
      shouldRenderPropsSectionContainer({
        component: "Box",
        propsMetasSize: 0,
        hasVisibleProps: true,
        isContentMode: false,
      })
    ).toBe(false);
    expect(
      shouldRenderPropsSectionContainer({
        component: "Box",
        propsMetasSize: 0,
        hasVisibleProps: false,
        isContentMode: true,
      })
    ).toBe(false);
  });
});

describe("shouldSyncMediaAssetProps", () => {
  test("syncs related media props for image and video source assets", () => {
    expect(
      shouldSyncMediaAssetProps({
        component: "Image",
        propName: "src",
        propValue: { type: "asset" },
      })
    ).toBe(true);
    expect(
      shouldSyncMediaAssetProps({
        component: "Video",
        propName: "src",
        propValue: { type: "asset" },
      })
    ).toBe(true);
  });

  test("ignores non-source and non-asset changes", () => {
    expect(
      shouldSyncMediaAssetProps({
        component: "Image",
        propName: "alt",
        propValue: { type: "asset" },
      })
    ).toBe(false);
    expect(
      shouldSyncMediaAssetProps({
        component: "Image",
        propName: "src",
        propValue: { type: "string" },
      })
    ).toBe(false);
  });
});
