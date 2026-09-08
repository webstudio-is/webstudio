import { expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  createTemplateComponentFixture,
  renderData,
} from "@webstudio-is/template";
import { builderUrl } from "~/shared/router-utils";
import { getDeepLinkedInstanceSelection } from "./instance-link-utils";
import { __testing__ } from "./use-switch-page";

const Body = createTemplateComponentFixture("Body");
const Box = createTemplateComponentFixture("Box");
const Fragment = createTemplateComponentFixture("Fragment");
const Heading = createTemplateComponentFixture("Heading");
const Slot = createTemplateComponentFixture("Slot");

const { shouldNavigateToPageState } = __testing__;

test("preserves an instance deep link until URL state is initialized", () => {
  expect(
    shouldNavigateToPageState({
      isUrlStateInitialized: false,
      isSamePageState: true,
      searchParamsInstanceSelector: ["heading", "box", "body"],
      instanceSelector: undefined,
    })
  ).toBe(false);

  expect(
    shouldNavigateToPageState({
      isUrlStateInitialized: true,
      isSamePageState: true,
      searchParamsInstanceSelector: ["heading", "box", "body"],
      instanceSelector: undefined,
    })
  ).toBe(true);
});

test("updates the URL when a shared instance moves to another slot path", () => {
  expect(
    shouldNavigateToPageState({
      isUrlStateInitialized: true,
      isSamePageState: true,
      searchParamsInstanceSelector: ["box", "fragment", "slot-two", "body"],
      instanceSelector: ["box", "fragment", "slot-one", "body"],
    })
  ).toBe(true);
});

test("resolves a deep-linked instance to its page and full selector", () => {
  const pages = createDefaultPages({
    homePageId: "home-page",
    rootInstanceId: "body",
  });
  const { instances } = renderData(
    <Body ws:id="body">
      <Box ws:id="box">
        <Heading ws:id="heading">Heading</Heading>
      </Box>
    </Body>
  );
  expect(
    getDeepLinkedInstanceSelection({
      instanceSelector: ["heading", "box", "body"],
      canOpenPageTemplates: true,
      pages,
      instances,
    })
  ).toEqual({
    pageId: "home-page",
    instanceSelector: ["heading", "box", "body"],
  });
});

test("restores the selected shared slot occurrence from its full selector", () => {
  const pages = createDefaultPages({
    homePageId: "home-page",
    rootInstanceId: "body",
  });
  const { instances } = renderData(
    <Body ws:id="body">
      <Slot ws:id="slot-one">
        <Fragment ws:id="fragment">
          <Box ws:id="box"></Box>
        </Fragment>
      </Slot>
      <Slot ws:id="slot-two">
        <Fragment ws:id="fragment">
          <Box ws:id="box"></Box>
        </Fragment>
      </Slot>
    </Body>
  );

  const url = new URL(
    builderUrl({
      projectId: "090e6e14-ae50-4b2e-bd22-71733cec05bb",
      origin: "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.wstd.dev",
      pageId: "home-page",
      instanceSelector: ["box", "fragment", "slot-two", "body"],
      authToken: "share-token",
      mode: "content",
    })
  );
  expect(url.origin).toBe(
    "https://p-090e6e14-ae50-4b2e-bd22-71733cec05bb.wstd.dev"
  );
  expect(url.searchParams.get("authToken")).toBe("share-token");
  expect(url.searchParams.get("mode")).toBe("content");
  expect(
    getDeepLinkedInstanceSelection({
      instanceSelector: url.searchParams.get("instance")?.split(","),
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
  const { instances } = renderData(<Body ws:id="body"></Body>);

  expect(
    getDeepLinkedInstanceSelection({
      instanceSelector: ["missing", "body"],
      canOpenPageTemplates: true,
      pages,
      instances,
    })
  ).toBeUndefined();
});
