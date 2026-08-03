import { describe, expect, test } from "vitest";
import type { Prop, PropMeta } from "@webstudio-is/sdk";
import { textContentAttribute } from "@webstudio-is/react-sdk";
import { __testing__ } from "./use-props-logic";
import type { ContentModeCapabilities } from "@webstudio-is/project-build/runtime";

const { isPropVisibleInContentMode, getAndDelete } = __testing__;

const getInput = (
  input: Partial<Parameters<typeof isPropVisibleInContentMode>[0]> = {}
): Parameters<typeof isPropVisibleInContentMode>[0] => ({
  propName: "title",
  props: [],
  propsMetas: new Map(),
  selectedInstanceSelector: ["editable-instance"],
  capabilities: {
    editablePropIds: new Set(),
    editableInstanceIds: new Set(["editable-instance"]),
    instances: new Map([
      [
        "editable-instance",
        {
          type: "instance",
          id: "editable-instance",
          component: "Box",
          children: [],
        },
      ],
    ]),
    metas: new Map(),
    props: new Map(),
    htmlTagsByInstanceId: new Map(),
    styleSources: new Map(),
    styleSourceSelections: new Map(),
    styles: new Map(),
    contentRootIds: new Set(["editable-instance"]),
  } satisfies ContentModeCapabilities,
  ...input,
});

describe("isPropVisibleInContentMode", () => {
  test("hides props when no editable instance is selected", () => {
    expect(
      isPropVisibleInContentMode(
        getInput({ selectedInstanceSelector: undefined })
      )
    ).toBe(false);
    expect(
      isPropVisibleInContentMode(
        getInput({
          selectedInstanceSelector: ["readonly-instance"],
        })
      )
    ).toBe(false);
  });

  test("shows text content for editable instances", () => {
    expect(
      isPropVisibleInContentMode(getInput({ propName: textContentAttribute }))
    ).toBe(true);
  });

  test("shows existing asset props as content", () => {
    const prop: Prop = {
      id: "image-prop",
      instanceId: "editable-instance",
      name: "image",
      type: "asset",
      value: "asset-id",
    };

    expect(
      isPropVisibleInContentMode(
        getInput({
          propName: "image",
          props: [prop],
          capabilities: {
            ...getInput().capabilities,
            editablePropIds: new Set(["image-prop"]),
          },
        })
      )
    ).toBe(true);
  });

  test("shows unset file controls as content-editable asset props", () => {
    const fileMeta: PropMeta = {
      type: "string",
      control: "file",
      required: false,
    };

    expect(
      isPropVisibleInContentMode(
        getInput({
          propName: "image",
          propsMetas: new Map([["image", fileMeta]]),
        })
      )
    ).toBe(true);
  });

  test("shows only props marked as content mode in metadata", () => {
    const contentModeMeta: PropMeta = {
      type: "string",
      control: "text",
      required: false,
      contentMode: true,
    };
    const designMeta: PropMeta = {
      type: "string",
      control: "text",
      required: false,
    };

    expect(
      isPropVisibleInContentMode(
        getInput({
          propName: "content",
          propsMetas: new Map([["content", contentModeMeta]]),
        })
      )
    ).toBe(true);
    expect(
      isPropVisibleInContentMode(
        getInput({
          propName: "design",
          propsMetas: new Map([["design", designMeta]]),
        })
      )
    ).toBe(false);
  });
});

describe("getAndDelete", () => {
  test("returns and removes an existing map value", () => {
    const map = new Map([["key", 1]]);

    expect(getAndDelete(map, "key")).toBe(1);
    expect(map.has("key")).toBe(false);
  });

  test("returns undefined and still deletes missing keys", () => {
    const map = new Map([["key", 1]]);

    expect(getAndDelete(map, "missing")).toBeUndefined();
    expect(map).toEqual(new Map([["key", 1]]));
  });
});
