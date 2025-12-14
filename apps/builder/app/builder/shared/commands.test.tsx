import { describe, expect, test } from "vitest";
import { coreMetas, elementComponent } from "@webstudio-is/sdk";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $, renderData, ws } from "@webstudio-is/template";
import {
  $instances,
  $pages,
  $props,
  $registeredComponentMetas,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { $awareness, selectInstance } from "~/shared/awareness";
import { deleteSelectedInstance, replaceWith } from "./commands";

registerContainers();

const metas = new Map(Object.entries({ ...coreMetas, ...baseMetas }));
$registeredComponentMetas.set(metas);
$pages.set(createDefaultPages({ rootInstanceId: "" }));
$awareness.set({ pageId: "" });

describe("deleteInstance", () => {
  test("delete selected instance and select next one", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="parent">
            <$.Box ws:id="child1"></$.Box>
            <$.Box ws:id="child2"></$.Box>
            <$.Box ws:id="child3"></$.Box>
          </$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["child2", "parent", "body"]);
    deleteSelectedInstance();
    expect($awareness.get()?.instanceSelector).toEqual([
      "child3",
      "parent",
      "body",
    ]);
  });

  test("delete selected instance and select previous one", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="parent">
            <$.Box ws:id="child1"></$.Box>
            <$.Box ws:id="child2"></$.Box>
            <$.Box ws:id="child3"></$.Box>
          </$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["child3", "parent", "body"]);
    deleteSelectedInstance();
    expect($awareness.get()?.instanceSelector).toEqual([
      "child2",
      "parent",
      "body",
    ]);
  });

  test("delete selected instance and select parent one", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="parent">
            <$.Box ws:id="child1"></$.Box>
          </$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["child1", "parent", "body"]);
    deleteSelectedInstance();
    expect($awareness.get()?.instanceSelector).toEqual(["parent", "body"]);
  });
});

describe("replace with", () => {
  test("replace legacy tag with element", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <$.Box tag="article" ws:id="articleId"></$.Box>
      </ws.element>
    );
    $instances.set(instances);
    $props.set(props);
    selectInstance(["articleId", "bodyId"]);
    replaceWith(elementComponent);
    const { instances: newInstances, props: newProps } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="article" ws:id="articleId"></ws.element>
      </ws.element>
    );
    expect({ instances: $instances.get(), props: $props.get() }).toEqual({
      instances: newInstances,
      props: newProps,
    });
  });

  test("migrate legacy properties as well", () => {
    const { instances, props } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <$.Box
          ws:tag="div"
          ws:id="divId"
          className="my-class"
          htmlFor="my-id"
        ></$.Box>
      </ws.element>
    );
    $instances.set(instances);
    $props.set(props);
    selectInstance(["divId", "bodyId"]);
    replaceWith(elementComponent);
    const { instances: newInstances, props: newProps } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element
          ws:tag="div"
          ws:id="divId"
          class="my-class"
          for="my-id"
        ></ws.element>
      </ws.element>
    );
    expect({ instances: $instances.get(), props: $props.get() }).toEqual({
      instances: newInstances,
      props: newProps,
    });
  });

  test("preserve currently specified tag", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Box ws:tag="article" ws:id="articleId"></$.Box>
        </ws.element>
      ).instances
    );
    selectInstance(["articleId", "bodyId"]);
    replaceWith(elementComponent);
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="article" ws:id="articleId"></ws.element>
        </ws.element>
      ).instances
    );
  });

  test("replace with first tag from presets", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Heading ws:id="headingId"></$.Heading>
        </ws.element>
      ).instances
    );
    selectInstance(["headingId", "bodyId"]);
    replaceWith(elementComponent);
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="h1" ws:id="headingId"></ws.element>
        </ws.element>
      ).instances
    );
  });

  test("fallback to div", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <$.Box ws:id="divId"></$.Box>
        </ws.element>
      ).instances
    );
    selectInstance(["divId", "bodyId"]);
    replaceWith(elementComponent);
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="divId"></ws.element>
        </ws.element>
      ).instances
    );
  });
});
