import { afterEach, expect, test, vi } from "vitest";
import { __testing__, startPointerTracking } from "./awareness";

const { $pointerPosition } = __testing__;
import { findPageAndSelectorByInstanceId } from "./instance-utils";
import { $selectedPageId } from "./nano-states/pages";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $, renderData } from "@webstudio-is/template";

test("find awareness by instance", () => {
  const pages = createDefaultPages({
    homePageId: "homePageId",
    rootInstanceId: "bodyId",
  });
  const { instances } = renderData(
    <$.Body ws:id="bodyId">
      <$.Box ws:id="boxId">
        <$.Text ws:id="textId"></$.Text>
      </$.Box>
    </$.Body>
  );
  expect(findPageAndSelectorByInstanceId(pages, instances, "textId")).toEqual({
    pageId: "homePageId",
    instanceSelector: ["textId", "boxId", "bodyId"],
  });
});

test("find awareness by instance inside of slot", () => {
  const pages = createDefaultPages({
    homePageId: "homePageId",
    rootInstanceId: "bodyId",
  });
  const { instances } = renderData(
    <$.Body ws:id="bodyId">
      <$.Slot ws:id="slotOneId">
        <$.Fragment ws:id="fragmentId">
          <$.Box ws:id="boxId"></$.Box>
        </$.Fragment>
      </$.Slot>
      <$.Slot ws:id="slotTwoId">
        <$.Fragment ws:id="fragmentId">
          <$.Box ws:id="boxId"></$.Box>
        </$.Fragment>
      </$.Slot>
    </$.Body>
  );
  expect(findPageAndSelectorByInstanceId(pages, instances, "boxId")).toEqual({
    pageId: "homePageId",
    instanceSelector: ["boxId", "fragmentId", "slotTwoId", "bodyId"],
  });
});

afterEach(() => {
  vi.useRealTimers();
  $selectedPageId.set(undefined);
  $pointerPosition.set(undefined);
});

test("pointer tracking is throttled to 8fps and keeps latest position", () => {
  vi.useFakeTimers();
  $selectedPageId.set("homePageId");

  const stop = startPointerTracking();

  window.dispatchEvent(
    new MouseEvent("pointermove", { clientX: 10, clientY: 20 })
  );
  window.dispatchEvent(
    new MouseEvent("pointermove", { clientX: 11, clientY: 21 })
  );
  window.dispatchEvent(
    new MouseEvent("pointermove", { clientX: 12, clientY: 22 })
  );

  expect($pointerPosition.get()).toBeUndefined();

  vi.advanceTimersByTime(125);

  expect($pointerPosition.get()).toMatchObject({ x: 12, y: 22 });

  stop();
});

test("pointer tracking maps iframe coordinates to parent viewport", () => {
  vi.useFakeTimers();
  $selectedPageId.set("homePageId");

  const originalFrameElement = window.frameElement;
  Object.defineProperty(window, "frameElement", {
    configurable: true,
    value: {
      getBoundingClientRect: () => ({
        left: 100,
        top: 200,
      }),
    },
  });

  const stop = startPointerTracking();

  window.dispatchEvent(
    new MouseEvent("pointermove", { clientX: 10, clientY: 20 })
  );
  vi.advanceTimersByTime(125);

  expect($pointerPosition.get()).toMatchObject({ x: 110, y: 220 });

  stop();
  Object.defineProperty(window, "frameElement", {
    configurable: true,
    value: originalFrameElement,
  });
});

test("pointer tracking maps iframe coordinates with canvas scale", () => {
  vi.useFakeTimers();
  $selectedPageId.set("homePageId");

  const originalFrameElement = window.frameElement;
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1000,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 800,
  });

  const originalParent = window.parent;
  Object.defineProperty(window, "parent", {
    configurable: true,
    value: {
      innerWidth: 1200,
      innerHeight: 900,
    },
  });

  Object.defineProperty(window, "frameElement", {
    configurable: true,
    value: {
      getBoundingClientRect: () => ({
        left: 100,
        top: 200,
        width: 500,
        height: 400,
      }),
    },
  });

  const stop = startPointerTracking();

  window.dispatchEvent(
    new MouseEvent("pointermove", { clientX: 400, clientY: 200 })
  );
  vi.advanceTimersByTime(125);

  // frame is rendered at 0.5 scale => 100 + 400*0.5, 200 + 200*0.5
  expect($pointerPosition.get()).toEqual({
    x: 300,
    y: 300,
    xRatio: 0.4,
    yRatio: 0.25,
  });

  stop();
  Object.defineProperty(window, "frameElement", {
    configurable: true,
    value: originalFrameElement,
  });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: originalInnerWidth,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: originalInnerHeight,
  });
  Object.defineProperty(window, "parent", {
    configurable: true,
    value: originalParent,
  });
});
