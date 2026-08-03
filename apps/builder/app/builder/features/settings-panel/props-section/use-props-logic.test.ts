import { describe, expect, test } from "vitest";
import type { Instance, Prop, PropMeta } from "@webstudio-is/sdk";
import { textContentAttribute } from "@webstudio-is/react-sdk";
import { __testing__ } from "./use-props-logic";
import type { ContentModeCapabilities } from "@webstudio-is/project-build/runtime";

const { isPropVisibleInContentMode, getAndDelete, getTextContentTarget } =
  __testing__;

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

describe("getTextContentTarget", () => {
  test("exposes a mixed primitive sequence on the selected instance", () => {
    const instance = {
      type: "instance" as const,
      id: "reading-time",
      component: "ws:element",
      tag: "span",
      children: [
        { type: "text" as const, value: " · " },
        { type: "expression" as const, value: 'readTime ?? ""' },
      ],
    };

    expect(
      getTextContentTarget({
        instance,
        instances: new Map([[instance.id, instance]]),
        supported: true,
        isContentMode: false,
        selectedInstanceSelector: [instance.id, "body"],
      })
    ).toEqual({
      instanceId: instance.id,
      instanceSelector: [instance.id, "body"],
    });
  });

  test("uses the same mixed-content classification for Link to Text redirection", () => {
    const text = {
      type: "instance" as const,
      id: "text",
      component: "Text",
      children: [
        { type: "text" as const, value: "Hello " },
        { type: "expression" as const, value: "name" },
      ],
    };
    const link = {
      type: "instance" as const,
      id: "link",
      component: "Link",
      children: [{ type: "id" as const, value: text.id }],
    };

    expect(
      getTextContentTarget({
        instance: link,
        instances: new Map<string, Instance>([
          [link.id, link],
          [text.id, text],
        ]),
        supported: false,
        isContentMode: true,
        selectedInstanceSelector: [link.id, "body"],
      })
    ).toEqual({
      instanceId: text.id,
      instanceSelector: [text.id, link.id, "body"],
    });
  });
});
