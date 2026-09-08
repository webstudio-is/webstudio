import { afterEach, expect, test } from "vitest";
import { cleanStores } from "nanostores";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  createTemplateComponentFixture,
  renderData,
} from "@webstudio-is/template";
import { $authToken, $builderMode } from "~/shared/nano-states";
import { $instances, $pages, $project } from "~/shared/sync/data-stores";
import { getInstanceLink } from "./instance-link";
import { getDeepLinkedInstanceSelection } from "./instance-link-utils";
import { __testing__ } from "./use-switch-page";

afterEach(() => {
  cleanStores($authToken, $builderMode, $instances, $pages, $project);
});

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

  $pages.set(pages);
  $instances.set(instances);
  $project.set({ id: "090e6e14-ae50-4b2e-bd22-71733cec05bb" } as Project);
  $authToken.set("share-token");
  $builderMode.set("content");
  const link = getInstanceLink(["box", "fragment", "slot-two", "body"]);
  expect(link).toBeDefined();
  const url = new URL(link!);
  expect(url.hostname).toContain("p-090e6e14-ae50-4b2e-bd22-71733cec05bb");
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
