import { describe, expect, test, vi } from "vitest";
import { $, renderTemplate, renderData } from "@webstudio-is/template";
import { coreMetas } from "@webstudio-is/sdk";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import { findClosestInstanceMatchingFragment } from "./matcher";

const metas = new Map(Object.entries({ ...coreMetas, ...baseMetas }));

describe("find closest instance matching fragment", () => {
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
        metas,
        instances,
        props,
        instanceSelector: ["list", "body"],
        fragment,
      })
    ).toEqual(0);
    expect(
      findClosestInstanceMatchingFragment({
        metas,
        instances,
        props,
        // looks up until list parent is reached
        instanceSelector: ["listitem", "list", "body"],
        fragment,
      })
    ).toEqual(1);
    expect(
      findClosestInstanceMatchingFragment({
        metas,
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
        metas,
        instances,
        props,
        instanceSelector: ["button", "body"],
        fragment,
      })
    ).toEqual(1);
  });

  test("finds button parent with button+span fragment", () => {
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
        metas,
        instances,
        props,
        instanceSelector: ["button", "body"],
        fragment,
      })
    ).toEqual(1);
  });

  test("report first error", () => {
    const onError = vi.fn();
    const { instances, props } = renderData(<$.Body ws:id="body"></$.Body>);
    const fragment = renderTemplate(<$.ListItem ws:id="listitem"></$.ListItem>);
    findClosestInstanceMatchingFragment({
      metas,
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
