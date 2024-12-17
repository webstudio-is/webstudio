import { describe, expect, test } from "vitest";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import { createDefaultPages } from "@webstudio-is/project-build";
import { renderJsx, $ } from "@webstudio-is/template";
import {
  $instances,
  $pages,
  $registeredComponentMetas,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { $awareness, selectInstance } from "~/shared/awareness";
import { deleteSelectedInstance, unwrap, wrapIn } from "./commands";

registerContainers();

const metas = new Map(Object.entries(baseMetas));
$registeredComponentMetas.set(metas);
$pages.set(createDefaultPages({ rootInstanceId: "", systemDataSourceId: "" }));
$awareness.set({ pageId: "" });

describe("deleteInstance", () => {
  test("delete selected instance and select next one", () => {
    $instances.set(
      renderJsx(
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
      renderJsx(
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
      renderJsx(
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
      renderJsx(
        <$.Body ws:id="body">
          <$.Box ws:id="box"></$.Box>
        </$.Body>
      ).instances
    );
    selectInstance(["box", "body"]);
    wrapIn("Link");
    expect($instances.get()).toEqual(
      renderJsx(
        <$.Body ws:id="body">
          <$.Link ws:id={expect.any(String)}>
            <$.Box ws:id="box"></$.Box>
          </$.Link>
        </$.Body>
      ).instances
    );
  });

  test("wrap image in box", () => {
    $instances.set(
      renderJsx(
        <$.Body ws:id="body">
          <$.Image ws:id="image" />
        </$.Body>
      ).instances
    );
    selectInstance(["image", "body"]);
    wrapIn("Box");
    expect($instances.get()).toEqual(
      renderJsx(
        <$.Body ws:id="body">
          <$.Box ws:id={expect.any(String)}>
            <$.Image ws:id="image" />
          </$.Box>
        </$.Body>
      ).instances
    );
  });

  test("avoid wrapping text with link in link", () => {
    const { instances } = renderJsx(
      <$.Body ws:id="body">
        <$.Text ws:id="text">
          <$.RichTextLink ws:id="richtextlink"></$.RichTextLink>
        </$.Text>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["text", "body"]);
    wrapIn("Link");
    // nothing is changed
    expect($instances.get()).toEqual(instances);
  });

  test("avoid wrapping textual content", () => {
    const { instances } = renderJsx(
      <$.Body ws:id="body">
        <$.Text ws:id="text">
          <$.Bold ws:id="bold"></$.Bold>
        </$.Text>
      </$.Body>
    );
    $instances.set(instances);
    selectInstance(["bold", "text", "body"]);
    wrapIn("Box");
    // nothing is changed
    expect($instances.get()).toEqual(instances);
  });
});

describe("unwrap", () => {
  test("unwrap instance", () => {
    $instances.set(
      renderJsx(
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
      renderJsx(
        <$.Body ws:id="body">
          <$.Image ws:id="image" />
          <$.Text ws:id="text">text</$.Text>
        </$.Body>
      ).instances
    );
  });

  test("avoid unwrapping textual instance", () => {
    const { instances } = renderJsx(
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
    const { instances } = renderJsx(
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
