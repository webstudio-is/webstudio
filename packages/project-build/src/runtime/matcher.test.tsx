import { describe, expect, test, vi } from "vitest";
import { $, renderData, renderTemplate } from "@webstudio-is/template";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { findClosestInstanceMatchingFragment } from "./matcher";

describe("findClosestInstanceMatchingFragment", () => {
  test("finds closest list with list item fragment", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.List ws:id="list">
          <$.ListItem ws:id="listitem"></$.ListItem>
        </$.List>
      </$.Body>
    );
    const fragment = renderTemplate(<$.ListItem ws:id="new"></$.ListItem>);
    expect(
      findClosestInstanceMatchingFragment({
        metas: componentMetas,
        instances,
        props,
        instanceSelector: ["list", "body"],
        fragment,
      })
    ).toEqual(0);
    expect(
      findClosestInstanceMatchingFragment({
        metas: componentMetas,
        instances,
        props,
        instanceSelector: ["listitem", "list", "body"],
        fragment,
      })
    ).toEqual(1);
    expect(
      findClosestInstanceMatchingFragment({
        metas: componentMetas,
        instances,
        props,
        instanceSelector: ["body"],
        fragment,
      })
    ).toEqual(-1);
  });

  test("finds button parent with button fragment", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Button ws:id="button"></$.Button>
      </$.Body>
    );
    const fragment = renderTemplate(<$.Button ws:id="new"></$.Button>);
    expect(
      findClosestInstanceMatchingFragment({
        metas: componentMetas,
        instances,
        props,
        instanceSelector: ["button", "body"],
        fragment,
      })
    ).toEqual(1);
  });

  test("finds button parent with button and text fragment", () => {
    const { instances, props } = renderData(
      <$.Body ws:id="body">
        <$.Button ws:id="button"></$.Button>
      </$.Body>
    );
    const fragment = renderTemplate(
      <>
        <$.Button ws:id="new-button"></$.Button>
        <$.Text ws:id="new-text"></$.Text>
      </>
    );
    expect(
      findClosestInstanceMatchingFragment({
        metas: componentMetas,
        instances,
        props,
        instanceSelector: ["button", "body"],
        fragment,
      })
    ).toEqual(1);
  });

  test("reports first placement error", () => {
    const onError = vi.fn();
    const { instances, props } = renderData(<$.Body ws:id="body"></$.Body>);
    const fragment = renderTemplate(<$.ListItem ws:id="listitem"></$.ListItem>);
    findClosestInstanceMatchingFragment({
      metas: componentMetas,
      instances,
      props,
      instanceSelector: ["body"],
      fragment,
      onError,
    });
    expect(onError).toHaveBeenLastCalledWith(
      "Placing <li> element inside a <body> violates HTML spec."
    );
  });
});
