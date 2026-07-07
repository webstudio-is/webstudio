import { describe, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $, renderData } from "@webstudio-is/template";
import { buildInstancePath } from "./lookup";

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
