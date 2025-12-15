import { describe, expect, test, beforeEach } from "vitest";
import { coreMetas, elementComponent } from "@webstudio-is/sdk";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as animationMetas from "@webstudio-is/sdk-components-animation/metas";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $, renderData } from "@webstudio-is/template";
import {
  $instances,
  $pages,
  $props,
  $registeredComponentMetas,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync/sync-stores";
import { $awareness, selectInstance } from "~/shared/awareness";
import { __testing__ } from "./wrap-group";

const { canWrapInstance } = __testing__;

registerContainers();

const metas = new Map(
  Object.entries({ ...coreMetas, ...baseMetas, ...animationMetas })
);

beforeEach(() => {
  $registeredComponentMetas.set(metas);
  $pages.set(createDefaultPages({ rootInstanceId: "" }));
  $awareness.set({ pageId: "" });
});

describe("canWrapInstance for components", () => {
  test("should allow wrapping text in a Link", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Text ws:id="text">Hello</$.Text>
        </$.Body>
      ).instances
    );
    selectInstance(["text", "body"]);

    const result = canWrapInstance(
      "text",
      ["text", "body"],
      "body",
      "Link",
      undefined,
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });

  test("should allow wrapping text in a Heading", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Text ws:id="text">Hello</$.Text>
        </$.Body>
      ).instances
    );
    selectInstance(["text", "body"]);

    const result = canWrapInstance(
      "text",
      ["text", "body"],
      "body",
      "Heading",
      undefined,
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });

  test("should allow wrapping box in a Form", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "body"]);

    const result = canWrapInstance(
      "box",
      ["box", "body"],
      "body",
      "Form",
      undefined,
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });

  test("should reject invalid wrapping (text in CodeText)", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "body"]);

    // CodeText only accepts text content, not boxes
    const result = canWrapInstance(
      "box",
      ["box", "body"],
      "body",
      "CodeText",
      undefined,
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(false);
  });
});

describe("canWrapInstance for HTML elements", () => {
  test("should allow wrapping text in a span", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Text ws:id="text">Hello</$.Text>
        </$.Body>
      ).instances
    );
    selectInstance(["text", "body"]);

    const result = canWrapInstance(
      "text",
      ["text", "body"],
      "body",
      elementComponent,
      "span",
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });

  test("should allow wrapping box in a div", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "body"]);

    const result = canWrapInstance(
      "box",
      ["box", "body"],
      "body",
      elementComponent,
      "div",
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });

  test("should allow wrapping box in span (content model allows it)", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "body"]);

    // Note: The content model currently allows this even though
    // it's not valid phrasing content in strict HTML
    const result = canWrapInstance(
      "box",
      ["box", "body"],
      "body",
      elementComponent,
      "span",
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });

  test("should allow wrapping list item in ul", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.ListItem ws:id="li">Item</$.ListItem>
        </$.Body>
      ).instances
    );
    selectInstance(["li", "body"]);

    const result = canWrapInstance(
      "li",
      ["li", "body"],
      "body",
      elementComponent,
      "ul",
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });

  test("should reject wrapping box in ul (ul requires li children)", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "body"]);

    // ul can only contain li elements
    const result = canWrapInstance(
      "box",
      ["box", "body"],
      "body",
      elementComponent,
      "ul",
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(false);
  });
});

describe("canWrapInstance edge cases", () => {
  test("should handle wrapping with Slot", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "body"]);

    const result = canWrapInstance(
      "box",
      ["box", "body"],
      "body",
      "Slot",
      undefined,
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });

  test("should allow wrapping with Collection", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "body"]);

    const result = canWrapInstance(
      "box",
      ["box", "body"],
      "body",
      "ws:collection",
      undefined,
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });

  test("should allow wrapping with AnimateChildren", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "body"]);

    const result = canWrapInstance(
      "box",
      ["box", "body"],
      "body",
      "@webstudio-is/sdk-components-animation:AnimateChildren",
      undefined,
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });

  test("should allow wrapping with AnimateText", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "body"]);

    const result = canWrapInstance(
      "box",
      ["box", "body"],
      "body",
      "@webstudio-is/sdk-components-animation:AnimateText",
      undefined,
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });

  test("should allow wrapping with StaggerAnimation", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "body"]);

    const result = canWrapInstance(
      "box",
      ["box", "body"],
      "body",
      "@webstudio-is/sdk-components-animation:StaggerAnimation",
      undefined,
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });

  test("should allow wrapping with VideoAnimation", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "body"]);

    const result = canWrapInstance(
      "box",
      ["box", "body"],
      "body",
      "@webstudio-is/sdk-components-animation:VideoAnimation",
      undefined,
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });

  test("should handle wrapping multiple elements", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="parent">
            <$.Box ws:id="child1"></$.Box>
            <$.Box ws:id="child2"></$.Box>
          </$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["child1", "parent", "body"]);

    const result = canWrapInstance(
      "child1",
      ["child1", "parent", "body"],
      "parent",
      elementComponent,
      "div",
      $instances.get(),
      $props.get(),
      $registeredComponentMetas.get()
    );
    expect(result).toBe(true);
  });
});
