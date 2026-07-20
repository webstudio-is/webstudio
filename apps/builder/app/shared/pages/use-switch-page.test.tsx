import { expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $, renderData } from "@webstudio-is/template";
import { __testing__ } from "./use-switch-page";

const { getDeepLinkedInstanceSelection } = __testing__;

test("resolves a deep-linked instance to its page and full selector", () => {
  const pages = createDefaultPages({
    homePageId: "home-page",
    rootInstanceId: "body",
  });
  const { instances } = renderData(
    <$.Body ws:id="body">
      <$.Box ws:id="box">
        <$.Heading ws:id="heading">Heading</$.Heading>
      </$.Box>
    </$.Body>
  );
  expect(
    getDeepLinkedInstanceSelection({
      instanceId: "heading",
      canOpenPageTemplates: true,
      pages,
      instances,
    })
  ).toEqual({
    pageId: "home-page",
    instanceSelector: ["heading", "box", "body"],
  });
});

test("ignores missing deep-linked instances", () => {
  const pages = createDefaultPages({
    homePageId: "home-page",
    rootInstanceId: "body",
  });
  const { instances } = renderData(<$.Body ws:id="body"></$.Body>);

  expect(
    getDeepLinkedInstanceSelection({
      instanceId: "missing",
      canOpenPageTemplates: true,
      pages,
      instances,
    })
  ).toBeUndefined();
});
