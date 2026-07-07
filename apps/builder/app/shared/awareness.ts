import { atom, computed } from "nanostores";
import type { Rect } from "@webstudio-is/design-system";
import type { CollaboratorInfo } from "@webstudio-is/sync-client";
import { $selectedInstanceSelector } from "./nano-states/instances";
import { $user } from "./nano-states/misc";
import { $selectedPageId } from "./nano-states/pages";

const POINTER_FPS_LIMIT = 5;
const POINTER_FRAME_MS = Math.ceil(1000 / POINTER_FPS_LIMIT);

export type Awareness = Pick<
  CollaboratorInfo,
  "name" | "avatarUrl" | "pageId" | "selectedInstanceIds" | "pointerPosition"
>;

export const $pointerPosition = atom<CollaboratorInfo["pointerPosition"]>();

const getUserAwareness = (user: ReturnType<typeof $user.get>) => {
  if (user === undefined) {
    return {};
  }
  const name = user.username?.trim() || user.email?.trim();
  const avatarUrl = user.image || undefined;
  return {
    ...(name === undefined || name.length === 0 ? {} : { name }),
    ...(avatarUrl === undefined || avatarUrl.length === 0 ? {} : { avatarUrl }),
  };
};

const $computedAwareness = computed(
  [$pointerPosition, $selectedPageId, $selectedInstanceSelector, $user],
  (pointerPosition, pageId, selectedInstanceIds, user): Awareness => ({
    ...getUserAwareness(user),
    pageId,
    selectedInstanceIds,
    pointerPosition,
  })
);

export const $awareness = atom<Awareness>($computedAwareness.get());

let scheduledAwareness: Awareness | undefined;
let isAwarenessFlushScheduled = false;

$computedAwareness.listen((awareness) => {
  scheduledAwareness = awareness;
  if (isAwarenessFlushScheduled) {
    return;
  }
  isAwarenessFlushScheduled = true;
  queueMicrotask(() => {
    isAwarenessFlushScheduled = false;
    if (scheduledAwareness !== undefined) {
      $awareness.set(scheduledAwareness);
    }
  });
});

export const startPointerTracking = () => {
  const sourceWindow = window;

  const clampRatio = (value: number) => {
    return Math.min(1, Math.max(0, value));
  };

  const getNormalizationRect = (): Rect => {
    const frameElement = sourceWindow.frameElement;
    if (frameElement !== null) {
      const frameRect = frameElement.getBoundingClientRect();
      return {
        left: frameRect.left,
        top: frameRect.top,
        width: frameRect.width > 0 ? frameRect.width : sourceWindow.innerWidth,
        height:
          frameRect.height > 0 ? frameRect.height : sourceWindow.innerHeight,
      };
    }
    return {
      left: 0,
      top: 0,
      width: sourceWindow.innerWidth,
      height: sourceWindow.innerHeight,
    };
  };

  const toViewportPosition = (
    x: number,
    y: number
  ): { x: number; y: number } => {
    const frameElement = sourceWindow.frameElement;
    if (frameElement === null) {
      return { x, y };
    }

    // When running inside the canvas iframe, project pointer coordinates into
    // the parent viewport so remote cursors align with builder overlays.
    const frameRect = frameElement.getBoundingClientRect();
    const frameWidth =
      typeof frameRect.width === "number" && Number.isFinite(frameRect.width)
        ? frameRect.width
        : sourceWindow.innerWidth;
    const frameHeight =
      typeof frameRect.height === "number" && Number.isFinite(frameRect.height)
        ? frameRect.height
        : sourceWindow.innerHeight;
    const scaleX =
      sourceWindow.innerWidth === 0 ? 1 : frameWidth / sourceWindow.innerWidth;
    const scaleY =
      sourceWindow.innerHeight === 0
        ? 1
        : frameHeight / sourceWindow.innerHeight;
    return {
      x: frameRect.left + x * scaleX,
      y: frameRect.top + y * scaleY,
    };
  };

  let latestPointer: CollaboratorInfo["pointerPosition"];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastFlushAt = 0;

  const flush = () => {
    timer = undefined;
    if (latestPointer === undefined) {
      return;
    }

    const prev = $pointerPosition.get();
    if (
      prev?.x === latestPointer.x &&
      prev?.y === latestPointer.y &&
      prev?.xRatio === latestPointer.xRatio &&
      prev?.yRatio === latestPointer.yRatio
    ) {
      return;
    }

    lastFlushAt = Date.now();
    $pointerPosition.set(latestPointer);
  };

  const scheduleFlush = () => {
    if (timer !== undefined) {
      return;
    }
    const elapsed = Date.now() - lastFlushAt;
    const delay = Math.max(0, POINTER_FRAME_MS - elapsed);
    timer = setTimeout(flush, delay);
  };

  const onPointerMove = (event: PointerEvent) => {
    const viewportPosition = toViewportPosition(event.clientX, event.clientY);
    const normalizationRect = getNormalizationRect();
    latestPointer = {
      ...viewportPosition,
      xRatio: clampRatio(
        (viewportPosition.x - normalizationRect.left) / normalizationRect.width
      ),
      yRatio: clampRatio(
        (viewportPosition.y - normalizationRect.top) / normalizationRect.height
      ),
    };
    scheduleFlush();
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });

  return () => {
    window.removeEventListener("pointermove", onPointerMove);
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
};

export const __testing__ = { $pointerPosition, getUserAwareness };
