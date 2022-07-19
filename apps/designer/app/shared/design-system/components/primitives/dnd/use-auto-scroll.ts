import { useRef, type MutableRefObject } from "react";

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

  const distanceToSpeed = (distance: number) => {
    // between 0 and 1
    const urgency = Math.min(distance, thresholdSafe) / thresholdSafe;

    // speed in pixels second
    const speed = urgency * (maxSpeed - minSpeed);

    // speed in pixels per frame
    return (speed * FRAME_PERIOD) / 1000;
  };

  if (pointerPosition < startAdjusted) {
    return -1 * distanceToSpeed(startAdjusted - pointerPosition);
  }

  if (pointerPosition > endAdjusted) {
    return distanceToSpeed(pointerPosition - endAdjusted);
  }

  return 0;
};

export const useAutoScroll = ({
  target,
  edgeDistanceThreshold = 100,
  minSpeed = 1,
  maxSpeed = 30,
}: {
  target: MutableRefObject<HTMLElement | null>;
  edgeDistanceThreshold?: number;

  // min/max speed of the scroll animation in pixels per second
  minSpeed?: number;
  maxSpeed?: number;
}): {
  handleMove: (pointerCoordinate: { x: number; y: number }) => void;
  setEnabled: (enabled: boolean) => void;
} => {
  const state = useRef({
    enabled: false,
    prevTimestamp: 0,
    speedX: 0,
    speedY: 0,
    stepScheduled: false,
  });

  const step = (timestamp: number) => {
    state.current.stepScheduled = false;

    if (
      !state.current.enabled ||
      target.current === null ||
      (Math.round(state.current.speedX * FRAME_PERIOD) === 0 &&
        Math.round(state.current.speedY * FRAME_PERIOD) === 0)
    ) {
      return;
    }

    const elapsed = timestamp - state.current.prevTimestamp;

    if (elapsed < FRAME_PERIOD) {
      scheduleStep();
      return;
    }

    state.current.prevTimestamp = timestamp;

    target.current.scrollBy(
      elapsed * state.current.speedX,
      elapsed * state.current.speedY
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
      if (!state.current.enabled || target.current === null) {
        return;
      }

      const rect = target.current.getBoundingClientRect();

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
  };
};
