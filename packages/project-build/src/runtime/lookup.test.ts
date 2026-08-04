import { describe, expect, test } from "vitest";
import type { Instance, Prop, WsComponentMeta } from "@webstudio-is/sdk";
import { createDefaultPages } from "../shared/pages-utils";
import {
  findAllNavigableTextInstanceSelectors,
  findClosestTextEditorTarget,
  findPageAndSelectorByInstanceId,
  findTextEditorTarget,
  getInstancePath,
} from "./lookup";

const instance = (
  id: string,
  component: string,
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component,
  children,
});

const meta = (
  children: NonNullable<WsComponentMeta["contentModel"]>["children"]
): WsComponentMeta =>
  ({
    label: "",
    Icon: () => null,
    contentModel: { category: "instance", children },
  }) as WsComponentMeta;

describe("getInstancePath", () => {
  test("materializes selector items from leaf to root", () => {
    const instances = new Map([
      ["root", instance("root", "Body")],
      ["box", instance("box", "Box")],
    ]);

    expect(getInstancePath(["box", "root"], instances)).toEqual([
      {
        instance: instances.get("box"),
        instanceSelector: ["box", "root"],
      },
      {
        instance: instances.get("root"),
        instanceSelector: ["root"],
      },
    ]);
  });

  test("uses fallback instance maps", () => {
    const instances = new Map([["root", instance("root", "Body")]]);
    const virtualInstances = new Map([
      ["virtual", instance("virtual", "Root")],
    ]);

    expect(
      getInstancePath(["virtual", "root"], instances, virtualInstances)
    ).toEqual([
      {
        instance: virtualInstances.get("virtual"),
        instanceSelector: ["virtual", "root"],
      },
      {
        instance: instances.get("root"),
        instanceSelector: ["root"],
      },
    ]);
  });

  test("returns undefined when selector has no matching instances", () => {
    expect(getInstancePath(["missing"], new Map())).toBeUndefined();
  });
});

describe("findPageAndSelectorByInstanceId", () => {
  test("supports legacy instances without a children field", () => {
    const pages = createDefaultPages({
      homePageId: "homePageId",
      rootInstanceId: "root",
    });
    const legacyRoot = {
      type: "instance",
      id: "root",
      component: "Body",
    } as Instance;

    expect(
      findPageAndSelectorByInstanceId(
        pages,
        new Map([[legacyRoot.id, legacyRoot]]),
        legacyRoot.id
      )
    ).toEqual({
      pageId: "homePageId",
      instanceSelector: [legacyRoot.id],
    });
  });

  test("returns page id and selector for instances in nested pages", () => {
    const pages = createDefaultPages({
      homePageId: "homePageId",
      rootInstanceId: "homeRoot",
    });
    pages.pages.set("nestedPageId", {
      id: "nestedPageId",
      name: "Nested",
      path: "/nested",
      rootInstanceId: "nestedRoot",
      title: "",
      meta: {},
    });
    const instances = new Map([
      [
        "homeRoot",
        instance("homeRoot", "Body", [{ type: "id", value: "homeChild" }]),
      ],
      ["homeChild", instance("homeChild", "Box")],
      [
        "nestedRoot",
        instance("nestedRoot", "Body", [{ type: "id", value: "nestedChild" }]),
      ],
      ["nestedChild", instance("nestedChild", "Box")],
    ]);

    expect(
      findPageAndSelectorByInstanceId(pages, instances, "nestedChild")
    ).toEqual({
      pageId: "nestedPageId",
      instanceSelector: ["nestedChild", "nestedRoot"],
    });
  });

  test("falls back to home page when selector root is not a page root", () => {
    const pages = createDefaultPages({
      homePageId: "homePageId",
      rootInstanceId: "homeRoot",
    });
    const instances = new Map([
      ["orphanRoot", instance("orphanRoot", "Body")],
      [
        "orphanChild",
        instance("orphanChild", "Box", [{ type: "id", value: "target" }]),
      ],
      ["target", instance("target", "Box")],
    ]);

    expect(findPageAndSelectorByInstanceId(pages, instances, "target")).toEqual(
      {
        pageId: "homePageId",
        instanceSelector: ["target", "orphanChild"],
      }
    );
  });

  test("uses the last matching parent for shared slot content paths", () => {
    const pages = createDefaultPages({
      homePageId: "homePageId",
      rootInstanceId: "body",
    });
    const instances = new Map([
      [
        "body",
        instance("body", "Body", [
          { type: "id", value: "slot1" },
          { type: "id", value: "slot2" },
        ]),
      ],
      ["slot1", instance("slot1", "Slot", [{ type: "id", value: "fragment" }])],
      ["slot2", instance("slot2", "Slot", [{ type: "id", value: "fragment" }])],
      [
        "fragment",
        instance("fragment", "Fragment", [{ type: "id", value: "box" }]),
      ],
      ["box", instance("box", "Box")],
    ]);

    expect(findPageAndSelectorByInstanceId(pages, instances, "box")).toEqual({
      pageId: "homePageId",
      instanceSelector: ["box", "fragment", "slot2", "body"],
    });
  });
});

describe("findClosestTextEditorTarget", () => {
  test("excludes a directly targeted expression from the canvas editor", () => {
    const instances = new Map([
      [
        "bound-text",
        instance("bound-text", "Span", [
          { type: "expression", value: "value" },
        ]),
      ],
    ]);
    const input = {
      instanceSelector: ["bound-text"],
      instances,
      props: new Map<string, Prop>(),
      metas: new Map([["Span", meta(["rich-text"])]]),
    };

    expect(findClosestTextEditorTarget(input)).toBeUndefined();
    expect(findTextEditorTarget(input)).toBeUndefined();
  });
});

describe("findAllNavigableTextInstanceSelectors", () => {
  test("excludes single expressions from navigable targets", () => {
    const results = findAllNavigableTextInstanceSelectors({
      instanceSelector: ["bound-text"],
      instances: new Map([
        [
          "bound-text",
          instance("bound-text", "Span", [
            { type: "expression", value: "value" },
          ]),
        ],
      ]),
      props: new Map(),
      metas: new Map([["Span", meta(["rich-text"])]]),
    });

    expect(results).toEqual([]);
  });

  test("collects editable rich-text descendants", () => {
    const instances = new Map([
      ["body", instance("body", "Body", [{ type: "id", value: "paragraph" }])],
      ["paragraph", instance("paragraph", "Paragraph")],
    ]);
    const props = new Map<string, Prop>();
    const metas = new Map([
      ["Body", meta(["instance"])],
      ["Paragraph", meta(["rich-text"])],
    ]);
    const results = findAllNavigableTextInstanceSelectors({
      instanceSelector: ["body"],
      instances,
      props,
      metas,
    });

    expect(results).toEqual([["paragraph", "body"]]);
    expect(
      findTextEditorTarget({
        instanceSelector: ["body"],
        instances,
        props,
        metas,
      })
    ).toEqual(["paragraph", "body"]);
  });

  test("finds literal descendants within a rich-text tree containing expressions", () => {
    const instances = new Map([
      [
        "paragraph",
        instance("paragraph", "Paragraph", [
          { type: "text", value: "Published " },
          { type: "id", value: "separator" },
          { type: "id", value: "reading-time" },
        ]),
      ],
      [
        "separator",
        instance("separator", "Span", [{ type: "text", value: " · " }]),
      ],
      [
        "reading-time",
        instance("reading-time", "Span", [
          { type: "expression", value: 'readTime ?? ""' },
        ]),
      ],
    ]);
    const props = new Map<string, Prop>();
    const metas = new Map([
      ["Paragraph", meta(["rich-text"])],
      ["Span", meta(["rich-text"])],
    ]);
    const results = findAllNavigableTextInstanceSelectors({
      instanceSelector: ["paragraph"],
      instances,
      props,
      metas,
    });

    expect(results).toEqual([["separator", "paragraph"]]);
    expect(
      findClosestTextEditorTarget({
        instanceSelector: ["separator", "paragraph"],
        instances,
        props,
        metas,
      })
    ).toEqual(["separator", "paragraph"]);
    expect(
      findTextEditorTarget({
        instanceSelector: ["paragraph"],
        instances,
        props,
        metas,
      })
    ).toEqual(["separator", "paragraph"]);
    expect(
      findClosestTextEditorTarget({
        instanceSelector: ["reading-time", "paragraph"],
        instances,
        props,
        metas,
      })
    ).toBeUndefined();
  });
});
