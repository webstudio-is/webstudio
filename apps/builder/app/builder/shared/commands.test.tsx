import { describe, expect, test } from "vitest";
import { coreMetas } from "@webstudio-is/sdk";
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
import {
  deleteSelectedInstance,
  replaceWith,
  unwrap,
  wrapIn,
} from "./commands";
import { elementComponent } from "@webstudio-is/sdk";

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

describe("wrap in", () => {
  test("wrap instance in link", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id="divId"></ws.element>
        </ws.element>
      ).instances
    );
    selectInstance(["divId", "bodyId"]);
    wrapIn(elementComponent, "a");
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="a" ws:id={expect.any(String)}>
            <ws.element ws:tag="div" ws:id="divId"></ws.element>
          </ws.element>
        </ws.element>
      ).instances
    );
  });

  test("wrap image in element", () => {
    $instances.set(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="img" ws:id="imageId"></ws.element>
        </ws.element>
      ).instances
    );
    selectInstance(["imageId", "bodyId"]);
    wrapIn(elementComponent);
    expect($instances.get()).toEqual(
      renderData(
        <ws.element ws:tag="body" ws:id="bodyId">
          <ws.element ws:tag="div" ws:id={expect.any(String)}>
            <ws.element ws:tag="img" ws:id="imageId"></ws.element>
          </ws.element>
        </ws.element>
      ).instances
    );
  });

  test("avoid wrapping text with link in link", () => {
    const { instances } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="p" ws:id="textId">
          <ws.element ws:tag="a" ws:id="linkId"></ws.element>
        </ws.element>
      </ws.element>
    );
    $instances.set(instances);
    selectInstance(["textId", "bodyId"]);
    wrapIn(elementComponent, "a");
    // nothing is changed
    expect($instances.get()).toEqual(instances);
  });

  test("avoid wrapping textual content", () => {
    const { instances } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="div" ws:id="textId">
          <ws.element ws:tag="bold" ws:id="boldId"></ws.element>
        </ws.element>
      </ws.element>
    );
    $instances.set(instances);
    selectInstance(["boldId", "textId", "bodyId"]);
    wrapIn(elementComponent);
    // nothing is changed
    expect($instances.get()).toEqual(instances);
  });

  test("avoid wrapping list item", () => {
    const { instances } = renderData(
      <ws.element ws:tag="body" ws:id="bodyId">
        <ws.element ws:tag="ul" ws:id="listId">
          <ws.element ws:tag="li" ws:id="listItemId"></ws.element>
        </ws.element>
      </ws.element>
    );
    $instances.set(instances);
    selectInstance(["listItemId", "listId", "bodyId"]);
    wrapIn(elementComponent);
    // nothing is changed
    expect($instances.get()).toEqual(instances);
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

describe("unwrap", () => {
  test("unwrap instance", () => {
    $instances.set(
      renderData(
        <$.Body ws:id="body">
          <$.Box ws:id="box">
            <$.Image ws:id="image" />
            <$.Text ws:id="text">text</$.Text>
          </$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "body"]);
    unwrap();
    expect($instances.get()).toEqual(
      renderData(
        <$.Body ws:id="body">
          <$.Image ws:id="image" />
          <$.Text ws:id="text">text</$.Text>
        </$.Body>
      ).instances
    );
  });

  test("avoid unwrapping textual instance", () => {
    const { instances } = renderData(
      <$.Body ws:id="body">
        <$.Text ws:id="text1">text</$.Text>
        <$.Text ws:id="text2">
          <$.Bold ws:id="bold">bold</$.Bold>
        </$.Text>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["text1", "body"]);
    unwrap();
    selectInstance(["text2", "body"]);
    unwrap();
    expect($instances.get()).toEqual(instances);
  });

  test("avoid unwrapping constrained instances", () => {
    const { instances } = renderData(
      <$.Body ws:id="body">
        <$.List ws:id="list">
          <$.ListItem ws:id="listitem"></$.ListItem>
        </$.List>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["list", "body"]);
    unwrap();
    expect($instances.get()).toEqual(instances);
  });
});
