import { describe, expect, test } from "vitest";
import type { Instance, PageTemplate } from "@webstudio-is/sdk";
import { blockComponent, blockTemplateComponent } from "@webstudio-is/sdk";
import { createDefaultPages, findCycles } from "@webstudio-is/project-build";
import {
  applyBuilderPatchPayloadMutable,
  canDeleteInstanceInContentMode,
  getWebstudioData,
  updateInstanceData,
  updateWebstudioData,
} from "./data";
import { registerContainers } from "../sync/sync-stores";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "../sync/data-stores";
import { $selectedPageId } from "../nano-states/pages";
import { $authPermit, $builderMode } from "../nano-states/misc";

const createInstance = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): Instance => {
  return { type: "instance", id, component, children };
};

registerContainers();

describe("canDeleteInstanceInContentMode", () => {
  const instances = new Map([
    ["body", createInstance("body", "Body", [{ type: "id", value: "block" }])],
    [
      "block",
      createInstance("block", blockComponent, [
        { type: "id", value: "child" },
        { type: "id", value: "template" },
      ]),
    ],
    [
      "child",
      createInstance("child", "Box", [{ type: "id", value: "nested" }]),
    ],
    ["nested", createInstance("nested", "Box", [])],
    ["template", createInstance("template", blockTemplateComponent, [])],
  ]);

  test("allows deleting direct content block children", () => {
    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["child", "block", "body"],
        instances,
      })
    ).toBe(true);
  });

  test("protects content block roots, nested descendants, and templates", () => {
    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["block", "body"],
        instances,
      })
    ).toBe(false);
    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["nested", "child", "block", "body"],
        instances,
      })
    ).toBe(false);
    expect(
      canDeleteInstanceInContentMode({
        instanceSelector: ["template", "block", "body"],
        instances,
      })
    ).toBe(false);
  });
});

describe("data store helpers", () => {
  test("getWebstudioData reads all instance-related stores", () => {
    const pages = createDefaultPages({ rootInstanceId: "body" });
    const instances = new Map([["body", createInstance("body", "Body", [])]]);
    $pages.set(pages);
    $instances.set(instances);
    $props.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $assets.set(new Map());

    expect(getWebstudioData()).toMatchObject({
      pages,
      instances,
    });
  });

  test("updateWebstudioData mutates stores through a transaction", () => {
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));
    $instances.set(new Map());
    $props.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $assets.set(new Map());

    updateWebstudioData((data) => {
      data.instances.set("body", createInstance("body", "Body", []));
    });

    expect($instances.get().get("body")).toEqual(
      createInstance("body", "Body", [])
    );
  });

  test("updateInstanceData mutates only instance-related stores", () => {
    const pages = createDefaultPages({ rootInstanceId: "body" });
    const assets = new Map();
    $pages.set(pages);
    $instances.set(new Map());
    $props.set(new Map());
    $breakpoints.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());
    $assets.set(assets);

    updateInstanceData((data) => {
      data.instances.set("body", createInstance("body", "Body", []));
      data.props.set("prop", {
        id: "prop",
        instanceId: "body",
        name: "id",
        type: "string",
        value: "main",
      });
    });

    expect($instances.get().get("body")).toEqual(
      createInstance("body", "Body", [])
    );
    expect($props.get().get("prop")).toMatchObject({
      instanceId: "body",
      value: "main",
    });
    expect($pages.get()).toBe(pages);
    expect($assets.get()).toBe(assets);
  });

  test("applies shared build patch payloads to store data", () => {
    const data = {
      instances: new Map([
        [
          "parent",
          createInstance("parent", "Box", [{ type: "id", value: "child" }]),
        ],
        ["child", createInstance("child", "Box", [])],
      ]),
      props: new Map(),
      styleSourceSelections: new Map(),
      styleSources: new Map(),
      styles: new Map(),
      dataSources: new Map(),
      resources: new Map(),
    };

    applyBuilderPatchPayloadMutable(data, [
      {
        namespace: "instances",
        patches: [
          { op: "remove", path: ["parent", "children", 0] },
          {
            op: "add",
            path: ["parent", "children", 0],
            value: { type: "id", value: "next" },
          },
          {
            op: "add",
            path: ["next"],
            value: createInstance("next", "Box", []),
          },
          { op: "remove", path: ["child"] },
        ],
      },
    ]);

    expect(data.instances.get("parent")?.children).toEqual([
      { type: "id", value: "next" },
    ]);
    expect(data.instances.has("child")).toBe(false);
    expect(data.instances.get("next")).toEqual(
      createInstance("next", "Box", [])
    );
  });

  test("updateWebstudioData skips page templates without build access", () => {
    const pages = createDefaultPages({ rootInstanceId: "body" });
    const template: PageTemplate = {
      id: "template",
      name: "Template",
      title: "Template",
      rootInstanceId: "template-root",
      meta: {},
    };
    pages.pageTemplates = new Map([[template.id, template]]);
    $pages.set(pages);
    $selectedPageId.set(template.id);
    $builderMode.set("design");
    $authPermit.set("view");
    $instances.set(new Map());

    updateWebstudioData((data) => {
      data.instances.set(
        "template-root",
        createInstance("template-root", "Body", [])
      );
    });

    expect($instances.get().has("template-root")).toBe(false);
  });

  test("updateInstanceData skips page templates without build access", () => {
    const pages = createDefaultPages({ rootInstanceId: "body" });
    const template: PageTemplate = {
      id: "template",
      name: "Template",
      title: "Template",
      rootInstanceId: "template-root",
      meta: {},
    };
    pages.pageTemplates = new Map([[template.id, template]]);
    $pages.set(pages);
    $selectedPageId.set(template.id);
    $builderMode.set("design");
    $authPermit.set("view");
    $instances.set(new Map());
    $props.set(new Map());
    $styleSourceSelections.set(new Map());
    $styleSources.set(new Map());
    $styles.set(new Map());
    $dataSources.set(new Map());
    $resources.set(new Map());

    updateInstanceData((data) => {
      data.instances.set(
        "template-root",
        createInstance("template-root", "Body", [])
      );
    });

    expect($instances.get().has("template-root")).toBe(false);
  });

  test("updateWebstudioData repairs cycles created during transaction", () => {
    const pages = createDefaultPages({ rootInstanceId: "body" });
    const instances = new Map([
      [
        "body",
        createInstance("body", "Body", [{ type: "id", value: "parent" }]),
      ],
      [
        "parent",
        createInstance("parent", "Box", [{ type: "id", value: "child" }]),
      ],
      ["child", createInstance("child", "Box", [])],
    ]);
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    $builderMode.set("design");
    $authPermit.set("build");
    $instances.set(instances);

    updateWebstudioData((data) => {
      data.instances.get("child")?.children.push({
        type: "id",
        value: "parent",
      });
    });

    expect(findCycles($instances.get().values())).toEqual([]);
  });
});
