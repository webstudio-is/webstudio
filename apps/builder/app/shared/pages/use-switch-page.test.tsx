import { expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $, renderData } from "@webstudio-is/template";
import { __testing__ } from "./use-switch-page";

const {
  getDeepLinkedInstanceSelection,
  shouldInitializePageState,
  shouldNavigateToPageState,
} = __testing__;

test("waits for complete Builder data before initializing URL state", () => {
  expect(
    shouldInitializePageState({
      isDataLoaded: false,
      isUrlStateInitialized: false,
    })
  ).toBe(false);

  expect(
    shouldInitializePageState({
      isDataLoaded: true,
      isUrlStateInitialized: false,
    })
  ).toBe(true);
});

test("preserves an instance deep link until URL state is initialized", () => {
  expect(
    shouldNavigateToPageState({
      isUrlStateInitialized: false,
      isSamePageState: true,
      searchParamsInstanceId: "heading",
      instanceId: undefined,
    })
  ).toBe(false);

  expect(
    shouldNavigateToPageState({
      isUrlStateInitialized: true,
      isSamePageState: true,
      searchParamsInstanceId: "heading",
      instanceId: undefined,
    })
  ).toBe(true);
});

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

test("resolves shared slot content through a deterministic slot instance", () => {
  const pages = createDefaultPages({
    homePageId: "home-page",
    rootInstanceId: "body",
  });
  const { instances } = renderData(
    <$.Body ws:id="body">
      <$.Slot ws:id="slot-one">
        <$.Fragment ws:id="fragment">
          <$.Box ws:id="box"></$.Box>
        </$.Fragment>
      </$.Slot>
      <$.Slot ws:id="slot-two">
        <$.Fragment ws:id="fragment">
          <$.Box ws:id="box"></$.Box>
        </$.Fragment>
      </$.Slot>
    </$.Body>
  );

  expect(
    getDeepLinkedInstanceSelection({
      instanceId: "box",
      canOpenPageTemplates: true,
      pages,
      instances,
    })
  ).toEqual({
    pageId: "home-page",
    instanceSelector: ["box", "fragment", "slot-two", "body"],
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
