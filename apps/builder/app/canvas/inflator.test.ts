import { describe, test, expect } from "vitest";
import type { Breakpoint, StyleDecl, WsComponentMeta } from "@webstudio-is/sdk";
import type { StyleValue } from "@webstudio-is/css-engine";
import { __testing__ } from "./inflator";

const {
  getInstanceSize,
  getInflationState,
  buildAncestorSelector,
  extractInstanceIdsFromChanges,
} = __testing__;

const px = (value: number): StyleValue => ({
  type: "unit",
  value,
  unit: "px",
});

const createStyleDecl = (overrides: Partial<StyleDecl> = {}): StyleDecl => ({
  styleSourceId: "ss-1",
  breakpointId: "base",
  property: "color",
  value: { type: "keyword", value: "red" },
  ...overrides,
});

describe("getInstanceSize", () => {
  const baseBreakpoints = new Map<string, Breakpoint>([
    ["base", { id: "base", label: "Base" }],
  ]);

  const callGetInstanceSize = (
    overrides: Partial<Parameters<typeof getInstanceSize>[0]> = {}
  ) =>
    getInstanceSize({
      instanceId: "inst-1",
      tagName: "div",
      metas: new Map(),
      breakpoints: baseBreakpoints,
      selectedBreakpointId: "base",
      stylesByInstanceId: new Map(),
      instances: new Map(),
      ...overrides,
    });

  const noSize = { width: undefined, height: undefined };

  test("returns undefined when no selected breakpoint", () => {
    expect(callGetInstanceSize({ selectedBreakpointId: undefined })).toEqual(
      noSize
    );
  });

  test("returns undefined when instance has no styles or preset", () => {
    expect(callGetInstanceSize()).toEqual(noSize);
  });

  test("reads width and height from preset styles", () => {
    const metas = new Map<string, WsComponentMeta>([
      [
        "Box",
        {
          presetStyle: {
            div: [
              { property: "width", value: px(100) },
              { property: "height", value: px(50) },
            ],
          },
        },
      ],
    ]);
    expect(
      callGetInstanceSize({
        metas,
        instances: new Map([["inst-1", { component: "Box" }]]),
      })
    ).toEqual({ width: 100, height: 50 });
  });

  test("ignores preset styles with a state selector", () => {
    const metas = new Map<string, WsComponentMeta>([
      [
        "Box",
        {
          presetStyle: {
            div: [{ state: ":hover", property: "width", value: px(200) }],
          },
        },
      ],
    ]);
    expect(
      callGetInstanceSize({
        metas,
        instances: new Map([["inst-1", { component: "Box" }]]),
      })
    ).toEqual(noSize);
  });

  test("instance styles override preset styles", () => {
    const metas = new Map<string, WsComponentMeta>([
      [
        "Box",
        {
          presetStyle: {
            div: [{ property: "width", value: px(100) }],
          },
        },
      ],
    ]);
    expect(
      callGetInstanceSize({
        metas,
        instances: new Map([["inst-1", { component: "Box" }]]),
        stylesByInstanceId: new Map([
          ["inst-1", [createStyleDecl({ property: "width", value: px(250) })]],
        ]),
      })
    ).toEqual({ width: 250, height: undefined });
  });

  test("non-unit value (auto) results in undefined", () => {
    expect(
      callGetInstanceSize({
        instances: new Map([["inst-1", { component: "Box" }]]),
        stylesByInstanceId: new Map([
          [
            "inst-1",
            [
              createStyleDecl({
                property: "width",
                value: { type: "keyword", value: "auto" },
              }),
            ],
          ],
        ]),
      })
    ).toEqual(noSize);
  });

  test("cascades breakpoints from smallest to selected", () => {
    const breakpoints = new Map<string, Breakpoint>([
      ["base", { id: "base", label: "Base" }],
      ["tablet", { id: "tablet", label: "Tablet", maxWidth: 991 }],
      ["mobile", { id: "mobile", label: "Mobile", maxWidth: 479 }],
    ]);
    expect(
      callGetInstanceSize({
        breakpoints,
        selectedBreakpointId: "tablet",
        instances: new Map([["inst-1", { component: "Box" }]]),
        stylesByInstanceId: new Map([
          [
            "inst-1",
            [
              createStyleDecl({
                breakpointId: "base",
                property: "width",
                value: px(100),
              }),
              createStyleDecl({
                breakpointId: "tablet",
                property: "width",
                value: px(200),
              }),
              createStyleDecl({
                breakpointId: "mobile",
                property: "width",
                value: px(300),
              }),
            ],
          ],
        ]),
      })
    ).toEqual({ width: 200, height: undefined });
  });

  test("stops cascade at selected breakpoint", () => {
    const breakpoints = new Map<string, Breakpoint>([
      ["base", { id: "base", label: "Base" }],
      ["tablet", { id: "tablet", label: "Tablet", maxWidth: 991 }],
      ["mobile", { id: "mobile", label: "Mobile", maxWidth: 479 }],
    ]);
    expect(
      callGetInstanceSize({
        breakpoints,
        selectedBreakpointId: "base",
        instances: new Map([["inst-1", { component: "Box" }]]),
        stylesByInstanceId: new Map([
          [
            "inst-1",
            [
              createStyleDecl({
                breakpointId: "mobile",
                property: "width",
                value: px(300),
              }),
            ],
          ],
        ]),
      })
    ).toEqual(noSize);
  });

  test("skips preset when tagName is undefined", () => {
    const metas = new Map<string, WsComponentMeta>([
      [
        "Box",
        {
          presetStyle: {
            div: [{ property: "width", value: px(100) }],
          },
        },
      ],
    ]);
    expect(
      callGetInstanceSize({
        tagName: undefined,
        metas,
        instances: new Map([["inst-1", { component: "Box" }]]),
      })
    ).toEqual(noSize);
  });

  test("ignores instance styles with a state selector", () => {
    expect(
      callGetInstanceSize({
        instances: new Map([["inst-1", { component: "Box" }]]),
        stylesByInstanceId: new Map([
          [
            "inst-1",
            [
              createStyleDecl({
                state: ":hover",
                property: "width",
                value: px(999),
              }),
            ],
          ],
        ]),
      })
    ).toEqual(noSize);
  });
});

describe("getInflationState", () => {
  const call = (overrides: Partial<Parameters<typeof getInflationState>[0]>) =>
    getInflationState({
      offsetWidth: 100,
      offsetHeight: 100,
      explicitWidth: undefined,
      explicitHeight: undefined,
      ...overrides,
    });

  test("no inflation when element has size", () => {
    expect(call({})).toBe("");
  });

  test("inflate width only", () => {
    expect(call({ offsetWidth: 0 })).toBe("w");
  });

  test("inflate height only", () => {
    expect(call({ offsetHeight: 0 })).toBe("h");
  });

  test("inflate both dimensions", () => {
    expect(call({ offsetWidth: 0, offsetHeight: 0 })).toBe("wh");
  });

  test("explicit width prevents inflation", () => {
    expect(call({ offsetWidth: 0, explicitWidth: 100 })).toBe("");
  });

  test("explicit height prevents inflation", () => {
    expect(call({ offsetHeight: 0, explicitHeight: 50 })).toBe("");
  });

  test("both explicit sizes prevent inflation", () => {
    expect(
      call({
        offsetWidth: 0,
        offsetHeight: 0,
        explicitWidth: 100,
        explicitHeight: 50,
      })
    ).toBe("");
  });

  test("partial explicit: inflate only height", () => {
    expect(call({ offsetWidth: 0, offsetHeight: 0, explicitWidth: 100 })).toBe(
      "h"
    );
  });

  test("explicit 0 still prevents inflation", () => {
    expect(
      call({
        offsetWidth: 0,
        offsetHeight: 0,
        explicitWidth: 0,
        explicitHeight: 0,
      })
    ).toBe("");
  });
});

describe("buildAncestorSelector", () => {
  test("returns body when :has() is not supported", () => {
    expect(
      buildAncestorSelector({
        instanceIds: ["id-1", "id-2"],
        hasSelectorSupport: false,
      })
    ).toBe("body");
  });

  test("single instance id", () => {
    expect(
      buildAncestorSelector({ instanceIds: ["id-1"], hasSelectorSupport: true })
    ).toBe('[data-ws-id]:has([data-ws-id="id-1"])');
  });

  test("multiple instance ids", () => {
    expect(
      buildAncestorSelector({
        instanceIds: ["id-1", "id-2"],
        hasSelectorSupport: true,
      })
    ).toBe('[data-ws-id]:has([data-ws-id="id-1"]):has([data-ws-id="id-2"])');
  });

  test("empty array with :has() support", () => {
    expect(
      buildAncestorSelector({ instanceIds: [], hasSelectorSupport: true })
    ).toBe("[data-ws-id]");
  });

  test("empty array without :has() support", () => {
    expect(
      buildAncestorSelector({ instanceIds: [], hasSelectorSupport: false })
    ).toBe("body");
  });
});

describe("extractInstanceIdsFromChanges", () => {
  const sss = (patches: Array<{ value?: { instanceId?: unknown } }>) => ({
    namespace: "styleSourceSelections" as const,
    patches,
  });

  test("empty changes", () => {
    expect(extractInstanceIdsFromChanges([])).toEqual([]);
  });

  test("extracts ids from styleSourceSelections", () => {
    expect(
      extractInstanceIdsFromChanges([
        sss([{ value: { instanceId: "a" } }, { value: { instanceId: "b" } }]),
      ])
    ).toEqual(["a", "b"]);
  });

  test("ignores other namespaces", () => {
    expect(
      extractInstanceIdsFromChanges([
        { namespace: "styles", patches: [{ value: { instanceId: "a" } }] },
      ])
    ).toEqual([]);
  });

  test("skips patches without instanceId or with non-string instanceId", () => {
    expect(
      extractInstanceIdsFromChanges([
        sss([
          { value: {} },
          { value: { instanceId: undefined } },
          { value: { instanceId: 123 } },
          { value: { instanceId: "valid" } },
        ]),
      ])
    ).toEqual(["valid"]);
  });

  test("combines ids across multiple changes", () => {
    expect(
      extractInstanceIdsFromChanges([
        sss([{ value: { instanceId: "a" } }]),
        { namespace: "styles", patches: [{ value: { instanceId: "skip" } }] },
        sss([{ value: { instanceId: "b" } }]),
      ])
    ).toEqual(["a", "b"]);
  });

  test("handles patches without value property", () => {
    expect(
      extractInstanceIdsFromChanges([
        sss([
          {} as { value?: { instanceId?: unknown } },
          { value: { instanceId: "a" } },
        ]),
      ])
    ).toEqual(["a"]);
  });
});
