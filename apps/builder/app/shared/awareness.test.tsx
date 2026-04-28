import { afterEach, expect, test, vi } from "vitest";
import { $awareness, __testing__, startPointerTracking } from "./awareness";

const { $pointerPosition, getUserAwareness } = __testing__;
import { findPageAndSelectorByInstanceId } from "./instance-utils";
import { $selectedPageId } from "./nano-states/pages";
import { $user } from "./nano-states/misc";
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

afterEach(async () => {
  vi.useRealTimers();
  $selectedPageId.set(undefined);
  $pointerPosition.set(undefined);
  $user.set(undefined);
  await Promise.resolve();
});

test("user awareness uses username and avatar", async () => {
  const user = {
    username: " Ada ",
    email: "ada@example.com",
    image: "https://example.com/avatar.png",
  } as NonNullable<Parameters<typeof $user.set>[0]>;

  expect(getUserAwareness(user)).toEqual({
    name: "Ada",
    avatarUrl: "https://example.com/avatar.png",
  });
});

test("user awareness falls back to email", async () => {
  const user = {
    username: "",
    email: "ada@example.com",
    image: "",
  } as NonNullable<Parameters<typeof $user.set>[0]>;

  expect(getUserAwareness(user)).toEqual({
    name: "ada@example.com",
  });
});

test("awareness includes user identity", async () => {
  const listener = vi.fn();
  const unsubscribe = $awareness.listen(listener);
  const user = {
    username: "Ada",
    email: "ada@example.com",
    image: "https://example.com/avatar.png",
  } as NonNullable<Parameters<typeof $user.set>[0]>;

  await Promise.resolve();
  listener.mockClear();

  $user.set(user);
  await Promise.resolve();

  expect(listener.mock.calls[0]?.[0]).toEqual({
    avatarUrl: "https://example.com/avatar.png",
    name: "Ada",
    pageId: undefined,
    pointerPosition: undefined,
    selectedInstanceIds: undefined,
  });

  unsubscribe();
});

test("awareness updates are coalesced into one microtask", async () => {
  const listener = vi.fn();
  const unsubscribe = $awareness.listen(listener);

  await Promise.resolve();
  listener.mockClear();

  $pointerPosition.set({ x: 1, y: 2, xRatio: 0.1, yRatio: 0.2 });
  $pointerPosition.set({ x: 3, y: 4, xRatio: 0.3, yRatio: 0.4 });

  expect(listener).not.toHaveBeenCalled();
  await Promise.resolve();

  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0]?.[0]).toEqual({
    pageId: undefined,
    pointerPosition: { x: 3, y: 4, xRatio: 0.3, yRatio: 0.4 },
    selectedInstanceIds: undefined,
  });

  unsubscribe();
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
