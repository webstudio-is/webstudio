import { describe, expect, test } from "vitest";
import type { Prop, PropMeta } from "@webstudio-is/sdk";
import { textContentAttribute } from "@webstudio-is/react-sdk";
import { __testing__ } from "./use-props-logic";
import type { ContentModeCapabilities } from "@webstudio-is/project/content-mode-permissions";

const {
  isPropVisibleInContentMode,
  getStartingValue,
  getDefaultMetaForType,
  getAndDelete,
} = __testing__;

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

describe("getStartingValue", () => {
  test("returns defaults for primitive editable prop metas", () => {
    expect(
      getStartingValue(
        {
          type: "string",
          control: "text",
          required: false,
          defaultValue: "Text",
        },
        false
      )
    ).toEqual({ type: "string", value: "Text" });
    expect(
      getStartingValue(
        {
          type: "number",
          control: "number",
          required: false,
          defaultValue: 12,
        },
        false
      )
    ).toEqual({ type: "number", value: 12 });
    expect(
      getStartingValue(
        {
          type: "boolean",
          control: "boolean",
          required: false,
        },
        true
      )
    ).toEqual({ type: "boolean", value: true });
  });

  test("returns defaults for list and action metas", () => {
    expect(
      getStartingValue(
        {
          type: "string[]",
          control: "multi-select",
          required: false,
          options: ["a", "b"],
        },
        false
      )
    ).toEqual({ type: "string[]", value: [] });
    expect(
      getStartingValue(
        {
          type: "action",
          control: "action",
          required: false,
        },
        false
      )
    ).toEqual({ type: "action", value: [] });
  });

  test("does not create a starting value for file controls", () => {
    expect(
      getStartingValue(
        {
          type: "string",
          control: "file",
          required: false,
        },
        false
      )
    ).toBeUndefined();
  });
});

describe("getDefaultMetaForType", () => {
  test("returns fallback meta for primitive prop types", () => {
    expect(getDefaultMetaForType("string")).toEqual({
      type: "string",
      control: "text",
      required: false,
    });
    expect(getDefaultMetaForType("number")).toEqual({
      type: "number",
      control: "number",
      required: false,
    });
    expect(getDefaultMetaForType("boolean")).toEqual({
      type: "boolean",
      control: "boolean",
      required: false,
    });
  });

  test("returns fallback meta for known special prop types", () => {
    expect(getDefaultMetaForType("asset")).toEqual({
      type: "string",
      control: "file",
      required: false,
    });
    expect(getDefaultMetaForType("page")).toEqual({
      type: "string",
      control: "url",
      required: false,
    });
    expect(getDefaultMetaForType("action")).toEqual({
      type: "action",
      control: "action",
      required: false,
    });
  });

  test("throws for prop types that require explicit metadata", () => {
    expect(() => getDefaultMetaForType("string[]")).toThrow("must have a meta");
    expect(() => getDefaultMetaForType("json")).toThrow("must have a meta");
    expect(() => getDefaultMetaForType("expression")).toThrow(
      "must have a meta"
    );
    expect(() => getDefaultMetaForType("parameter")).toThrow(
      "must have a meta"
    );
    expect(() => getDefaultMetaForType("resource")).toThrow("must have a meta");
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
