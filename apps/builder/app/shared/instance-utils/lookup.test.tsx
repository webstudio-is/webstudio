import { describe, expect, test } from "vitest";
import type { Instance, Prop, WsComponentMeta } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $, renderData } from "@webstudio-is/template";
import {
  buildInstancePath,
  findAllEditableInstanceSelector,
  findPageAndSelectorByInstanceId,
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

describe("buildInstancePath", () => {
  const createPages = () =>
    createDefaultPages({
      homePageId: "homePageId",
      rootInstanceId: "rootId",
      systemDataSourceId: "systemId",
    });

  test("returns empty array when instance has no selector", () => {
    const pages = createPages();
    const instances = new Map();

    const result = buildInstancePath("nonexistent", pages, instances);
    expect(result).toEqual([]);
  });

  test("returns empty array for root instance (no ancestors)", () => {
    const { instances } = renderData(
      <$.Body ws:id="rootId">
        <$.Box ws:id="boxId"></$.Box>
      </$.Body>
    );
    const pages = createPages();

    const result = buildInstancePath("rootId", pages, instances);
    expect(result).toEqual([]);
  });

  test("builds path for single-level nesting", () => {
    const { instances } = renderData(
      <$.Body ws:id="rootId">
        <$.Box ws:id="boxId"></$.Box>
      </$.Body>
    );
    const pages = createPages();

    const result = buildInstancePath("boxId", pages, instances);
    expect(result).toEqual(["Body"]);
  });

  test("builds path for multi-level nesting", () => {
    const { instances } = renderData(
      <$.Body ws:id="rootId">
        <$.Box ws:id="containerId">
          <$.Heading ws:id="headingId"></$.Heading>
        </$.Box>
      </$.Body>
    );
    const pages = createPages();

    const result = buildInstancePath("headingId", pages, instances);
    expect(result).toEqual(["Body", "Box"]);
  });

  test("builds path for deeply nested instance", () => {
    const { instances } = renderData(
      <$.Body ws:id="rootId">
        <$.Box ws:id="sectionId">
          <$.Box ws:id="articleId">
            <$.Box ws:id="divId">
              <$.Text ws:id="textId"></$.Text>
            </$.Box>
          </$.Box>
        </$.Box>
      </$.Body>
    );
    const pages = createPages();

    const result = buildInstancePath("textId", pages, instances);
    expect(result).toEqual(["Body", "Box", "Box", "Box"]);
  });

  test("handles instances with custom labels", () => {
    const { instances } = renderData(
      <$.Body ws:id="rootId" ws:label="Main Body">
        <$.Box ws:id="navId" ws:label="Navigation">
          <$.Link ws:id="linkId" ws:label="Home Link"></$.Link>
        </$.Box>
      </$.Body>
    );
    const pages = createPages();

    const result = buildInstancePath("linkId", pages, instances);
    expect(result).toEqual(["Main Body", "Navigation"]);
  });
});

describe("findPageAndSelectorByInstanceId", () => {
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

describe("findAllEditableInstanceSelector", () => {
  test("collects editable rich-text descendants", () => {
    const results: string[][] = [];
    findAllEditableInstanceSelector({
      instanceSelector: ["body"],
      instances: new Map([
        [
          "body",
          instance("body", "Body", [{ type: "id", value: "paragraph" }]),
        ],
        ["paragraph", instance("paragraph", "Paragraph")],
      ]),
      props: new Map<string, Prop>(),
      metas: new Map([
        ["Body", meta(["instance"])],
        ["Paragraph", meta(["rich-text"])],
      ]),
      results,
    });

    expect(results).toEqual([["paragraph", "body"]]);
  });
});
