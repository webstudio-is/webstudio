import { useRef } from "react";

// Time between frames of scroll animation in milliseconds
const FRAME_PERIOD = 30;

const getSpeed = (
  pointerPosition: number,
  containerStart: number,
  containerEnd: number,
  edgeDistanceThreshold: number,
  minSpeed: number,
  maxSpeed: number
) => {
  const thresholdSafe = Math.min(
    (containerEnd - containerStart) / 2,
    edgeDistanceThreshold
  );

  const startAdjusted = containerStart + thresholdSafe;
  const endAdjusted = containerEnd - thresholdSafe;

  const distanceFromEdgeToSpeed = (distance: number) => {
    // between 0 and 1
    const normalized = Math.min(distance, thresholdSafe) / thresholdSafe;

    // speed in pixels per second
    return minSpeed + normalized * (maxSpeed - minSpeed);
  };

  if (pointerPosition < startAdjusted) {
    return -1 * distanceFromEdgeToSpeed(startAdjusted - pointerPosition);
  }

  if (pointerPosition > endAdjusted) {
    return distanceFromEdgeToSpeed(pointerPosition - endAdjusted);
  }

  return 0;
};

export type UseAutoScrollProps = {
  edgeDistanceThreshold?: number;

  // If set to true entire document will be scrolled.
  // No need to set targetRef in this case.
  fullScreen?: boolean;

  // min/max speed of the scroll animation in pixels per second
  minSpeed?: number;
  maxSpeed?: number;
};

export type UseAutoScrollHandlers = {
  handleMove: (pointerCoordinate: { x: number; y: number }) => void;
  setEnabled: (enabled: boolean) => void;
  targetRef: (element: HTMLElement | null) => void;
};

export const useAutoScroll = ({
  edgeDistanceThreshold = 100,
  minSpeed = 1,
  maxSpeed = 500,
  fullScreen = false,
}: UseAutoScrollProps = {}): UseAutoScrollHandlers => {
  const state = useRef({
    target: null as HTMLElement | null,
    enabled: false,
    prevTimestamp: 0,
    speedX: 0,
    speedY: 0,
    stepScheduled: false,
  });

  const getViewportRect = () => {
    if (fullScreen) {
      return {
        top: 0,
        left: 0,
        bottom: window.innerHeight,
        right: window.innerWidth,
      };
    }

    if (state.current.target === null) {
      return;
    }

    return state.current.target.getBoundingClientRect();
  };

  const scrollBy = (x: number, y: number) => {
    if (fullScreen) {
      window.scrollBy(x, y);
    }

    if (state.current.target === null) {
      return;
    }

    state.current.target.scrollBy(x, y);
  };

  const step = (timestamp: number) => {
    state.current.stepScheduled = false;

    if (
      !state.current.enabled ||
      (Math.round((state.current.speedX / 1000) * FRAME_PERIOD) === 0 &&
        Math.round((state.current.speedY / 1000) * FRAME_PERIOD) === 0)
    ) {
      return;
    }

    const elapsed = timestamp - state.current.prevTimestamp;

    // to avoid a big jump when auto-scroll becomes enabled
    if (elapsed > FRAME_PERIOD * 100) {
      state.current.prevTimestamp = timestamp;
      scheduleStep();
      return;
    }

    if (elapsed < FRAME_PERIOD) {
      scheduleStep();
      return;
    }

    state.current.prevTimestamp = timestamp;

    scrollBy(
      (state.current.speedX / 1000) * elapsed,
      (state.current.speedY / 1000) * elapsed
    );

    scheduleStep();
  };

  const scheduleStep = () => {
    if (!state.current.stepScheduled) {
      state.current.stepScheduled = true;
      window.requestAnimationFrame(step);
    }
  };

  return {
    handleMove({ x, y }) {
      if (!state.current.enabled) {
        return;
      }

      const rect = getViewportRect();
      if (rect === undefined) {
        return;
      }

      state.current.speedY = getSpeed(
        y,
        rect.top,
        rect.bottom,
        edgeDistanceThreshold,
        minSpeed,
        maxSpeed
      );

      state.current.speedX = getSpeed(
        x,
        rect.left,
        rect.right,
        edgeDistanceThreshold,
        minSpeed,
        maxSpeed
      );

      scheduleStep();
    },
    setEnabled(newEnabled) {
      state.current.enabled = newEnabled;
      scheduleStep();
    },
    targetRef: (element) => {
      state.current.target = element;
    },
  };
};
