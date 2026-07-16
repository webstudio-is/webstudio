import {
  fragmentTesting,
  detectFragmentTokenConflicts,
  detectPageTokenConflicts,
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "@webstudio-is/project-build/runtime";
import { getWebstudioData } from "./data";
import { enableMapSet } from "immer";
import { describe, test, expect, beforeEach } from "vitest";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $, ws, css, renderData, token } from "@webstudio-is/template";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import type {
  Asset,
  Breakpoint,
  Instance,
  StyleDecl,
  StyleDeclKey,
  StyleSource,
  WebstudioData,
  WebstudioFragment,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  coreMetas,
  getStyleDeclKey,
  portalComponent,
  elementComponent,
  ROOT_INSTANCE_ID,
} from "@webstudio-is/sdk";
import type { StyleProperty, StyleValue } from "@webstudio-is/css-engine";
import { $registeredComponentMetas } from "../nano-states";
import { $assets } from "~/shared/sync/data-stores";
import {
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $project,
  $props,
  $styleSourceSelections,
  $styleSources,
  $styles,
  $resources,
} from "~/shared/sync/data-stores";
import { registerContainers } from "../sync/sync-stores";
import { getInstancePath } from "@webstudio-is/project-build/runtime";
import { isFragmentContentModeCopyableProp } from "@webstudio-is/project-build/runtime";

const {
  getFragmentInstancesData,
  insertFragmentAssetsMutable,
  insertFragmentBreakpointsMutable,
} = fragmentTesting;

enableMapSet();
registerContainers();

$pages.set(createDefaultPages({ rootInstanceId: "" }));

const defaultMetasMap = new Map(
  Object.entries({ ...defaultMetas, ...coreMetas })
);
$registeredComponentMetas.set(defaultMetasMap);

const createFragment = (
  fragment: Partial<WebstudioFragment>
): WebstudioFragment => ({
  children: [],
  instances: [],
  styleSourceSelections: [],
  styleSources: [],
  breakpoints: [],
  styles: [],
  dataSources: [],
  resources: [],
  props: [],
  assets: [],
  ...fragment,
});

const createFakeComponentMetas = (
  itemMeta: Partial<WsComponentMeta>,
  anotherItemMeta?: Partial<WsComponentMeta>
): Map<string, WsComponentMeta> => {
  const base = {
    label: "",
    Icon: () => null,
  };
  const configs = {
    Item: { ...base, ...itemMeta },
    AnotherItem: { ...base, ...anotherItemMeta },
    Bold: base,
    Text: base,
    Form: base,
    Box: base,
    Div: base,
    Body: base,
  } as const;
  return new Map(Object.entries(configs)) as Map<string, WsComponentMeta>;
};

const getIdValuePair = <T extends { id: string }>(item: T) =>
  [item.id, item] as const;

const toMap = <T extends { id: string }>(list: T[]) =>
  new Map(list.map(getIdValuePair));

const setDataStores = (data: Omit<WebstudioData, "pages">) => {
  $instances.set(data.instances);
  $breakpoints.set(data.breakpoints);
  $styleSources.set(data.styleSources);
  $styles.set(data.styles);
  $styleSourceSelections.set(data.styleSourceSelections);
  $dataSources.set(data.dataSources);
  $props.set(data.props);
  $assets.set(data.assets);
  $resources.set(data.resources);
};

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): Instance => {
  return { type: "instance", id, component, children };
};

const createStyleDecl = (
  styleSourceId: string,
  breakpointId: string,
  property: StyleProperty,
  value: StyleValue | string
): StyleDecl => ({
  styleSourceId,
  breakpointId,
  property,
  value: typeof value === "string" ? { type: "unparsed", value } : value,
});

const createStyleDeclPair = (
  styleSourceId: string,
  breakpointId: string,
  property: StyleProperty,
  value: StyleValue | string
): [StyleDeclKey, StyleDecl] => [
  `${styleSourceId}:${breakpointId}:${property}:`,
  createStyleDecl(styleSourceId, breakpointId, property, value),
];

const createImageAsset = (id: string, name = "", projectId = ""): Asset => {
  return {
    id,
    type: "image",
    format: "",
    name,
    description: "",
    projectId,
    createdAt: "",
    size: 0,
    meta: { width: 0, height: 0 },
  };
};

const createFontAsset = (id: string, family: string): Asset => {
  return {
    id,
    type: "font",
    format: "woff",
    name: "",
    description: "",
    projectId: "",
    createdAt: "",
    size: 0,
    meta: { style: "normal", family, variationAxes: {} },
  };
};

describe("fragment copy helpers", () => {
  test("builds fragment instance maps and portal content roots", () => {
    const fragment = createFragment({
      instances: [
        createInstance("portal", portalComponent, [
          { type: "id", value: "portal-root" },
        ]),
        createInstance("portal-root", "Box", []),
      ],
    });

    const { fragmentInstances, portalContentRootIds } =
      getFragmentInstancesData(fragment);

    expect(Array.from(fragmentInstances.keys())).toEqual([
      "portal",
      "portal-root",
    ]);
    expect(portalContentRootIds).toEqual(new Set(["portal-root"]));
  });

  test("inserts fragment assets without overwriting existing assets", () => {
    const existingAsset = createImageAsset(
      "existing-asset",
      "Existing",
      "target-project"
    );
    const assets = new Map<Asset["id"], Asset>([
      [existingAsset.id, existingAsset],
    ]);

    insertFragmentAssetsMutable({
      fragment: createFragment({
        assets: [
          createImageAsset("existing-asset", "Source Existing", "source"),
          createImageAsset("new-asset", "New", "source"),
        ],
      }),
      projectId: "target-project",
      assets,
    });

    expect(assets.get("existing-asset")).toBe(existingAsset);
    expect(assets.get("new-asset")).toEqual({
      ...createImageAsset("new-asset", "New", "source"),
      projectId: "target-project",
    });
  });

  test("inserts fragment breakpoints and reports limit merges", () => {
    const baseBreakpoint: Breakpoint = { id: "base", label: "Base" };
    const breakpoints = new Map<Breakpoint["id"], Breakpoint>([
      [baseBreakpoint.id, baseBreakpoint],
    ]);
    let didMergeDueToLimit = false;

    const { mergedBreakpointIds } = insertFragmentBreakpointsMutable({
      fragment: createFragment({
        breakpoints: [
          baseBreakpoint,
          { id: "desktop", label: "Desktop", minWidth: 1024 },
        ],
      }),
      breakpoints,
      createId: () => "generated-breakpoint",
      onBreakpointLimitMerge: () => {
        didMergeDueToLimit = true;
      },
    });

    expect(mergedBreakpointIds.get("base")).toBe("base");
    expect(breakpoints.get("desktop")).toEqual({
      id: "desktop",
      label: "Desktop",
      minWidth: 1024,
    });
    expect(didMergeDueToLimit).toBe(false);
  });

  test("builds content-mode capabilities for fragment roots", () => {
    const registeredComponentMetas = $registeredComponentMetas.get();
    $registeredComponentMetas.set(
      createFakeComponentMetas({
        props: {
          href: {
            type: "string",
            control: "url",
            required: false,
            contentMode: true,
          },
        },
      })
    );
    try {
      const fragment = createFragment({
        children: [{ type: "id", value: "link" }],
        instances: [createInstance("link", "Item", [])],
        props: [
          {
            id: "href-prop",
            instanceId: "link",
            name: "href",
            type: "string",
            value: "/",
          },
        ],
      });
      const { fragmentInstances } = getFragmentInstancesData(fragment);

      const isCopyable = isFragmentContentModeCopyableProp({
        prop: fragment.props[0],
        fragment,
        fragmentInstances,
        styleSources: new Map(),
        metas: $registeredComponentMetas.get(),
      });

      expect(isCopyable).toBe(true);
    } finally {
      $registeredComponentMetas.set(registeredComponentMetas);
    }
  });
});

const getWebstudioDataStub = (
  data?: Partial<WebstudioData>
): WebstudioData => ({
  pages: createDefaultPages({ rootInstanceId: "" }),
  assets: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  instances: new Map(),
  props: new Map(),
  breakpoints: new Map(),
  styleSourceSelections: new Map(),
  styleSources: new Map(),
  styles: new Map(),
  ...data,
});

describe("extract webstudio fragment", () => {
  test("collect all styles and breakpoints bound to fragment instances", () => {
    // body
    //   box1
    //     box2
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    $styleSourceSelections.set(
      new Map([
        ["body", { instanceId: "box1", values: ["localBody", "token1"] }],
        ["box1", { instanceId: "box1", values: ["localBox1", "token2"] }],
        ["box2", { instanceId: "box2", values: ["localBox2", "token2"] }],
      ])
    );
    $styleSources.set(
      new Map([
        ["localBody", { id: "localBody", type: "local" }],
        ["localBox1", { id: "localBox1", type: "local" }],
        ["localBox2", { id: "localBox2", type: "local" }],
        ["token1", { id: "token1", type: "token", name: "token1" }],
        ["token2", { id: "token2", type: "token", name: "token2" }],
      ])
    );
    $styles.set(
      new Map([
        createStyleDeclPair("localBody1", "base", "color", "red"),
        createStyleDeclPair("localBox1", "base", "color", "green"),
        createStyleDeclPair("localBox2", "base", "color", "blue"),
        createStyleDeclPair("token1", "base", "color", "yellow"),
        createStyleDeclPair("token2", "base", "color", "orange"),
      ])
    );
    $breakpoints.set(
      new Map([
        ["base", { id: "base", label: "base" }],
        ["big", { id: "big", label: "big", minWidth: 768 }],
      ])
    );
    const { styleSources, styleSourceSelections, styles, breakpoints } =
      extractWebstudioFragment(getWebstudioData(), "box1");

    // exclude localBody and token1 bound to body
    expect(styleSources).toEqual([
      { id: "localBox1", type: "local" },
      { id: "token2", type: "token", name: "token2" },
      { id: "localBox2", type: "local" },
    ]);
    expect(styleSourceSelections).toEqual([
      { instanceId: "box1", values: ["localBox1", "token2"] },
      { instanceId: "box2", values: ["localBox2", "token2"] },
    ]);
    expect(styles).toEqual([
      createStyleDecl("localBox1", "base", "color", "green"),
      createStyleDecl("localBox2", "base", "color", "blue"),
      createStyleDecl("token2", "base", "color", "orange"),
    ]);
    expect(breakpoints).toEqual([{ id: "base", label: "base" }]);
  });

  test("collect assets from props and styles withiin fragment instances", () => {
    // body
    //   box1
    //     box2
    $instances.set(
      toMap([
        createInstance("body", "Body", [{ type: "id", value: "box1" }]),
        createInstance("box1", "Box", [{ type: "id", value: "box2" }]),
        createInstance("box2", "Box", []),
      ])
    );
    $props.set(
      new Map([
        [
          "bodyProp",
          {
            id: "bodyProp",
            instanceId: "body",
            name: "data-body",
            type: "asset",
            value: "asset1",
          },
        ],
        [
          "box1Prop",
          {
            id: "box1Prop",
            instanceId: "box1",
            name: "data-box1",
            type: "asset",
            value: "asset2",
          },
        ],
      ])
    );
    $styleSourceSelections.set(
      new Map([
        ["body", { instanceId: "box1", values: ["localBody"] }],
        ["box1", { instanceId: "box1", values: ["localBox1"] }],
      ])
    );
    $styleSources.set(
      new Map([
        ["localBody", { id: "localBody", type: "local" }],
        ["localBox1", { id: "localBox1", type: "local" }],
      ])
    );
    $styles.set(
      new Map([
        createStyleDeclPair("localBody1", "base", "fontFamily", {
          type: "fontFamily",
          value: ["font1"],
        }),
        createStyleDeclPair("localBody1", "base", "backgroundImage", {
          type: "image",
          value: { type: "asset", value: "asset3" },
        }),
        createStyleDeclPair("localBox1", "base", "fontFamily", {
          type: "fontFamily",
          value: ["font2"],
        }),
        createStyleDeclPair("localBox1", "base", "color", {
          type: "image",
          value: { type: "asset", value: "asset4" },
        }),
      ])
    );
    $breakpoints.set(new Map([["base", { id: "base", label: "base" }]]));
    $assets.set(
      toMap([
        createImageAsset("asset1"),
        createImageAsset("asset2"),
        createImageAsset("asset3"),
        createImageAsset("asset4"),
        createFontAsset("asset5", "font1"),
        createFontAsset("asset6", "font2"),
      ])
    );
    const { assets } = extractWebstudioFragment(getWebstudioData(), "box1");

    expect(assets).toEqual([
      createImageAsset("asset2"),
      createImageAsset("asset4"),
      createFontAsset("asset6", "font2"),
    ]);
  });
});

describe("insert webstudio fragment copy", () => {
  const emptyFragment = {
    children: [],
    instances: [
      {
        id: "body",
        type: "instance",
        component: "Body",
        children: [],
      } satisfies Instance,
    ],
    styleSourceSelections: [],
    styleSources: [],
    breakpoints: [],
    styles: [],
    dataSources: [],
    resources: [],
    props: [],
    assets: [],
  };

  $project.set({ id: "current_project" } as Project);

  beforeEach(() => {
    $assets.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $instances.set(new Map());
    $props.set(new Map());
    $dataSources.set(new Map());
  });

  test("duplicate shared slot child in shared slot content", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );

    const instancePath =
      getInstancePath(["div", "fragment", "slot1", "body"], data.instances) ??
      [];
    const selectedItem = instancePath[0];
    const parentItem = instancePath[1];
    if (selectedItem === undefined || parentItem === undefined) {
      throw Error("Expected selected and parent items");
    }

    const fragment = extractWebstudioFragment(data, selectedItem.instance.id);
    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: [],
      projectId: "current_project",
    });
    const newRootInstanceId = newInstanceIds.get(selectedItem.instance.id);
    if (newRootInstanceId === undefined) {
      throw Error("Expected duplicate instance id");
    }
    data.instances.get(parentItem.instance.id)?.children.splice(1, 0, {
      type: "id",
      value: newRootInstanceId,
    });

    expect(data.instances.get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("copy shared slot child outside keeps copy independent from slot content", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div"></ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );

    const fragment = extractWebstudioFragment(data, "div");
    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: [],
      projectId: "current_project",
    });
    const copiedDivId = newInstanceIds.get("div");
    if (copiedDivId === undefined) {
      throw Error("Expected copied instance id");
    }
    data.instances.get("body")?.children.push({
      type: "id",
      value: copiedDivId,
    });
    data.instances.get("fragment")?.children.push({
      type: "id",
      value: "newSlotChild",
    });
    data.instances.set("newSlotChild", {
      type: "instance",
      id: "newSlotChild",
      component: "Box",
      children: [],
    });

    expect(data.instances.get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
      { type: "id", value: "newSlotChild" },
    ]);
    expect(data.instances.get("body")?.children.at(-1)).toEqual({
      type: "id",
      value: copiedDivId,
    });
    expect(data.instances.get(copiedDivId)?.children).toEqual([]);
  });

  test("copy nested shared slot child outside keeps copy independent from slot content", () => {
    const data = renderData(
      <$.Body ws:id="body">
        <$.Slot ws:id="slot1">
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Box ws:id="box"></$.Box>
            </ws.element>
          </$.Fragment>
        </$.Slot>
        <$.Slot ws:id="slot2">
          {/* same ids */}
          <$.Fragment ws:id="fragment">
            <ws.element ws:tag="div" ws:id="div">
              <$.Box ws:id="box"></$.Box>
            </ws.element>
          </$.Fragment>
        </$.Slot>
      </$.Body>
    );

    const fragment = extractWebstudioFragment(data, "box");
    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: [],
      projectId: "current_project",
    });
    const copiedBoxId = newInstanceIds.get("box");
    if (copiedBoxId === undefined) {
      throw Error("Expected copied instance id");
    }
    data.instances.get("body")?.children.push({
      type: "id",
      value: copiedBoxId,
    });
    data.instances.get("div")?.children.push({
      type: "id",
      value: "newSlotChild",
    });
    data.instances.set("newSlotChild", {
      type: "instance",
      id: "newSlotChild",
      component: "Box",
      children: [],
    });

    expect(data.instances.get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect(data.instances.get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect(data.instances.get("div")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "newSlotChild" },
    ]);
    expect(data.instances.get("body")?.children.at(-1)).toEqual({
      type: "id",
      value: copiedBoxId,
    });
    expect(data.instances.get(copiedBoxId)?.children).toEqual([]);
  });

  test("insert assets with same ids if missing", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        assets: [createImageAsset("asset1", "name", "another_project")],
      },
      availableVariables: [],
      projectId: "current_project",
    });
    expect(Array.from(data.assets.values())).toEqual([
      createImageAsset("asset1", "name", "current_project"),
    ]);

    data.assets = toMap([
      createImageAsset("asset1", "changed_name", "current_project"),
    ]);
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        assets: [
          createImageAsset("asset1", "name", "another_project"),
          createImageAsset("asset2", "another_name", "another_project"),
        ],
      },
      availableVariables: [],
      projectId: "current_project",
    });
    expect(Array.from(data.assets.values())).toEqual([
      // preserve any user changes
      createImageAsset("asset1", "changed_name", "current_project"),
      // add new assets while preserving old ones
      createImageAsset("asset2", "another_name", "current_project"),
    ]);
  });

  test("copies local styles with new ids and reuses existing token styles in content mode", () => {
    const localStyleSource: StyleSource = { type: "local", id: "localBox" };
    const unsupportedLocalStyleSource: StyleSource = {
      type: "local",
      id: "unsupportedLocal",
    };
    const tokenStyleSource: StyleSource = {
      type: "token",
      id: "token",
      name: "Token",
    };
    const style = createStyleDecl("localBox", "base", "color", "red");
    const unsupportedBreakpointStyle = createStyleDecl(
      "localBox",
      "desktop",
      "backgroundColor",
      "blue"
    );
    const unsupportedLocalStyle = createStyleDecl(
      "unsupportedLocal",
      "desktop",
      "color",
      "green"
    );
    const data = getWebstudioDataStub({
      breakpoints: toMap<Breakpoint>([{ id: "base", label: "Base" }]),
      instances: toMap([
        createInstance("body", "Body", []),
        createInstance("templateBox", "Box", []),
      ]),
      styleSources: toMap([
        localStyleSource,
        unsupportedLocalStyleSource,
        tokenStyleSource,
      ]),
      styleSourceSelections: new Map([
        [
          "templateBox",
          {
            instanceId: "templateBox",
            values: ["localBox", "unsupportedLocal", "token"],
          },
        ],
      ]),
      styles: new Map([
        [getStyleDeclKey(style), style],
        [
          getStyleDeclKey(unsupportedBreakpointStyle),
          unsupportedBreakpointStyle,
        ],
        [getStyleDeclKey(unsupportedLocalStyle), unsupportedLocalStyle],
      ]),
    });
    const fragment = createFragment({
      children: [{ type: "id", value: "templateBox" }],
      instances: [createInstance("templateBox", "Box", [])],
      styleSources: [
        localStyleSource,
        unsupportedLocalStyleSource,
        tokenStyleSource,
      ],
      styleSourceSelections: [
        {
          instanceId: "templateBox",
          values: ["localBox", "unsupportedLocal", "token"],
        },
      ],
      styles: [style, unsupportedBreakpointStyle, unsupportedLocalStyle],
    });

    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: [],
      projectId: "current_project",
      metas: defaultMetasMap,
      contentMode: true,
      contentModeCopyableProp: isFragmentContentModeCopyableProp,
    });
    const newInstanceId = newInstanceIds.get("templateBox");

    expect(newInstanceId).toBeDefined();
    const selection = data.styleSourceSelections.get(newInstanceId ?? "");
    expect(selection).toEqual({
      instanceId: newInstanceId,
      values: [expect.any(String), "token"],
    });
    const newLocalStyleSourceId = selection?.values[0];
    expect(newLocalStyleSourceId).not.toBe("localBox");
    expect(data.styleSources.get(newLocalStyleSourceId ?? "")).toEqual({
      type: "local",
      id: newLocalStyleSourceId,
    });
    expect(data.styles.get(getStyleDeclKey(style))).toEqual(style);
    expect(
      data.styles.get(
        getStyleDeclKey({
          ...style,
          styleSourceId: newLocalStyleSourceId ?? "",
        })
      )
    ).toEqual({ ...style, styleSourceId: newLocalStyleSourceId });
    expect(
      data.styles.has(
        getStyleDeclKey({
          ...unsupportedBreakpointStyle,
          styleSourceId: newLocalStyleSourceId ?? "",
        })
      )
    ).toBe(false);
    expect(
      Array.from(data.styleSources.values()).some(
        (styleSource) =>
          styleSource.type === "local" &&
          styleSource.id !== "localBox" &&
          styleSource.id !== "unsupportedLocal" &&
          styleSource.id !== newLocalStyleSourceId
      )
    ).toBe(false);
  });

  test("copies assets and asset props in content mode", () => {
    const asset = createImageAsset("asset", "Template image", "source_project");
    const data = getWebstudioDataStub();
    $registeredComponentMetas.set(
      new Map([
        ...defaultMetasMap,
        [
          "Item",
          {
            label: "Item",
            icon: "",
            props: {
              image: {
                type: "string",
                control: "text",
                required: false,
                contentMode: true,
              },
            },
          } satisfies WsComponentMeta,
        ],
      ])
    );
    const fragment = createFragment({
      children: [{ type: "id", value: "item" }],
      instances: [createInstance("item", "Item", [])],
      props: [
        {
          id: "image",
          instanceId: "item",
          name: "image",
          type: "asset",
          value: "asset",
        },
      ],
      assets: [asset],
    });

    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: [],
      projectId: "current_project",
      metas: $registeredComponentMetas.get(),
      contentMode: true,
      contentModeCopyableProp: isFragmentContentModeCopyableProp,
    });
    const newInstanceId = newInstanceIds.get("item");

    expect(data.assets.get("asset")).toEqual({
      ...asset,
      projectId: "current_project",
    });
    expect(Array.from(data.props.values())).toEqual([
      expect.objectContaining({
        instanceId: newInstanceId,
        name: "image",
        type: "asset",
        value: "asset",
      }),
    ]);
  });

  test("copies tag-derived content mode props for generic elements", () => {
    const data = getWebstudioDataStub();
    const fragment = createFragment({
      children: [{ type: "id", value: "image" }],
      instances: [
        {
          type: "instance",
          id: "image",
          component: elementComponent,
          tag: "img",
          children: [],
        },
      ],
      props: [
        {
          id: "alt",
          instanceId: "image",
          name: "alt",
          type: "string",
          value: "Description",
        },
        {
          id: "class",
          instanceId: "image",
          name: "class",
          type: "string",
          value: "card",
        },
      ],
    });

    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableVariables: [],
      projectId: "current_project",
      metas: defaultMetasMap,
      contentMode: true,
      contentModeCopyableProp: isFragmentContentModeCopyableProp,
    });
    const newInstanceId = newInstanceIds.get("image");

    expect(newInstanceId).toBeDefined();
    expect(Array.from(data.props.values())).toEqual([
      expect.objectContaining({
        instanceId: newInstanceId,
        name: "alt",
        type: "string",
        value: "Description",
      }),
    ]);
  });

  test("merge breakpoints with existing ones", () => {
    const breakpoints = toMap<Breakpoint>([
      { id: "existing_base", label: "base" },
      { id: "existing_small", label: "small", minWidth: 768 },
    ]);
    const data = getWebstudioDataStub({ breakpoints });
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [
          { id: "new_base", label: "Base" },
          {
            id: "new_small",
            label: "Small",
            minWidth: 768,
          },
          {
            id: "new_large",
            label: "Large",
            minWidth: 1200,
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });
    expect(Array.from(data.breakpoints.values())).toEqual([
      { id: "existing_base", label: "base" },
      { id: "existing_small", label: "small", minWidth: 768 },
      { id: "new_large", label: "Large", minWidth: 1200 },
    ]);
  });

  test("reports breakpoint limit merge once when inserting fragment", () => {
    const breakpoints = toMap<Breakpoint>([
      { id: "base", label: "base" },
      { id: "0", label: "320", maxWidth: 320 },
      { id: "1", label: "480", maxWidth: 480 },
      { id: "2", label: "768", maxWidth: 768 },
      { id: "3", label: "1024", maxWidth: 1024 },
      { id: "4", label: "1280", minWidth: 1280 },
      { id: "5", label: "1440", minWidth: 1440 },
      { id: "6", label: "1920", minWidth: 1920 },
      { id: "7", label: "2560", minWidth: 2560 },
    ]);
    const data = getWebstudioDataStub({ breakpoints });
    let mergeCount = 0;

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [
          { id: "new_medium", label: "Medium", minWidth: 1500 },
          { id: "new_large", label: "Large", minWidth: 1700 },
        ],
      },
      availableVariables: [],
      projectId: "",
      onBreakpointLimitMerge: () => {
        mergeCount += 1;
      },
    });

    expect(mergeCount).toBe(1);
  });

  // Case 2: Same styles AND same name -> reuse existing token
  test("token with same styles and same name reuses existing token", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);
    const styles = new Map([
      createStyleDeclPair("existingToken", "base", "color", {
        type: "keyword",
        value: "red",
      }),
      createStyleDeclPair("existingToken", "base", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Same name "primaryColor", same styles, different id
          { id: "newToken", type: "token", name: "primaryColor" },
        ],
        styles: [
          {
            styleSourceId: "newToken",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "newToken",
            breakpointId: "base",
            property: "fontSize",
            value: { type: "unit", value: 16, unit: "px" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should reuse existing token, not create a new one
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);
    // No new styles should be added
    expect(Array.from(data.styles.values())).toEqual([
      {
        styleSourceId: "existingToken",
        breakpointId: "base",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
      {
        styleSourceId: "existingToken",
        breakpointId: "base",
        property: "fontSize",
        value: { type: "unit", value: 16, unit: "px" },
      },
    ]);
  });

  // Case 3: Same styles but different name -> insert new token with original name
  test("token with same styles but different name inserts new token", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "primaryColor" },
    ]);
    const styles = new Map([
      createStyleDeclPair("token1", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Different name "accentColor", same styles
          { id: "token2", type: "token", name: "accentColor" },
        ],
        styles: [
          {
            styleSourceId: "token2",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should insert new token with its original name
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({
      id: "token1",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toMatchObject({ type: "token", name: "accentColor" });
    expect(tokens[1].id).not.toBe("token2"); // Should have new ID

    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(2);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "token1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
    expect(tokenStyles[1]).toMatchObject({
      styleSourceId: tokens[1].id, // Should reference new token ID
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
  });

  // Case 4: Different styles but same name -> add counter suffix
  test("token with different styles but same name adds counter suffix", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "myToken" },
    ]);
    const styles = new Map([
      createStyleDeclPair("token1", "base", "color", {
        type: "keyword",
        value: "blue",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Same name "myToken", different styles
          { id: "token2", type: "token", name: "myToken" },
        ],
        styles: [
          {
            styleSourceId: "token2",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should add counter suffix to the new token
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({ id: "token1", type: "token", name: "myToken" });
    expect(tokens[1]).toMatchObject({ type: "token", name: "myToken-1" });
    expect(tokens[1].id).not.toBe("token2"); // Should have new ID

    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(2);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "token1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    expect(tokenStyles[1]).toMatchObject({
      styleSourceId: tokens[1].id,
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
  });

  // Case 4b: Multiple counter suffixes
  test("token with name conflict increments counter correctly", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "myToken" },
      { id: "token2", type: "token", name: "myToken-1" },
      { id: "token3", type: "token", name: "myToken-2" },
    ]);
    const styles = new Map([
      createStyleDeclPair("token1", "base", "color", {
        type: "keyword",
        value: "blue",
      }),
      createStyleDeclPair("token2", "base", "color", {
        type: "keyword",
        value: "green",
      }),
      createStyleDeclPair("token3", "base", "color", {
        type: "keyword",
        value: "yellow",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [{ id: "token4", type: "token", name: "myToken" }],
        styles: [
          {
            styleSourceId: "token4",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should use counter 3
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(4);
    expect(tokens[0]).toEqual({ id: "token1", type: "token", name: "myToken" });
    expect(tokens[1]).toEqual({
      id: "token2",
      type: "token",
      name: "myToken-1",
    });
    expect(tokens[2]).toEqual({
      id: "token3",
      type: "token",
      name: "myToken-2",
    });
    expect(tokens[3]).toMatchObject({ type: "token", name: "myToken-3" });
    expect(tokens[3].id).not.toBe("token4"); // Should have new ID
  });

  // Case 6: Different styles and different name -> insert as-is
  test("token with different styles and different name inserts normally", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "primaryColor" },
    ]);
    const styles = new Map([
      createStyleDeclPair("token1", "base", "color", {
        type: "keyword",
        value: "blue",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [{ id: "token2", type: "token", name: "secondaryColor" }],
        styles: [
          {
            styleSourceId: "token2",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should insert new token normally
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({
      id: "token1",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toMatchObject({ type: "token", name: "secondaryColor" });
    expect(tokens[1].id).not.toBe("token2"); // Should have new ID

    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(2);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "token1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    expect(tokenStyles[1]).toMatchObject({
      styleSourceId: tokens[1].id,
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
  });

  // Test that instance with matching token gets the token reference updated
  test("instance with reused token updates styleSourceSelection to existing token id", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);
    const styles = new Map([
      createStyleDeclPair("existingToken", "base", "color", {
        type: "keyword",
        value: "red",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: "box",
            component: "Box",
            children: [],
          },
        ],
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Same name and same styles as existingToken
          { id: "newToken", type: "token", name: "primaryColor" },
        ],
        styleSourceSelections: [{ instanceId: "box", values: ["newToken"] }],
        styles: [
          {
            styleSourceId: "newToken",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should reuse existing token
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);

    // The instance should reference the existing token, not the new one
    const newBoxId = Array.from(data.instances.keys())[0];
    expect(data.styleSourceSelections.get(newBoxId)).toEqual({
      instanceId: newBoxId,
      values: ["existingToken"], // Should use existing token id, not "newToken"
    });
  });

  // Case 3 safeguard: Same styles but different name gets suffix when name conflicts
  test("token with same styles but different name adds suffix when name already exists", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "primaryColor" },
      { id: "token2", type: "token", name: "accentColor" }, // This name is taken
    ]);
    const styles = new Map([
      createStyleDeclPair("token1", "base", "color", {
        type: "keyword",
        value: "red",
      }),
      createStyleDeclPair("token2", "base", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Same styles as token1, but wants to use name "accentColor" which is already taken
          { id: "token3", type: "token", name: "accentColor" },
        ],
        styles: [
          {
            styleSourceId: "token3",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should add counter suffix to prevent duplicate name
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({
      id: "token1",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toEqual({
      id: "token2",
      type: "token",
      name: "accentColor",
    });
    expect(tokens[2]).toMatchObject({ type: "token", name: "accentColor-1" });
    expect(tokens[2].id).not.toBe("token3"); // Should have new ID

    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(3);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "token1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
    expect(tokenStyles[1]).toEqual({
      styleSourceId: "token2",
      breakpointId: "base",
      property: "fontSize",
      value: { type: "unit", value: 16, unit: "px" },
    });
    expect(tokenStyles[2]).toMatchObject({
      styleSourceId: tokens[2].id,
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
  });

  // Case 6 safeguard: Different styles and different name gets suffix when name conflicts
  test("token with different styles and name adds suffix when name already exists", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "token1", type: "token", name: "primaryColor" },
      { id: "token2", type: "token", name: "secondaryColor" }, // This name is taken
    ]);
    const styles = new Map([
      createStyleDeclPair("token1", "base", "color", {
        type: "keyword",
        value: "blue",
      }),
      createStyleDeclPair("token2", "base", "color", {
        type: "keyword",
        value: "green",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Different styles from both existing tokens, but wants name "secondaryColor"
          { id: "token3", type: "token", name: "secondaryColor" },
        ],
        styles: [
          {
            styleSourceId: "token3",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should add counter suffix to prevent duplicate name
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({
      id: "token1",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toEqual({
      id: "token2",
      type: "token",
      name: "secondaryColor",
    });
    expect(tokens[2]).toMatchObject({
      type: "token",
      name: "secondaryColor-1",
    });
    expect(tokens[2].id).not.toBe("token3"); // Should have new ID

    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(3);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "token1",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    expect(tokenStyles[1]).toEqual({
      styleSourceId: "token2",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "green" },
    });
    expect(tokenStyles[2]).toMatchObject({
      styleSourceId: tokens[2].id,
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
  });

  // Test that existing token with same styles but different name stays untouched
  test("existing token with matching styles but different name stays untouched when inserting new token", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "primaryColor" },
    ]);
    const styles = new Map([
      createStyleDeclPair("existingToken", "base", "color", {
        type: "keyword",
        value: "red",
      }),
      createStyleDeclPair("existingToken", "base", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Different name "accentColor", same styles as existingToken
          { id: "newToken", type: "token", name: "accentColor" },
        ],
        styles: [
          {
            styleSourceId: "newToken",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "newToken",
            breakpointId: "base",
            property: "fontSize",
            value: { type: "unit", value: 16, unit: "px" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should insert new token with its own name, leaving existing one untouched
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({
      id: "existingToken",
      type: "token",
      name: "primaryColor",
    });
    expect(tokens[1]).toMatchObject({ type: "token", name: "accentColor" });
    expect(tokens[1].id).not.toBe("newToken"); // Should have new ID

    // Both tokens should have their own styles
    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(4);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "existingToken",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
    expect(tokenStyles[1]).toEqual({
      styleSourceId: "existingToken",
      breakpointId: "base",
      property: "fontSize",
      value: { type: "unit", value: 16, unit: "px" },
    });
    expect(tokenStyles[2]).toMatchObject({
      styleSourceId: tokens[1].id,
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "red" },
    });
    expect(tokenStyles[3]).toMatchObject({
      styleSourceId: tokens[1].id,
      breakpointId: "base",
      property: "fontSize",
      value: { type: "unit", value: 16, unit: "px" },
    });
  });

  // Critical test: inserting base name when suffixed version exists
  test("inserting token 'bbb' when 'bbb-1' with same styles exists inserts both tokens", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "bbb-1" },
    ]);
    const styles = new Map([
      createStyleDeclPair("existingToken", "base", "color", {
        type: "keyword",
        value: "blue",
      }),
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources, styles });

    // Add an instance that uses the existing token
    const existingInstance = createInstance("existingInstance", "Box", []);
    data.instances.set("existingInstance", existingInstance);
    data.styleSourceSelections.set("existingInstance", {
      instanceId: "existingInstance",
      values: ["existingToken"],
    });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: "box",
            component: "Box",
            children: [],
          },
        ],
        breakpoints: [{ id: "base", label: "base" }],
        styleSources: [
          // Inserting "bbb" with same styles as "bbb-1"
          { id: "newToken", type: "token", name: "bbb" },
        ],
        styleSourceSelections: [{ instanceId: "box", values: ["newToken"] }],
        styles: [
          {
            styleSourceId: "newToken",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "blue" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Both tokens should exist
    const tokens = Array.from(data.styleSources.values());
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({
      id: "existingToken",
      type: "token",
      name: "bbb-1",
    });
    expect(tokens[1]).toMatchObject({ type: "token", name: "bbb" }); // Different name, so inserted as-is
    expect(tokens[1].id).not.toBe("newToken"); // Should have new ID

    // Both should have their own styles
    const tokenStyles = Array.from(data.styles.values());
    expect(tokenStyles).toHaveLength(2);
    expect(tokenStyles[0]).toEqual({
      styleSourceId: "existingToken",
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });
    expect(tokenStyles[1]).toMatchObject({
      styleSourceId: tokens[1].id,
      breakpointId: "base",
      property: "color",
      value: { type: "keyword", value: "blue" },
    });

    // The EXISTING instance should still reference "bbb-1" (existingToken)
    expect(data.styleSourceSelections.get("existingInstance")).toEqual({
      instanceId: "existingInstance",
      values: ["existingToken"],
    });

    // The new instance should reference the new token "bbb" (tokens[1].id)
    const newBoxId = Array.from(data.instances.keys()).find(
      (id) => id !== "existingInstance"
    );
    expect(data.styleSourceSelections.get(newBoxId!)).toEqual({
      instanceId: newBoxId,
      values: [tokens[1].id],
    });
  });

  test("insert local styles with new ids and use merged breakpoint ids", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const data = getWebstudioDataStub({ breakpoints });
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: "box",
            component: "Box",
            children: [],
          },
        ],
        breakpoints: [{ id: "new_base", label: "Base" }],
        styleSourceSelections: [
          { instanceId: "box", values: ["localId", "tokenId"] },
          { instanceId: "unknown", values: [] },
        ],
        styleSources: [{ id: "localId", type: "local" }],
        styles: [
          {
            styleSourceId: "localId",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "tokenId",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "green" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });
    expect(Array.from(data.styleSourceSelections.values())).toEqual([
      {
        instanceId: expect.not.stringMatching("box"),
        values: [expect.not.stringMatching("localId"), "tokenId"],
      },
    ]);
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: expect.not.stringMatching("localId"), type: "local" },
    ]);
    expect(Array.from(data.styles.values())).toEqual([
      {
        styleSourceId: expect.not.stringMatching("localId"),
        breakpointId: "base",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("insert local styles from portal and use merged breakpoint ids", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const data = getWebstudioDataStub({ breakpoints });
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        // portal
        //   fragment
        instances: [
          {
            type: "instance",
            id: "portal",
            component: portalComponent,
            children: [{ type: "id", value: "fragment" }],
          },
          {
            type: "instance",
            id: "fragment",
            component: "Fragment",
            children: [{ type: "id", value: "box" }],
          },
        ],
        breakpoints: [{ id: "new_base", label: "Base" }],
        styleSourceSelections: [
          { instanceId: "fragment", values: ["localId", "tokenId"] },
          { instanceId: "unknown", values: [] },
        ],
        styleSources: [{ id: "localId", type: "local" }],
        styles: [
          {
            styleSourceId: "localId",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "tokenId",
            breakpointId: "new_base",
            property: "color",
            value: { type: "keyword", value: "green" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });
    expect(Array.from(data.styleSourceSelections.values())).toEqual([
      { instanceId: "fragment", values: ["localId", "tokenId"] },
    ]);
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: "localId", type: "local" },
    ]);
    expect(Array.from(data.styles.values())).toEqual([
      {
        styleSourceId: "localId",
        breakpointId: "base",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("merge local styles into existing ROOT_INSTANCE_ID local source", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "existingLocal", type: "local" },
    ]);
    const styleSourceSelections = new Map([
      [
        ROOT_INSTANCE_ID,
        { instanceId: ROOT_INSTANCE_ID, values: ["existingLocal"] },
      ],
    ]);
    const styles = new Map([
      createStyleDeclPair("existingLocal", "base", "fontSize", {
        type: "unit",
        value: 16,
        unit: "px",
      }),
    ]);
    const data = getWebstudioDataStub({
      breakpoints,
      styleSources,
      styleSourceSelections,
      styles,
    });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: ROOT_INSTANCE_ID,
            component: "Body",
            children: [],
          },
        ],
        breakpoints: [{ id: "base", label: "base" }],
        styleSourceSelections: [
          { instanceId: ROOT_INSTANCE_ID, values: ["newLocal"] },
        ],
        styleSources: [{ id: "newLocal", type: "local" }],
        styles: [
          {
            styleSourceId: "newLocal",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should merge into existing local source
    expect(Array.from(data.styleSources.values())).toEqual([
      { id: "existingLocal", type: "local" },
    ]);
    expect(data.styleSourceSelections.get(ROOT_INSTANCE_ID)).toEqual({
      instanceId: ROOT_INSTANCE_ID,
      values: ["existingLocal"],
    });
    // Both styles should be present under the same source
    expect(Array.from(data.styles.values())).toEqual([
      {
        styleSourceId: "existingLocal",
        breakpointId: "base",
        property: "fontSize",
        value: { type: "unit", value: 16, unit: "px" },
      },
      {
        styleSourceId: "existingLocal",
        breakpointId: "base",
        property: "color",
        value: { type: "keyword", value: "red" },
      },
    ]);
  });

  test("insert instances with new ids and update child references", () => {
    const data = getWebstudioDataStub();
    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: "parent",
            component: "Box",
            children: [
              { type: "id", value: "child1" },
              { type: "id", value: "child2" },
            ],
          },
          {
            type: "instance",
            id: "child1",
            component: "Text",
            children: [],
          },
          {
            type: "instance",
            id: "child2",
            component: "Text",
            children: [],
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    const newInstances = Array.from(data.instances.values());
    expect(newInstances).toHaveLength(3);

    const parentInstance = newInstances.find((i) => i.component === "Box");
    const childInstances = newInstances.filter((i) => i.component === "Text");

    expect(parentInstance).toBeDefined();
    expect(childInstances).toHaveLength(2);

    // Verify parent's children reference the new child ids
    expect(parentInstance?.children).toEqual([
      { type: "id", value: childInstances[0].id },
      { type: "id", value: childInstances[1].id },
    ]);

    // Verify new ids were generated (not same as original)
    expect(parentInstance?.id).not.toBe("parent");
    expect(childInstances[0].id).not.toBe("child1");
    expect(childInstances[1].id).not.toBe("child2");
  });

  test("skip portal content that already exists", () => {
    const instances = new Map([
      [
        "existingPortalContent",
        {
          type: "instance" as const,
          id: "existingPortalContent",
          component: "Box",
          children: [{ type: "text" as const, value: "existing" }],
        },
      ],
    ]);
    const data = getWebstudioDataStub({ instances });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: "portal",
            component: portalComponent,
            children: [{ type: "id", value: "existingPortalContent" }],
          },
          {
            type: "instance",
            id: "existingPortalContent",
            component: "Box",
            children: [{ type: "text", value: "new version" }],
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should preserve existing portal content
    const existingInstance = data.instances.get("existingPortalContent");
    expect(existingInstance?.children).toEqual([
      { type: "text", value: "existing" },
    ]);
  });

  test("insert instance with expression child and update variable references", () => {
    const data = getWebstudioDataStub();

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: "box",
            component: "Box",
            children: [{ type: "expression", value: "$ws$dataSource$oldVar" }],
          },
        ],
        dataSources: [
          {
            id: "oldVar",
            scopeInstanceId: "box",
            type: "variable",
            name: "myVar",
            value: { type: "string", value: "hello" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    const newBoxId = Array.from(data.instances.keys())[0];
    const newBox = data.instances.get(newBoxId);
    const newVarId = Array.from(data.dataSources.keys())[0];

    // Verify the expression was updated with the new variable id
    expect(newBox?.children[0].type).toBe("expression");
    if (newBox?.children[0].type === "expression") {
      // The encoding replaces - with __DASH__
      const encodedId = newVarId.replace(/-/g, "__DASH__");
      expect(newBox.children[0].value).toBe(`$ws$dataSource$${encodedId}`);
    }
    expect(newVarId).not.toBe("oldVar");
  });

  test("skip global variables that already exist by id", () => {
    const dataSources = new Map([
      [
        "globalVar1",
        {
          id: "globalVar1",
          scopeInstanceId: ROOT_INSTANCE_ID,
          type: "variable" as const,
          name: "Global Var",
          value: { type: "string" as const, value: "existing" },
        },
      ],
    ]);
    const data = getWebstudioDataStub({ dataSources });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        dataSources: [
          {
            id: "globalVar1",
            scopeInstanceId: ROOT_INSTANCE_ID,
            type: "variable",
            name: "Global Var",
            value: { type: "string", value: "new value" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    // Should preserve existing global variable
    const existingVar = data.dataSources.get("globalVar1");
    expect(existingVar?.type).toBe("variable");
    if (existingVar?.type === "variable") {
      expect(existingVar.value).toEqual({
        type: "string",
        value: "existing",
      });
    }
  });

  test("skip global variables that have conflicting names with availableVariables", () => {
    const data = getWebstudioDataStub();

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        dataSources: [
          {
            id: "newGlobal",
            scopeInstanceId: ROOT_INSTANCE_ID,
            type: "variable",
            name: "conflictingName",
            value: { type: "string", value: "value" },
          },
        ],
      },
      availableVariables: [
        {
          id: "existingId",
          scopeInstanceId: ROOT_INSTANCE_ID,
          type: "variable",
          name: "conflictingName",
          value: { type: "string", value: "existing" },
        },
      ],
      projectId: "",
    });

    // Should not insert the global variable due to name conflict
    expect(data.dataSources.has("newGlobal")).toBe(false);
  });

  test("handle mixed token and local style sources in styleSourceSelections", () => {
    const breakpoints = toMap<Breakpoint>([{ id: "base", label: "base" }]);
    const styleSources = toMap<StyleSource>([
      { id: "existingToken", type: "token", name: "Primary" },
    ]);
    const data = getWebstudioDataStub({ breakpoints, styleSources });

    insertWebstudioFragmentCopy({
      data,
      fragment: {
        ...emptyFragment,
        instances: [
          {
            type: "instance",
            id: "box",
            component: "Box",
            children: [],
          },
        ],
        breakpoints: [{ id: "base", label: "base" }],
        styleSourceSelections: [
          {
            instanceId: "box",
            values: ["localStyle1", "existingToken", "localStyle2"],
          },
        ],
        styleSources: [
          { id: "localStyle1", type: "local" },
          { id: "localStyle2", type: "local" },
        ],
        styles: [
          {
            styleSourceId: "localStyle1",
            breakpointId: "base",
            property: "color",
            value: { type: "keyword", value: "red" },
          },
          {
            styleSourceId: "localStyle2",
            breakpointId: "base",
            property: "fontSize",
            value: { type: "unit", value: 16, unit: "px" },
          },
        ],
      },
      availableVariables: [],
      projectId: "",
    });

    const newBoxId = Array.from(data.instances.keys())[0];
    const selection = data.styleSourceSelections.get(newBoxId);

    expect(selection?.values).toHaveLength(3);
    expect(selection?.values[1]).toBe("existingToken"); // Token preserved
    expect(selection?.values[0]).not.toBe("localStyle1"); // Local regenerated
    expect(selection?.values[2]).not.toBe("localStyle2"); // Local regenerated

    // Verify both local styles were created with new ids
    const localStyles = Array.from(data.styleSources.values()).filter(
      (s) => s.type === "local"
    );
    expect(localStyles).toHaveLength(2);
  });
});

describe("detectPageTokenConflicts", () => {
  beforeEach(() => {
    $project.set({ id: "project-id" } as Project);
  });

  test("detectFragmentTokenConflicts returns token style conflicts", () => {
    const targetData = renderData(
      <$.Body ws:id="body">
        <$.Box
          ws:id="existing-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: blue;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );
    setDataStores(targetData);
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));

    const sourceData = renderData(
      <$.Body ws:id="source-body">
        <$.Box
          ws:id="source-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: red;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );

    const conflicts = detectFragmentTokenConflicts({
      fragment: extractWebstudioFragment(sourceData, "source-box"),
      targetData: {
        ...targetData,
        pages: createDefaultPages({ rootInstanceId: "body" }),
      },
    });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.existingToken.name).toBe("primary");
    expect(conflicts[0]?.fragmentToken.name).toBe("primary");
  });

  test("returns empty array when no conflicts exist", () => {
    // Set up target project data (no tokens)
    const targetData = renderData(
      <$.Body ws:id="body">
        <$.Box ws:id="existing-box"></$.Box>
      </$.Body>
    );
    setDataStores(targetData);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);

    // Create source data with a token
    const sourceData = renderData(
      <$.Body ws:id="source-body">
        <$.Box
          ws:id="source-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: red;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );
    const sourcePages = createDefaultPages({ rootInstanceId: "source-body" });
    const sourceWebstudioData: WebstudioData = {
      ...sourceData,
      pages: sourcePages,
    };

    const conflicts = detectPageTokenConflicts({
      sourceData: sourceWebstudioData,
      targetData: { ...targetData, pages },
      pageId: sourcePages.homePageId,
    });

    // No conflicts
    expect(conflicts).toEqual([]);
  });

  test("returns conflicts when token conflicts exist", () => {
    // Set up target project with a "primary" token
    const targetData = renderData(
      <$.Body ws:id="body">
        <$.Box
          ws:id="existing-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: blue;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );
    setDataStores(targetData);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);

    // Create source data with same "primary" token but different styles
    const sourceData = renderData(
      <$.Body ws:id="source-body">
        <$.Box
          ws:id="source-box"
          ws:tokens={[
            token(
              "primary",
              css`
                color: red;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );
    const sourcePages = createDefaultPages({ rootInstanceId: "source-body" });
    const sourceWebstudioData: WebstudioData = {
      ...sourceData,
      pages: sourcePages,
    };

    const conflicts = detectPageTokenConflicts({
      sourceData: sourceWebstudioData,
      targetData: { ...targetData, pages },
      pageId: sourcePages.homePageId,
    });

    // Should return conflicts
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].tokenName).toBe("primary");
  });

  test("detects conflicts from ROOT_INSTANCE tokens", () => {
    // Set up target project with a "header" token
    const targetData = renderData(
      <$.Body ws:id="body">
        <$.Box
          ws:id="existing-box"
          ws:tokens={[
            token(
              "header",
              css`
                background: white;
              `
            ),
          ]}
        ></$.Box>
      </$.Body>
    );
    setDataStores(targetData);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);

    // Create source data with a ROOT_INSTANCE that has conflicting "header" token
    const sourceBodyData = renderData(
      <$.Body ws:id="source-body">
        <$.Box ws:id="source-box"></$.Box>
      </$.Body>
    );
    // Add a global "header" token with different styles (simulating ROOT_INSTANCE content)
    const headerTokenId = "header-token-id";
    sourceBodyData.styleSources.set(headerTokenId, {
      type: "token",
      id: headerTokenId,
      name: "header",
    });
    const baseBreakpointId = Array.from(
      sourceBodyData.breakpoints.values()
    ).find((b) => b.minWidth === undefined)?.id;
    if (baseBreakpointId) {
      sourceBodyData.styles.set(`${headerTokenId}:base:backgroundColor`, {
        styleSourceId: headerTokenId,
        breakpointId: baseBreakpointId,
        property: "backgroundColor",
        value: { type: "keyword", value: "black" },
      });
    }
    // Add ROOT_INSTANCE with the header token
    sourceBodyData.instances.set(ROOT_INSTANCE_ID, {
      type: "instance",
      id: ROOT_INSTANCE_ID,
      component: "Box",
      children: [],
    });
    sourceBodyData.styleSourceSelections.set(ROOT_INSTANCE_ID, {
      instanceId: ROOT_INSTANCE_ID,
      values: [headerTokenId],
    });

    const sourcePages = createDefaultPages({ rootInstanceId: "source-body" });
    const sourceWebstudioData: WebstudioData = {
      ...sourceBodyData,
      pages: sourcePages,
    };

    const conflicts = detectPageTokenConflicts({
      sourceData: sourceWebstudioData,
      targetData: { ...targetData, pages },
      pageId: sourcePages.homePageId,
    });

    // Should detect conflict from ROOT_INSTANCE token
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].tokenName).toBe("header");
  });

  test("throws error when page not found", () => {
    const targetData = renderData(<$.Body ws:id="body"></$.Body>);
    setDataStores(targetData);
    const pages = createDefaultPages({ rootInstanceId: "body" });
    $pages.set(pages);

    const sourceData = renderData(<$.Body ws:id="source-body"></$.Body>);
    const sourcePages = createDefaultPages({ rootInstanceId: "source-body" });
    const sourceWebstudioData: WebstudioData = {
      ...sourceData,
      pages: sourcePages,
    };

    expect(() =>
      detectPageTokenConflicts({
        sourceData: sourceWebstudioData,
        targetData: { ...targetData, pages },
        pageId: "non-existent-page-id",
      })
    ).toThrow("Page not found");
  });
});
